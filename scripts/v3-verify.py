#!/usr/bin/env python3
"""V3 regression: service packages, server-side decline, dispatch at scale,
and authorization.

    (cd backend && npm run dev)
    python3 scripts/v3-verify.py

Everything asserts against live endpoints and, where the server must be the
source of truth, directly against the database.
"""
import json
import subprocess
import sys
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor

API = "http://127.0.0.1:4000/api"
passed = failed = 0

# Skill matters: only these three carry the `technician` skill, so only
# they are eligible for the AC/appliance bookings used below. Racing with
# electricians would measure the skill gate, not the accept race.
TECHNICIAN_PHONES = ["9000000121", "9000000122", "9000000123"]
ELECTRICIAN_PHONES = ["9000000101", "9000000102", "9000000103"]


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
    return req("POST", "/auth/otp/verify", body={"phone": phone, "otp": "0000"})[1]["accessToken"]


def _pg_container():
    out = subprocess.run(
        ["docker", "ps", "--filter", "ancestor=postgis/postgis:16-3.4", "--format", "{{.Names}}"],
        capture_output=True, text=True).stdout.strip().splitlines()
    return out[0] if out else "sih26089-postgres"


PG = _pg_container()


def sql(q):
    return subprocess.run(
        ["docker", "exec", PG, "psql", "-U", "postgres", "-d", "sih26089", "-t", "-c", q],
        capture_output=True, text=True).stdout.strip()


def check(label, ok, detail=""):
    global passed, failed
    if ok:
        print(f"  PASS  {label}  {detail}"); passed += 1
    else:
        print(f"  FAIL  {label}  {detail}"); failed += 1


ct = login("9000000201")
_, services = req("GET", "/services?lat=18.5204&lng=73.8567", ct)


def make_booking(cat, pkg_name=None, emergency=False, tag="V3 test"):
    svc = next(s for s in services if s["category"] == cat)
    _, detail = req("GET", f"/services/{svc['id']}", ct)
    pkg = None
    if pkg_name:
        pkg = next(p for p in detail["packages"] if p["name"] == pkg_name)
    body = {
        "serviceId": svc["id"], "scheduledAt": "2026-09-10T10:00:00.000Z",
        "latitude": 18.5204, "longitude": 73.8567, "servicePincode": "411038",
        "serviceAddressLine": tag,
    }
    if pkg:
        body["packageId"] = pkg["id"]
    st, b = req("POST", "/bookings/emergency" if emergency else "/bookings", ct, body)
    return st, b, detail, pkg


print("=== 1. Service packages ===")
svc = next(s for s in services if s["category"] == "technician")
_, detail = req("GET", f"/services/{svc['id']}", ct)
check("service exposes packages", len(detail["packages"]) >= 2, f"{len(detail['packages'])}")
check("exactly one default package",
      sum(1 for p in detail["packages"] if p["isDefault"]) == 1)
check("packages ordered by tier",
      all(detail["packages"][i]["tier"] <= detail["packages"][i + 1]["tier"]
          for i in range(len(detail["packages"]) - 1)))
check("catalog startingPrice equals cheapest package",
      svc["startingPrice"] == min(p["price"] for p in detail["packages"]),
      f"{svc['startingPrice']}")

print("=== 2. Package pricing is server-authoritative ===")
premium = max(detail["packages"], key=lambda p: p["price"])
st, b, _, pkg = make_booking("technician", premium["name"], tag="V3 package")
check("booking created with package", st == 201)
check("booking priced from the PACKAGE, not service.basePrice",
      b["totalAmount"] == premium["price"],
      f"{b['totalAmount']} vs pkg {premium['price']} / svc {svc['basePrice']}")
check("federation fee is 10% of package price",
      round(b["federationFee"], 2) == round(premium["price"] * 0.10, 2))
check("welfare is 3% of package price",
      round(b["welfareContribution"], 2) == round(premium["price"] * 0.03, 2))
check("worker share = total - fee - welfare",
      round(b["workerShare"], 2) == round(premium["price"] * 0.87, 2))
check("packageId persisted on the booking",
      sql(f"select \"packageId\" from \"Booking\" where id='{b['id']}';") == pkg["id"])
pkg_booking = b["id"]

print("=== 3. Emergency + package: surge still entirely to the worker ===")
st, eb, _, epkg = make_booking("technician", premium["name"], emergency=True, tag="V3 pkg emergency")
check("emergency booking created", st == 201)
check("surge is 20% of PACKAGE price",
      round(eb["emergencyBonus"], 2) == round(premium["price"] * 0.20, 2), f"{eb['emergencyBonus']}")
check("fee still off package base, not the surge",
      round(eb["federationFee"], 2) == round(premium["price"] * 0.10, 2))
check("welfare still off package base, not the surge",
      round(eb["welfareContribution"], 2) == round(premium["price"] * 0.03, 2))
check("surge reaches the worker intact",
      round(eb["workerShare"] - b["workerShare"], 2) == round(premium["price"] * 0.20, 2),
      f"+{round(eb['workerShare'] - b['workerShare'], 2)}")

print("=== 4. Price tampering is refused ===")
st, _, _, _ = (lambda r: r)(req("POST", "/bookings", ct, {
    "serviceId": svc["id"], "packageId": "00000000-0000-0000-0000-000000000000",
    "scheduledAt": "2026-09-10T10:00:00.000Z", "latitude": 18.5204, "longitude": 73.8567,
})) + (None, None)
check("unknown packageId rejected", st == 404, str(st))
other = next(s for s in services if s["category"] == "plumber")
_, other_detail = req("GET", f"/services/{other['id']}", ct)
st, _ = req("POST", "/bookings", ct, {
    "serviceId": svc["id"], "packageId": other_detail["packages"][0]["id"],
    "scheduledAt": "2026-09-10T10:00:00.000Z", "latitude": 18.5204, "longitude": 73.8567,
})
check("package from another service rejected", st == 400, str(st))

print("=== 5. Server-side decline ===")
st, db_, _, _ = make_booking("technician", premium["name"], tag="V3 decline")
wt = login("9000000121")
_, feed_before = req("GET", "/bookings/dispatch/incoming", wt)
visible_before = any(o["id"] == db_["id"] for o in feed_before)
check("request visible before declining", visible_before)
st, _ = req("POST", f"/bookings/{db_['id']}/decline", wt, {"reason": "Too far"})
check("decline accepted", st == 200, str(st))
_, feed_after = req("GET", "/bookings/dispatch/incoming", wt)
check("declined request gone from THIS worker's feed",
      not any(o["id"] == db_["id"] for o in feed_after))
check("decline persisted server-side",
      sql(f"select response from \"BookingWorkerResponse\" where \"bookingId\"='{db_['id']}';") == "DECLINED")
check("booking still REQUESTED — decline must not cancel it",
      sql(f"select status from \"Booking\" where id='{db_['id']}';") == "REQUESTED")
other_wt = login("9000000122")
_, other_feed = req("GET", "/bookings/dispatch/incoming", other_wt)
check("still visible to OTHER eligible workers",
      any(o["id"] == db_["id"] for o in other_feed))
check("re-declining is idempotent",
      req("POST", f"/bookings/{db_['id']}/decline", wt)[0] == 200)
check("only one response row per worker",
      sql(f"select count(*) from \"BookingWorkerResponse\" where \"bookingId\"='{db_['id']}' and \"workerId\"=(select w.id from \"Worker\" w join \"User\" u on u.id=w.\"userId\" where u.phone='9000000121');") == "1")

print("=== 6. Skill gate ===")
elec_wt = login(ELECTRICIAN_PHONES[0])
st, sb, _, _ = make_booking("technician", premium["name"], tag="V3 skill gate")
st_gate, _ = req("POST", f"/bookings/{sb['id']}/accept", elec_wt)
check("worker without the skill cannot accept", st_gate == 403, str(st_gate))
check("booking untouched by the refused accept",
      sql(f"select status from \"Booking\" where id='{sb['id']}';") == "REQUESTED")

print("=== 7. Concurrent acceptance at scale ===")
tokens = [login(p) for p in TECHNICIAN_PHONES]
for n in (2, 5, 10, 20):
    st, cb, _, _ = make_booking("technician", premium["name"], tag=f"V3 race {n}")
    # n simultaneous accepts spread across the eligible workers. With fewer
    # workers than calls, each worker fires repeatedly — which also exercises
    # the same-worker double-accept guard.
    with ThreadPoolExecutor(max_workers=n) as ex:
        codes = [f.result()[0] for f in
                 [ex.submit(req, "POST", f"/bookings/{cb['id']}/accept", tokens[i % len(tokens)])
                  for i in range(n)]]
    winners = codes.count(200)
    assigned = sql(f"select count(*) from \"Booking\" where id='{cb['id']}' and \"workerId\" is not null;")
    check(f"{n:>2} concurrent accepts -> exactly 1 winner",
          winners == 1 and assigned == "1", f"200s={winners} db_assigned={assigned}")
    # Free the winner for the next round.
    sql(f"update \"Booking\" set status='CANCELLED' where id='{cb['id']}';")
    sql("""update "Worker" set availability='AVAILABLE' where availability='BUSY' and id not in
           (select "workerId" from "Booking" where "workerId" is not null
            and status not in ('COMPLETED','CANCELLED','REJECTED','EXPIRED'));""")

print("=== 8. Authorization (adversarial) ===")
victim_ct = ct
attacker_wt = login("9000000123")
st, _ = req("POST", "/bookings", attacker_wt, {
    "serviceId": svc["id"], "scheduledAt": "2026-09-10T10:00:00.000Z",
    "latitude": 18.5204, "longitude": 73.8567})
check("worker cannot create a booking", st == 403, str(st))
st, _ = req("GET", f"/bookings/{pkg_booking}", attacker_wt)
check("unrelated worker cannot read someone's booking", st == 403, str(st))
st, _ = req("GET", f"/bookings/{pkg_booking}/service-otp?purpose=SERVICE_START", attacker_wt)
check("worker cannot read the customer's OTP", st in (403, 404), str(st))
st, _ = req("POST", f"/bookings/{pkg_booking}/rating", attacker_wt, {"stars": 5})
check("non-customer cannot rate", st in (403, 400), str(st))
st, _ = req("GET", "/bookings/dispatch/incoming", victim_ct)
check("customer gets no worker dispatch feed", st == 200 and st and len(_ or []) == 0, str(st))
st, _ = req("GET", "/notifications")
check("unauthenticated request rejected", st == 401, str(st))
fed = sql('select id from "Federation" limit 1;')
st, _ = req("GET", f"/federations/{fed}/dashboard", victim_ct)
check("customer cannot read the admin dashboard", st == 403, str(st))
st, _ = req("PATCH", f"/bookings/{pkg_booking}/status", victim_ct, {"status": "COMPLETED"})
check("customer cannot force a booking to COMPLETED", st == 400, str(st))

print("=== 9. Cleanup ===")
sql("""update "Booking" set status='CANCELLED', "cancelledAt"=now(),
       "cancellationReason"='v3 automated test cleanup'
       where "serviceAddressLine" like 'V3 %' and status not in ('COMPLETED','CANCELLED');""")
sql("""update "Worker" set availability='AVAILABLE' where availability='BUSY' and id not in
       (select "workerId" from "Booking" where "workerId" is not null
        and status not in ('COMPLETED','CANCELLED','REJECTED','EXPIRED'));""")
# Scoped to this suite's own rows. Asserting a global zero would make the
# check fail whenever any unrelated booking happens to be open, which is
# not what "this suite left nothing behind" means.
left = sql("""select count(*) from "Booking"
              where "serviceAddressLine" like 'V3 %'
                and status not in ('COMPLETED','CANCELLED','REJECTED','EXPIRED');""")
check("no active test bookings left behind", left == "0", left)

print(f"\nRESULT: {passed} passed, {failed} failed")
sys.exit(1 if failed else 0)
