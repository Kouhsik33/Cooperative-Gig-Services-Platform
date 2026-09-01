#!/usr/bin/env python3
"""Regression checks for the V2 product-excellence surface.

Complements scripts/e2e-verify.py, which covers the core dispatch journey.
This one covers what V2 added: service social proof, the wage-split preview,
the richer dispatch feed, admin operations health, and forecast coherence.

    (cd backend && npm run dev)                      # port 4000
    (cd ai-service && .venv/bin/uvicorn app.main:app --port 8000)
    python3 scripts/v2-verify.py

Every assertion is against live endpoints and real seeded data.
"""
import json
import subprocess
import sys
import urllib.error
import urllib.request

API = "http://127.0.0.1:4000/api"
AI = "http://127.0.0.1:8000"
passed = failed = 0


def req(method, url, token=None, body=None):
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(url, data=data, method=method)
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


def login_otp(phone):
    req("POST", f"{API}/auth/otp/request", body={"phone": phone})
    return req("POST", f"{API}/auth/otp/verify", body={"phone": phone, "otp": "0000"})[1]["accessToken"]


def check(label, ok, detail=""):
    global passed, failed
    if ok:
        print(f"  PASS  {label}  {detail}"); passed += 1
    else:
        print(f"  FAIL  {label}  {detail}"); failed += 1


ct = login_otp("9000000201")
wt = login_otp("9000000100")
_, admin = req("POST", f"{API}/auth/login", body={"phone": "9000000001", "password": "password123"})
at = admin["accessToken"]
fed = subprocess.run(
    ["docker", "exec", "sih26089-postgres", "psql", "-U", "postgres", "-d", "sih26089",
     "-t", "-c", 'select id from "Federation" limit 1;'],
    capture_output=True, text=True).stdout.strip()

print("=== Service discovery: social proof on the catalog ===")
_, services = req("GET", f"{API}/services?lat=18.5204&lng=73.8567", ct)
check("catalog returns services", len(services) > 0, f"{len(services)}")
check("every service carries duration",
      all(s.get("durationMinMinutes") and s.get("durationMaxMinutes") for s in services))
check("every service carries completedCount", all("completedCount" in s for s in services))
rated = [s for s in services if s.get("ratingAvg") is not None]
check("rated services expose an average", len(rated) > 0, f"{len(rated)} rated")
check("unrated services report null, never 0",
      all(s["ratingAvg"] is None or s["ratingAvg"] > 0 for s in services))
# Same category => same coverage count; proves the per-category dedup holds.
tech = [s for s in services if s["category"] == "technician"]
check("services sharing a category share coverage",
      len({s["nearbyWorkerCount"] for s in tech}) == 1, f"{len(tech)} technician services")

print("=== Service detail: wage-split preview matches Part F ===")
svc = next(s for s in services if s["category"] == "technician")
_, detail = req("GET", f"{API}/services/{svc['id']}", ct)
b = detail["basePrice"]
std, eme = detail["pricePreview"]["standard"], detail["pricePreview"]["emergency"]
check("standard total == base", std["totalAmount"] == b, f"{std['totalAmount']}")
check("federation fee is 10% of base", round(std["federationFee"], 2) == round(b * 0.10, 2))
check("welfare is 3% of base", round(std["welfareContribution"], 2) == round(b * 0.03, 2))
check("emergency fee still off BASE only", eme["federationFee"] == std["federationFee"])
check("emergency welfare still off BASE only", eme["welfareContribution"] == std["welfareContribution"])
check("surge flows entirely to the worker",
      round(eme["workerShare"] - std["workerShare"], 2) == round(b * 0.20, 2),
      f"+{round(eme['workerShare'] - std['workerShare'], 2)}")
check("detail exposes inclusions and exclusions",
      len(detail["inclusions"]) > 0 and len(detail["exclusions"]) > 0)

print("=== Worker dispatch feed: earnings visible before accepting ===")
_, feed = req("GET", f"{API}/bookings/dispatch/incoming", wt)
check("feed responds as a list", isinstance(feed, list), f"{len(feed)} offers")
if feed:
    check("offers carry worker earnings", all("workerShare" in o for o in feed))
    check("offers carry a match score", all("matchScore" in o for o in feed))
    check("offers carry expected duration", all("durationMinMinutes" in o for o in feed))
    check("feed is ordered best-match first",
          all(feed[i]["matchScore"] >= feed[i + 1]["matchScore"]
              for i in range(len(feed) - 1)
              if feed[i]["isEmergency"] == feed[i + 1]["isEmergency"]))
else:
    print("       (no open bookings right now — ordering not exercised)")

print("=== Bookings list: rating attached so it can't re-prompt ===")
_, bookings = req("GET", f"{API}/bookings", ct)
completed = [x for x in bookings if x["status"] == "COMPLETED"]
check("completed bookings present", len(completed) > 0, f"{len(completed)}")
check("rating relation is included", any(x.get("rating") for x in completed))
check("payment relation is included", any(x.get("payment") for x in completed))

print("=== Admin operations health ===")
_, dash = req("GET", f"{API}/federations/{fed}/dashboard", at)
for key in ("completionRatePercent", "avgCustomerRating", "unservedBookings", "pendingVerification"):
    check(f"dashboard exposes {key}", key in dash, str(dash.get(key)))
check("completion rate is a percentage",
      dash["completionRatePercent"] is None or 0 <= dash["completionRatePercent"] <= 100)
check("avg rating within 1-5",
      dash["avgCustomerRating"] is None or 1 <= dash["avgCustomerRating"] <= 5)

print("=== Cooperative impact stays real ===")
_, impact = req("GET", f"{API}/impact", ct)
check("impact figures are non-negative",
      all(impact[k] >= 0 for k in ("verifiedWorkers", "completedServices", "welfareGenerated")))
check("avg worker share is plausible",
      impact["avgWorkerSharePercent"] is None or 80 <= impact["avgWorkerSharePercent"] <= 100,
      f"{impact['avgWorkerSharePercent']}%")

print("=== AI forecast: coherent and explainable ===")
try:
    _, fc = req("GET", f"{AI}/forecast/demand?federationId={fed}&days=7")
    rows = fc["forecast"]
    check("forecast returns rows", len(rows) > 0, f"{len(rows)}")
    check("no row predicts 0 demand yet asks for workers",
          not [r for r in rows if r["predictedBookings"] == 0 and r["recommendedWorkers"] > 0])
    check("every row explains itself", all(r.get("reason") and r.get("basis") for r in rows))
    check("every row has a demand level",
          all(r.get("demandLevel") in ("none", "low", "medium", "high") for r in rows))
    check("rows sorted by predicted demand",
          all(rows[i]["predictedBookings"] >= rows[i + 1]["predictedBookings"]
              for i in range(len(rows) - 1)))
except urllib.error.URLError:
    print("  SKIP  ai-service not reachable on :8000")

print(f"\nRESULT: {passed} passed, {failed} failed")
sys.exit(1 if failed else 0)
