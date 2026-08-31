# SIH26089 — Cooperative Gig Services Platform

This file grounds every future session on the two parts of
[SIH26089_FINAL_Development_Spec.md](SIH26089_FINAL_Development_Spec.md) that
must never drift: **Part A** (what "done" means) and **Part J** (in what order
to build it). Full detail — architecture, data model, API list, wage-split
formula, i18n scope, AI forecasting scope, seed data plan — lives in the spec
file itself; read it before starting any non-trivial work.

## Golden rule (Part A)

> If a feature exists only in the database/API and has no corresponding
> screen a judge can tap through, it does not count as "covered."

Every requirement below needs a **UI element**, not just a working endpoint.
Cross-check this table before considering any phase "done."

## Part A — Requirement Traceability Matrix

| # | PS Requirement | Feature | Who sees it | Must be visible as |
|---|---|---|---|---|
| 1 | Service provider registration and verification | Worker onboarding + federation verification | Worker, Federation Admin | "Verified by [Federation]" badge on worker's own profile AND on every worker card customers browse |
| 2 | Worker skill profiling and certification | Skill tags + certificate upload | Worker, Customer | Skill chips + certificate icons on profile; drives customer search/filter (functionally load-bearing) |
| 3 | Customer booking and scheduling | Service catalog → slot picker → confirm | Customer | Calendar/slot UI showing **estimated worker earning for this slot** at booking time |
| 4 | Geo-location based service matching | Nearest-verified-worker matching | Customer, Worker | Customer sees map + nearby workers + ETA; worker sees requests ranked by distance; same-federation/society workers surfaced first |
| 5 | Digital payments and invoicing | Razorpay checkout + PDF invoice | Customer, Worker | Invoice itemizes worker share, federation fee, welfare contribution as **three separate line items** |
| 6 | Rating and feedback mechanism | Post-job star rating + comment | Customer, Worker | Aggregate rating shown publicly on worker profile; feeds into match ranking |
| 7 | Worker welfare and insurance integration | Auto-accruing welfare fund per completed job | Worker, Federation Admin | Dedicated **"My Welfare" tab**: running balance, per-job contribution history, mocked insurance status — first-class nav destination |
| 8 | Emergency / on-demand booking | Priority "Book Now" flow | Customer, Worker | Visually distinct "Emergency" button; high-priority alert to worker; urgency premium flows proportionally to worker share (never absorbed as platform fee), shown on same itemized invoice as #5 |
| 9 | Cooperative federation administration dashboard | Web dashboard | Federation Admin | Worker verification queue, live booking oversight, welfare fund balance + disbursement log, demand forecast widget |
| 10 | Multilingual mobile application | i18n, customer + worker apps | Customer, Worker | Language switcher on first launch + settings; English + 2 regional languages across all core flows, incl. formatted currency/date per locale |
| 11 | AI-based demand forecasting and workforce allocation | 7-day forecast per federation/service | Federation Admin | Bar chart of predicted demand next 7 days + "recommended worker allocation" — must render as a chart, not text |
| 12 | "Fair wages, worker welfare, consumer trust" (implied, explicitly graded) | Wage transparency woven through every screen | All personas | Present in: (a) booking confirmation (customer sees wage split before paying), (b) worker earnings screen (exact split logic, not a lump sum), (c) federation dashboard (aggregate fairness metric, e.g. "avg. worker share % this month") |

## Part J — Phased Build Plan

Build strictly in this order. **Do not build Phase 4 before Phase 3 is
complete** — Phase 3 is what makes this submission distinct from a generic
gig-marketplace clone and must not be cut for time. If time runs out, stop at
the end of a phase — each phase alone is a coherent, fully demoable product.

- **Phase 1 — Core loop (must-have):** Auth (3 roles: CUSTOMER, WORKER,
  FEDERATION_ADMIN), Worker/Federation/Society models, service catalog,
  booking creation with geo-matching, wage-split computation + itemized
  display on both customer and worker sides.
- **Phase 2 — Trust & payments:** Razorpay test-mode checkout with itemized
  order, invoice screen/PDF, rating & feedback, worker verification queue
  (admin).
- **Phase 3 — Differentiators (do not skip):** Welfare fund ledger + "My
  Welfare" tab, federation dashboard (worker mgmt, bookings, welfare fund,
  fairness-metrics card), multilingual UI on core flows.
- **Phase 4 — Polish & stretch:** AI demand forecasting widget, Socket.io
  real-time booking/emergency alerts, emergency booking flow with
  fairness-rule surge logic fully wired end to end.

## Wage-split formula (Part F — implement exactly, this is graded)

```
totalAmount = service.basePrice
if isEmergency:
    emergencyBonus = totalAmount * EMERGENCY_SURGE_PERCENT   // e.g. 20%
    totalAmount += emergencyBonus
else:
    emergencyBonus = 0

federationFee = service.basePrice * FEE_PERCENT              // e.g. 10% — NOT applied to emergency bonus
welfareContribution = service.basePrice * WELFARE_PERCENT    // e.g. 3% — NOT applied to emergency bonus
workerShare = totalAmount - federationFee - welfareContribution
```

Critical rule: `emergencyBonus` flows entirely to `workerShare`. Federation
fee and welfare % are computed only off base price, never off the surge.
Label this explicitly in the UI: "Emergency bonus goes to your worker"
(customer side) / "Emergency bonus: +₹X" (worker side).

## Monorepo layout (Part K)

```
/backend      Node.js + Express + TypeScript + Prisma + PostgreSQL/PostGIS
/mobile-app   React Native + Expo, single app, role-routed (CUSTOMER/WORKER)
/admin-web    React + Vite + TailwindCSS (Federation Admin dashboard)
/ai-service   Python FastAPI — GET /forecast/demand
docker-compose.yml   Postgres(PostGIS) + backend + ai-service
```

## Build status

- **Phase 1 (core loop): done.** Auth (register/login/refresh/language,
  JWT + bcrypt), Worker/Federation/Society CRUD + verification, geo-matching
  (Haversine, not PostGIS — see gap below), service catalog, booking
  creation with Part F wage-split, seed data (Part I), FairPricingBreakdownScreen
  + JobFeedScreen wired to the real API.
- **Phase 2 (trust & payments): done.** Razorpay test-mode order creation
  (mock fallback when no real keys — see gap below), signature-verified
  webhook that marks payment paid and credits the welfare fund, itemized
  JSON invoice endpoint + screen, star rating + comment with worker
  `ratingAvg` recompute, admin-web login + Worker Verification Queue UI.
- **Phase 3 (differentiators): done.** Federation dashboard (4 aggregate
  cards incl. avg. worker share %), welfare fund ledger (filterable by
  worker), worker management roster (separate from the verification
  queue), bookings oversight (polling, "near-live"), My Welfare tab wired
  to real data, i18n (en/hi/mr) applied to the booking→pay→rate flow,
  FairPricingBreakdownScreen, and MyWelfareScreen, with locale-aware
  currency/date formatting and a LanguageSwitcher (on LoginScreen + each
  role's home screen — no dedicated Settings screen exists, see gaps).
- **Phase 4 (polish): done.** Real 14-day-SMA demand forecast (ai-service
  queries Postgres directly, backend proxies it) rendered as a recharts
  bar chart on DashboardHome + the dedicated Demand Forecast page, with a
  recommended-worker-allocation list beneath it. Socket.io real-time
  (`booking:new`/`booking:statusUpdate`/`booking:emergency`) replaces
  BookingsOverview's polling and drives a distinct urgent banner on both
  admin-web and the worker's JobFeedScreen. A real "Book Now" emergency
  flow on the mobile customer app (service picker → nearest verified
  worker → FairPricingBreakdownScreen with `isEmergency: true`), verified
  end to end through payment and welfare crediting — the Part F fairness
  rule holds exactly (confirmed via curl: base 500 → emergencyBonus 100 →
  workerShare 535, federationFee/welfareContribution unaffected by the
  bonus, welfare fund credited exactly the 15 welfareContribution on
  COMPLETED, not 100 or 115).
- **Post-audit fix: standard (non-emergency) booking flow — done.** A
  requirement-traceability audit found `ServiceCatalogScreen`,
  `WorkerSearchScreen`, `BookingSlotScreen`, and `EarningsScreen` were
  still Phase-1-scaffold stubs (title text only) despite their backend
  endpoints being complete since Phase 1 — the standard booking journey
  only worked via curl, never through the app. Fixed: `ServiceCatalogScreen`
  (real service list) → `WorkerSearchScreen` (real `GET /workers/nearby`
  results with verification badge, skill chips, rating, distance/ETA) →
  `BookingSlotScreen` (day/time chip picker) → the existing
  `FairPricingBreakdownScreen` with `isEmergency: false`, reusing exactly
  what the emergency flow already built rather than duplicating the
  `POST /api/bookings` call. Also fixed a real bug while at it:
  `getNearbyWorkers`'s sort only used distance — `ratingAvg` was returned
  but never influenced order, so Row 6's "better-rated workers surfaced
  higher" was false. Now sorts by whole-km distance tier first, `ratingAvg`
  descending within a tier. `EarningsScreen` was built for real (running
  total + itemized per-job split, reusing `fairPricing.*` labels so both
  sides show the same numbers). `RegisterScreen`'s hardcoded string was
  wired into i18n. Verified end to end via curl mirroring the exact app
  flow, including a rounding-rule check on the tier-sort math (see gaps).

## API additions beyond Part E (sanctioned, not gaps)

These endpoints don't appear in Part E's literal list but are legitimate,
needed additions — not errors or workarounds:

- **`GET /api/federations/:id/bookings`** — Part E's only booking-listing
  endpoint (`GET /api/bookings?userId=&role=`) is scoped to a single user;
  the bookings-oversight page needs a federation-wide view. Capped at 100
  most-recent rows, no pagination yet.
- **`POST /api/payments/simulate-callback`** — a demo-only stand-in for
  Razorpay's webhook callback, so the app has a real tappable end-to-end
  payment step without live Razorpay keys. Requires the caller to be the
  booking's own customer (JWT-authenticated), runs the exact same
  server-side `capturePayment()` core as the real signature-verified
  webhook, and refuses to run at all when real Razorpay credentials are
  configured. See [payment.controller.ts](backend/src/controllers/payment.controller.ts).

## Known gaps (surfaced, not silently patched)

- **No PostGIS geography column.** Worker/Booking store plain `Float`
  lat/lng, so `getNearbyWorkers` computes distance with the Haversine
  formula in application code, not `ST_Distance`. Functionally equivalent
  at this scale; revisit if geo queries need to move into SQL.
  `getNearbyWorkers` also still can't apply "same-federation/society
  workers surfaced first" (Requirement 4) — the schema has no
  customer↔federation relation, only worker↔society↔federation.
- **Razorpay test credentials aren't configured.** `RAZORPAY_KEY_ID`/
  `_SECRET` are empty by default, so `createOrder` falls back to a mock
  order (`isMock: true` in the response) and `POST /payments/simulate-callback`
  (demo-only, not in Part E) stands in for a real webhook call. Set real
  values in `backend/.env` to exercise Razorpay's actual test API —
  `simulate-callback` then refuses to run (403), since it would otherwise
  let anyone fake a real payment for free. `RAZORPAY_WEBHOOK_SECRET` unset
  means the real webhook skips signature verification; do not deploy with
  it unset. **Gotcha hit while testing this**: `ts-node-dev`'s file
  watcher does not pick up `.env` changes — editing `backend/.env` requires
  killing and restarting the dev server, not just waiting for hot-reload.
- **No Razorpay native SDK in the Expo app.** CheckoutScreen creates a
  payment order and displays it; "Simulate Payment" calls
  `simulate-callback` rather than a real in-app "Pay now" (needs a config
  plugin / dev client — out of scope). Nothing about "paid" is decided
  client-side either way — `simulate-callback` runs the exact same
  server-side capture logic as the real webhook.
- **Payment.razorpayId is a single column** but Razorpay has distinct
  order/payment ids. It's kept pinned to the order id (the lookup key)
  rather than overwritten on success, so replayed webhooks stay
  idempotent. A real schema would carry both ids separately.
- **"Must be paid" gate on welfare crediting is a judgment call.** Welfare
  now credits on the booking's `COMPLETED` transition (moved off payment
  success, per request), but only if `payment.status === "paid"` —
  completing an unpaid job skips the credit rather than crediting money
  never collected. That gate wasn't explicitly asked for; flagged rather
  than added silently. See
  [booking.controller.ts](backend/src/controllers/booking.controller.ts).
- **No dedicated Settings screen.** Part G asks for a language switcher
  "on first launch + settings." There's no settings screen yet, so the
  switcher lives on LoginScreen (first launch) and each role's home
  screen (`ServiceCatalogScreen`, `JobFeedScreen`) as a stand-in.
- **Fairness metrics are all-time, not "this month."** Part A's example
  phrasing ("avg. worker share % this month") is illustrative, not a
  strict requirement; `getFairnessMetrics` averages across all COMPLETED
  bookings to date. Easy to add a date filter later if the demo wants a
  strict monthly framing.
- **ai-service couples directly to the Postgres schema.** `GET
  /forecast/demand` runs raw SQL against `Booking`/`Service`/`Worker`/
  `Society` table names via `DATABASE_URL`, which cuts against Part C's
  "kept isolated and scoped" framing for the AI service. The alternative
  — the Node backend queries Prisma and POSTs aggregated history to a
  schema-agnostic ai-service endpoint — would preserve isolation but
  deviates from Part K's literal "ai-service implementing GET
  /forecast/demand" contract. Direct DB access was chosen to match that
  contract; flagged as a trade-off. See
  [forecast.py](ai-service/app/routers/forecast.py).
- **`WORKER_DAILY_CAPACITY = 2`** (jobs one worker can complete per day)
  is an assumed constant, not derived from any real capacity data — none
  is modeled in the schema. It's the entire basis for "recommended worker
  allocation."
- **`DemandForecast` Prisma model is unused.** The forecast is recomputed
  live on every dashboard load rather than cached/persisted into that
  table, since Part E defines no "save forecast" endpoint. Simpler, no
  cache-invalidation questions to answer, but means repeated identical
  DB queries on every page view.
- **No real device geolocation anywhere.** `DEMO_LOCATION`
  ([lib/location.ts](mobile-app/src/lib/location.ts), the seeded Pune demo
  city center) stands in for "the customer's current location" in both
  `EmergencyBookingScreen` and `WorkerSearchScreen`/`BookingSlotScreen` —
  no `expo-location` is wired into this Expo scaffold. A real app needs
  actual GPS, not a hardcoded point shared by every customer.
- **`getNearbyWorkers`'s rating tiebreak uses a 1km distance-tier bucket**
  — a judgment call, not derived from anything in the spec. Wide enough
  for rating to matter among genuinely comparable options, narrow enough
  that "nearest" still dominates per Requirement 4. Verified with real
  seeded data (not just code review): confirmed tiers are non-decreasing
  and rating descends within each tier. **Verification gotcha hit while
  checking this**: Python's `round()` uses banker's rounding (round-half-
  to-even), JavaScript's `Math.round()` doesn't (round-half-up) — a
  naive Python verification script mislabeled one worker's tier at an
  exact `.5` boundary and looked like a backend bug until re-checked with
  JS-equivalent rounding.
- **No calendar/date-picker library.** `BookingSlotScreen` uses a plain
  chip-based day (next 5 days) + time-slot (5 fixed times) picker instead
  of `@react-native-community/datetimepicker` or similar — deliberately
  dependency-light, since there's no simulator available in this
  environment to verify a native picker actually renders correctly.
- **Python 3.14 forced newer-than-pinned dependency versions.**
  `ai-service/requirements.txt` uses `>=` minimums (fastapi 0.141,
  pydantic 2.13, psycopg2-binary 2.9.10) instead of exact pins, because
  the environment's Python 3.14 has no prebuilt wheels for the originally
  scaffolded pins (psycopg2-binary 2.9.9, pydantic-core under 2.13) and
  building from source failed (`pg_config` missing / PyO3 doesn't support
  3.14 yet). Pin more tightly if reproducing this exact environment matters.
- **`AI_SERVICE_URL` must use `127.0.0.1`, not `localhost`, for local
  (non-Docker) dev.** `localhost` resolved to IPv6 `::1` on this machine
  first; `uvicorn --host 0.0.0.0` only binds IPv4, so axios calls from the
  backend got `ECONNREFUSED` that had nothing to do with the service
  being down. Doesn't affect docker-compose (service name, not localhost).
- **`ts-node-dev` doesn't watch `.env`.** Confirmed again this phase —
  changing `backend/.env` needs a manual process restart (kill + `npm run
  dev`), not just a wait for hot-reload. (First hit in Phase 2, still true.)

## Product-flow update phase — location, passwordless auth, full booking
## lifecycle with OTPs, chat/call (done)

A follow-up product spec ("PRODUCT FLOW UPDATE") superseded parts of the
above: no-password OTP login, a customer location/address system that
actually drives service discovery, a granular OTP-gated booking lifecycle
(navigate → arrive → start OTP → in progress → completion OTP →
completed), worker↔customer chat/call, and admin geo-spatial + AI
workforce views. All implemented and curl/tsc/Metro-verified end to end
in this phase; existing Phase 1-4 functionality (wage-split, welfare,
ratings, forecast, i18n, sockets) was preserved, not rewritten.

**Backend schema additions** (`backend/prisma/schema.prisma`):
`OtpVerification` (one generic table, purpose-tagged LOGIN/
SERVICE_START/SERVICE_COMPLETION — not three separate tables),
`CustomerAddress` (saved addresses), `ChatMessage`, plus new `Booking`
fields (`serviceAddressLine`/`serviceLandmark`/`servicePincode`/
`contactName`/`contactPhone`/`instructions`/`serviceStartedAt`/
`serviceCompletedAt`) and extended `BookingStatus` enum
(`ON_THE_WAY`/`ARRIVED`/`COMPLETION_PENDING`/`REJECTED`/`EXPIRED` added
— existing values unchanged, `REQUESTED` still plays "assigned, awaiting
accept" since a specific worker is chosen at creation time). `Society`
got an optional `pincode`. See `backend/src/services/otp.service.ts` for
the single OTP generate/verify module every purpose goes through, and
`backend/src/config/env.ts`'s `otp` block for the demo-phone/demo-OTP
config (`DEMO_PHONE_NUMBER=9000000201`, `DEMO_OTP=0000` — never hardcoded
as an `if` check).

**New/changed endpoints:** `POST /auth/otp/request`, `POST
/auth/otp/verify`, reworked `POST /auth/register` (now requires a
recently-verified OTP instead of a password — `admin-web`'s `POST
/auth/login` phone+password path is untouched, admins don't use the
mobile OTP flow), `GET/POST /addresses`, `DELETE /addresses/:id`, `GET
/societies` (new — lets a fresh WORKER registration pick a society),
`GET /services?lat&lng` (now optionally location-aware — annotates each
service with real `coverage`/`nearbyWorkerCount` computed from actual
nearby verified workers, not a fake UI-only filter), `POST
/bookings/:id/request-completion`, `GET /bookings/:id/service-otp`, `POST
/bookings/:id/service-otp/verify`, `GET/POST /bookings/:id/messages`, and
`GET /federations/:id/geo-demand`. `updateBookingStatus` now enforces an
explicit transition table (`PLAIN_TRANSITIONS` in
`booking.controller.ts`) — `IN_PROGRESS`/`COMPLETED` are only reachable
through `verifyServiceOtp`, never a plain status PATCH.

**Mobile app:** passwordless `LoginScreen`→`OtpScreen`→`RegisterScreen`
(no password field anywhere); a real `OnboardingStatusScreen` (was a
stub) that now doubles as the new-WORKER setup form (skills + society)
and the verification-status stepper; `LocationContext` +
`LocationPickerScreen` + `AddAddressScreen` (Rapido/Swiggy-style, with
"Use current location" honestly falling back to the documented
`DEMO_LOCATION`, never pretending real GPS); Home's service list now
refetches on location change and tags zero-coverage services rather than
hiding them; `BookingSlotScreen` gained a service-location confirmation
card + optional instructions field, both attached per-booking (never to
the saved address); a new `BookingTrackingScreen` (customer) and
`JobDetailScreen` (worker) are the two lifecycle hubs — status timeline,
OTP reveal/entry, chat/call (only shown once a booking is past
`REQUESTED`), cancel action; `ChatScreen` (shared) is real-time via the
existing Socket.io connection plus a REST history fetch; `WorkerProfileScreen`
now renders `certifications` (previously backend-only) and a
demo-labeled Insurance card. **Environment gap discovered this
phase:** no network access to install new npm packages, so
`@react-navigation/bottom-tabs` couldn't be added — `src/navigation/
BottomTabs.tsx` is a small dependency-free replacement (local state +
per-tab stack navigators + `@expo/vector-icons`, already bundled with
Expo). Trade-off: switching tabs away and back resets that tab's stack
to its initial screen.

**admin-web:** new `GeoDemand` page (`/geo-demand`) — real pincode-level
demand vs. available-verified-workforce table, sourced from the same
`servicePincode`/`Society.pincode` data (rows with no pincode simply
aren't counted, not bucketed into a fake "unknown" row).
`DemandForecastWidget` now also fetches the federation's actual
per-skill verified headcount and shows a shortage/surplus line under
each category's AI recommendation — real roster data, not another AI
number pretending to be one. `BookingsOverview` gained Started/Completed
timestamp columns; `StatusBadge` covers every new status.

**Navigation audit findings from this phase** (current/expected/actual/
root cause/fix format, per how the product-flow spec asked for it):
- `RatingScreen` was fully implemented but **zero screens ever navigated
  to it** — Requirement 6 had a working backend+screen with no
  judge-tappable entry point. Root cause: no caller. Fix: `BookingsListScreen`
  shows a "Rate" action on `COMPLETED` bookings, and `BookingTrackingScreen`
  offers it the moment a booking completes.
- `EmergencyAlertScreen` (worker) was registered as a route in the old
  `WorkerNavigator` but nothing ever called `navigation.navigate("EmergencyAlert")`
  — a dead route, superseded by `JobFeedScreen`'s inline emergency banner.
  Fix: dropped from the new `WorkerNavigator`; the file itself is left
  alone (still an unreachable stub, same as before — not this phase's
  scope to delete files).
- The Home screen's "Book Emergency Service" CTA navigated to a route
  name (`"EmergencyBooking"`) that would have silently broken once tabs
  each got their own stack (no such route inside the Home tab's stack).
  Fix: `TabSwitchContext` lets a screen switch the active bottom tab by
  key instead of navigating to a route that may not exist in its own
  stack.
- `RatingScreen`'s post-submit `navigation.navigate("ServiceCatalog")`
  would have thrown once the screen became reachable from three
  different stacks (Home/Bookings/Emergency), only one of which has a
  `ServiceCatalog` route. Fix: `navigation.popToTop()`, which is valid
  in any stack.

**New known gaps (surfaced, not silently patched):**
- No real map provider — `JobDetailScreen`'s "on the way" state shows a
  static labeled placeholder box, not live GPS tracking. Structured so a
  real map SDK can be dropped in later; explicitly not faked as live.
- Live worker-position tracking doesn't exist — there's no continuous
  location stream, only the lifecycle status transitions themselves.
- Real SMS delivery is muted end to end (`OTP_SMS_ENABLED=false`); OTPs
  land only in the server console log (`[otp:muted] ...`). The
  integration point is real (`otp.service.ts`), just not wired to a
  provider.
- Address geocoding doesn't exist — `AddAddressScreen` saves a typed
  address with `DEMO_LOCATION`'s coordinates verbatim, not real
  lat/lng for that street address. Flagged in the screen's own comment.
- Cancellation reasons aren't captured — the customer's cancel flow shows
  a policy confirmation but doesn't collect/store *why*; admin sees the
  `CANCELLED` status but no reason field (none exists in the schema).
- Chat has no read receipts/typing indicators/push notifications — just
  a message list + send, matching "build the frontend architecture
  cleanly so it can be connected to more later" rather than a full chat
  product.
- `BottomTabs`'s per-tab state reset — **fixed in the next phase below**
  (tabs are now lazily mounted and kept alive, not unmounted on switch).

## Dispatch model phase — customer books a SERVICE not a worker, warning
## cleanup, deterministic demo accounts (done)

A follow-up spec ("DISPATCH MODEL, DEMO ACCOUNTS & WARNING CLEANUP")
replaced the single-worker-select booking flow with a real dispatch/
broadcast model — conceptually a ride-hailing "first driver to accept
wins" — plus a warning audit and deterministic multi-worker demo seed
data for concurrency testing. Implemented and verified end to end
(including real concurrent-accept races, not just code review).

**Warnings fixed at the root, not suppressed:**
- Express 4 does not catch a rejected promise thrown inside an `async`
  route handler — every one of this app's controllers is `async` and
  none were wrapped, so a thrown error anywhere became an unhandled
  promise rejection *and* left the HTTP request hanging forever (no 500,
  no response at all) instead of hitting `error.middleware.ts`. Added
  `backend/src/lib/catchAsync.ts` and wrapped every route registration
  across every `*.routes.ts` file.
- `react-router-dom@6.30` logs "React Router Future Flag Warning" to the
  console under `<BrowserRouter>` without the v7 future flags — added
  `future={{ v7_startTransition: true, v7_relativeSplatPath: true }}` in
  `admin-web/src/App.tsx`.
- `mobile-app/src/navigation/BottomTabs.tsx` used to fully unmount a tab's
  screen tree when switching away, which both reset that tab's inner
  navigation state on every switch (a gap noted in the previous phase)
  *and* risked "Can't perform a React state update on an unmounted
  component" whenever an in-flight fetch's `.then(setState)` resolved
  after the switch — extremely likely given how often tab-switching
  happens. Rewritten to lazily mount each tab once and keep it alive
  (`display: none` when inactive) for the lifetime of `BottomTabs`,
  matching `@react-navigation/bottom-tabs`' own default behavior — fixes
  both issues at once.

**Demo OTP, generalized:** `env.otp.demoPhonePrefix` (default
`"900000"`, configurable) replaces the old single-exact-match
`DEMO_PHONE_NUMBER` — every seeded demo phone (customer 9000000201/202/
203, worker 9000000100 + the new 9000000101-103/111-113/121-123) shares
this prefix, so `isDemoPhone()` in `otp.service.ts` recognizes all of
them without enumerating each one. Fixed a real bug while at it: service-
start/completion OTP generation in `booking.controller.ts` was never
passed a `phone` at all, so demo bookings got a random 4-digit code
instead of `0000` — now the customer's phone is looked up and threaded
through explicitly.

**Dispatch model** (`backend/prisma/schema.prisma`): `Booking.workerId`
is now nullable — a booking is created with no worker, `status:
REQUESTED`, `eligibleWorkerCount`/`broadcastAt` set from a live query
(`dispatch.service.ts`'s `findEligibleWorkers`: verified + AVAILABLE +
skill match + same pincode as the booking, falling back to a 25km
Haversine radius only when there's no pincode match). New `Worker.
availability` enum (AVAILABLE/BUSY/OFFLINE, self-togglable between
AVAILABLE/OFFLINE via `PATCH /workers/:id/availability` — BUSY is
server-only). New `BookingStatus.ASSIGNED` sits between REQUESTED and
ON_THE_WAY; the old ACCEPTED value is kept in the enum for historical
rows but no longer produced by new bookings — the dispatch model
collapses "customer picks a worker" + "worker accepts" into one event.

The core safety guarantee — **first accept wins, atomically** — is one
`prisma.booking.updateMany({ where: { id, status: "REQUESTED", workerId:
null }, data: { status: "ASSIGNED", workerId, assignedAt } })` in
`acceptBooking`. Postgres serializes concurrent UPDATEs to the same row,
so at most one concurrent caller's WHERE clause still matches after the
first commits; every other caller gets `count === 0` → a clean 409.
**Verified under real concurrency**, not just reasoned about: 10
simultaneous `POST /accept` calls from two different workers against the
same booking produced exactly one 200 and nine 409s, confirmed via
`curl ... &` backgrounded requests. Also verified: two customers booking
the same service in the same area concurrently each get independently
broadcast bookings, and two different AC workers can accept the two
different bookings while a worker who already won one correctly gets a
409 trying to grab the other (BUSY). No `BookingWorkerRequest` join
table — eligibility for a worker's "incoming requests" list (`GET
/bookings/dispatch/incoming`) is recomputed on read, not persisted per
worker; flagged as a scoping simplification, not an oversight — see
`getDispatchAnalytics`'s comment on why still-searching bookings can't
be federation-scoped through the worker relation and fall back to a
pincode-based best-effort join instead.

**Mobile app:** `WorkerSearchScreen` — the "choose your professional"
screen the spec explicitly says must be removed — is deleted outright,
not just unwired (it implemented now-forbidden behavior, unlike the
merely-superseded `EmergencyAlertScreen` from the previous phase, which
was left in place). `ServiceCatalogScreen`/`EmergencyBookingScreen` now
navigate straight from service selection to scheduling; `BookingSlotScreen`
and `FairPricingBreakdownScreen` no longer take a `workerId` param at
all. `BookingTrackingScreen` gained a whole "Finding a professional near
you..." state (`REQUESTED`, no worker yet) with a live eligible-worker
count, "Keep searching" (calls the new `POST /:id/redispatch`), and
"Change service"; the existing timeline/OTP/chat/call UI is unchanged
from ASSIGNED onward. `JobFeedScreen` is now two sections — "New
requests" (broadcast, thin payload, Accept/Decline, live via
`booking:dispatchRequest`/`booking:noLongerAvailable`) and "My jobs"
(already won, drills into `JobDetailScreen`, whose own `ACCEPTED` case
was renamed `ASSIGNED` to match). `WorkerHomeScreen` gained the
AVAILABLE/OFFLINE `Switch` toggle.

**New known gaps:**
- Decline is client-only (locally dismisses the card for that session) —
  no backend call, since there's no per-worker-request row to update;
  the booking simply stays REQUESTED for every other eligible worker.
- No background job expires a REQUESTED booking that nobody ever
  accepts — it stays searchable indefinitely until the customer cancels
  or taps "Keep searching" again. `EXPIRED` exists in the enum but
  nothing transitions a booking into it yet.
- `getDispatchAnalytics`/geo-scoping for still-searching bookings is a
  best-effort pincode join, not a real FK, because an unassigned booking
  has no worker (hence no federation) to scope through yet — see the
  schema comment on `Booking.eligibleWorkerCount`.
