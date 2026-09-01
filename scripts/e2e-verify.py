#!/usr/bin/env python3
"""End-to-end verification of the SIH26089 dispatch journey.

Run against a live backend + seeded database:

    (cd backend && npm run dev)          # port 4000
    python3 scripts/e2e-verify.py

Covers the whole graded path: a customer books a SERVICE (never a worker),
concurrent acceptance resolves to exactly one assignment, the OTP-gated
lifecycle runs to completion, and the Part F wage split is exact. Asserts
against the database directly wherever the backend must be the source of
truth, not just against API responses.

Written in Python rather than shell deliberately: the first version was a
shell script, and nested quoting silently stripped the braces from JSON
bodies, producing six failures that looked exactly like backend 500s.
"""
import json
import subprocess
import sys
import urllib.request
import urllib.error
from concurrent.futures import ThreadPoolExecutor

API = "http://127.0.0.1:4000/api"
passed, failed = 0, 0


def req(method, path, token=None, body=None):
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(API + path, data=data, method=method)
    r.add_header("Content-Type", "application/json")
    if token:
        r.add_header("Authorization", "Bearer " + token)
    try:
        with urllib.request.urlopen(r) as resp:
            raw = resp.read().decode()
            return resp.status, (json.loads(raw) if raw else None)
    except urllib.error.HTTPError as e:
        raw = e.read().decode()
        try:
            return e.code, json.loads(raw)
        except Exception:
            return e.code, raw


def login(phone):
    req("POST", "/auth/otp/request", body={"phone": phone})
    _, d = req("POST", "/auth/otp/verify", body={"phone": phone, "otp": "0000"})
    return d["accessToken"]


def sql(q):
    out = subprocess.run(
        ["docker", "exec", "sih26089-postgres", "psql", "-U", "postgres",
         "-d", "sih26089", "-t", "-c", q],
        capture_output=True, text=True)
    return out.stdout.strip()


def check(label, got, want):
    global passed, failed
    if got == want:
        print(f"  PASS  {label}  ({got})"); passed += 1
    else:
        print(f"  FAIL  {label}  expected {want!r}, got {got!r}"); failed += 1


print("=== 1. Customer books a SERVICE, never a worker ===")
ct = login("9000000201")
_, services = req("GET", "/services?lat=18.5204&lng=73.8567", ct)
svc = next(s for s in services if s["category"] == "technician")

status, b = req("POST", "/bookings", ct, {
    "serviceId": svc["id"], "scheduledAt": "2026-09-05T10:00:00.000Z",
    "latitude": 18.5204, "longitude": 73.8567, "servicePincode": "411038",
    "serviceAddressLine": "E2E dispatch test", "instructions": "Ring twice",
})
check("booking created", status, 201)
check("no worker chosen by customer", b["workerId"], None)
check("status REQUESTED", b["status"], "REQUESTED")
check("service address captured", b["serviceAddressLine"], "E2E dispatch test")
check("instructions captured", b["instructions"], "Ring twice")
bid = b["id"]
print(f"      broadcast to {b['eligibleWorkerCount']} eligible workers")

print("=== 2. Concurrent acceptance: 3 workers x 3 calls, simultaneous ===")
tokens = [login(p) for p in ("9000000121", "9000000122", "9000000123")]
with ThreadPoolExecutor(max_workers=9) as ex:
    codes = [f.result()[0] for f in
             [ex.submit(req, "POST", f"/bookings/{bid}/accept", t)
              for t in tokens for _ in range(3)]]
check("exactly one acceptance succeeds", codes.count(200), 1)
check("every other call rejected 409", codes.count(409), 8)
check("DB has exactly one assigned worker",
      sql(f"select count(*) from \"Booking\" where id='{bid}' and \"workerId\" is not null;"), "1")
check("DB status is ASSIGNED", sql(f"select status from \"Booking\" where id='{bid}';"), "ASSIGNED")

wphone = sql(f"""select u.phone from "Booking" b
  join "Worker" w on w.id=b."workerId" join "User" u on u.id=w."userId" where b.id='{bid}';""")
print(f"      winner: {wphone}")
wt = login(wphone)
check("winner marked BUSY",
      sql(f"""select availability from "Worker" w join "User" u on u.id=w."userId" where u.phone='{wphone}';"""),
      "BUSY")

print("=== 3. Lifecycle transitions ===")
check("ON_THE_WAY", req("PATCH", f"/bookings/{bid}/status", wt, {"status": "ON_THE_WAY"})[0], 200)
check("ARRIVED", req("PATCH", f"/bookings/{bid}/status", wt, {"status": "ARRIVED"})[0], 200)
check("illegal jump ARRIVED->COMPLETED refused",
      req("PATCH", f"/bookings/{bid}/status", wt, {"status": "COMPLETED"})[0], 400)

print("=== 4. Service-start OTP (backend-validated) ===")
_, o = req("GET", f"/bookings/{bid}/service-otp?purpose=SERVICE_START", ct)
check("demo start OTP is 0000", o["otp"], "0000")
check("wrong OTP rejected",
      req("POST", f"/bookings/{bid}/service-otp/verify", wt,
          {"purpose": "SERVICE_START", "otp": "9999"})[0], 400)
check("worker cannot read the customer's OTP",
      req("GET", f"/bookings/{bid}/service-otp?purpose=SERVICE_START", wt)[0], 403)
check("correct OTP accepted",
      req("POST", f"/bookings/{bid}/service-otp/verify", wt,
          {"purpose": "SERVICE_START", "otp": o["otp"]})[0], 200)
check("status IN_PROGRESS", sql(f"select status from \"Booking\" where id='{bid}';"), "IN_PROGRESS")

print("=== 5. Completion OTP ===")
check("request-completion", req("POST", f"/bookings/{bid}/request-completion", wt)[0], 200)
_, o2 = req("GET", f"/bookings/{bid}/service-otp?purpose=SERVICE_COMPLETION", ct)
check("demo completion OTP is 0000", o2["otp"], "0000")
check("completion accepted",
      req("POST", f"/bookings/{bid}/service-otp/verify", wt,
          {"purpose": "SERVICE_COMPLETION", "otp": o2["otp"]})[0], 200)
check("status COMPLETED", sql(f"select status from \"Booking\" where id='{bid}';"), "COMPLETED")
check("worker freed to AVAILABLE",
      sql(f"""select availability from "Worker" w join "User" u on u.id=w."userId" where u.phone='{wphone}';"""),
      "AVAILABLE")

print("=== 6. Rating ===")
check("rating accepted",
      req("POST", f"/bookings/{bid}/rating", ct, {"stars": 5, "comment": "E2E verification run"})[0], 201)
check("duplicate rating rejected",
      req("POST", f"/bookings/{bid}/rating", ct, {"stars": 1})[0], 409)

print("=== 7. Fair-wage split (Part F) ===")
_, full = req("GET", f"/bookings/{bid}", ct)
base = svc["basePrice"]
check("totalAmount == basePrice (non-emergency)", full["totalAmount"], base)
check("federationFee == 10% of base", round(full["federationFee"], 2), round(base * 0.10, 2))
check("welfare == 3% of base", round(full["welfareContribution"], 2), round(base * 0.03, 2))
check("workerShare == total - fee - welfare", round(full["workerShare"], 2),
      round(base - base * 0.10 - base * 0.03, 2))

print(f"\nRESULT: {passed} passed, {failed} failed")
sys.exit(1 if failed else 0)
