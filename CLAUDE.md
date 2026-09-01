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
  lat/lng, so distance is computed with the Haversine formula in
  application code (`matching.service.ts`), not `ST_Distance`.
  Functionally equivalent at this scale; revisit if geo queries need to
  move into SQL.
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
- ~~No background job expires a REQUESTED booking that nobody ever
  accepts.~~ **Fixed in the product-reimagination phase below** —
  `bookingExpiry.service.ts` now sweeps them into `EXPIRED`.
- `getDispatchAnalytics`/geo-scoping for still-searching bookings is a
  best-effort pincode join, not a real FK, because an unassigned booking
  has no worker (hence no federation) to scope through yet — see the
  schema comment on `Booking.eligibleWorkerCount`.


## Product-reimagination phase — one matching engine, real impact data,
## notifications, service detail, lifecycle completion (done)

A follow-up directive ("PRODUCT REIMAGINATION + FULL IMPLEMENTATION")
asked for a full audit against the SIH statement plus modern
commerce/delivery/mobility UX patterns, then execution in P0→P3 order.
The audit found the backend fundamentally sound — the dispatch race, OTP
lifecycle and Part F split were all correct — so this phase is about
**integrity, consolidation and unbuilt surface**, not rewriting.

### P0 — correctness (done, verified against live data)

- **Two divergent implementations of dispatch eligibility, now one.**
  `dispatch.service.ts`'s `findEligibleWorkers` (socket broadcast) and
  `booking.controller.ts`'s `listIncomingRequests` (worker's REST feed)
  applied the pincode rule differently. Concretely: when a booking's
  pincode matched no society, the broadcast fell back to a 25 km radius
  and pushed the job to nearby workers, while the REST feed returned
  `false` for any worker who *had* a society pincode — so a worker got
  the push and then could not find the job in their own list.
  Root cause: the old rule was **collective** ("if ANY worker covers this
  pincode, only pincode-matchers are eligible"), which cannot be
  evaluated for one worker in isolation, so every call site holding a
  single worker had to approximate it — and the approximations disagreed.
  Fix: new `backend/src/services/matching.service.ts` is the single
  source of truth, and the rule is now strictly **per-worker**:
  `verified && AVAILABLE && skill && (pincodeMatch || within 25km)`.
  Pincode did not stop mattering — it moved from a hard gate to the
  dominant ranking signal (40 of 100 points in `scoreWorker`), which is
  what Requirement 4 actually asks for. Verified: a `411999` booking
  (matching no society) now appears in the worker's feed; an in-area
  `411038` booking scores 90 vs 50 and ranks first.
- **`acceptBooking` had a TOCTOU race letting one worker hold two jobs.**
  The atomic `updateMany` claim protected "one booking → one worker", but
  the worker's availability was only a **read**, and BUSY was set *after*
  the claim. Two accepts by the same worker on two different bookings
  both passed the read, both claimed their own booking, and both set
  BUSY. Not hypothetical — worker `9000000121` was found holding two live
  bookings in this database. Fix: the worker's `AVAILABLE → BUSY`
  transition is now itself a conditional `updateMany` taken *before* the
  booking claim, released back to AVAILABLE if that claim then loses.
  Worker lock first (not booking first) because releasing a worker is
  purely local, whereas un-claiming a booking would race every other
  accepter. Verified: 6 concurrent accepts by one worker across 2
  bookings → exactly 1 success, worker holds exactly 1 live booking.
  (The original booking-level race is unaffected — re-verified at 12
  concurrent accepts → 1 × 200, 11 × 409.)
- **Fabricated impact stats removed.** The customer home screen shipped
  hardcoded literals — "1,248 workers supported", "₹8.4L welfare",
  "18,420 services completed" — as the centrepiece of the cooperative
  trust claim. New `GET /api/impact` computes all of it from real rows
  (currently 21 verified workers / 134 completed / ₹1,881 welfare /
  87.1% avg worker share). The card renders only once the data arrives,
  so it can never show a placeholder.
- **Dead code removed.** `GET /workers/nearby` + `getNearbyWorkers` had
  zero callers since `WorkerSearchScreen` was deleted in the dispatch
  phase. Its rating-tiebreak logic was also the *only* consumer of
  `Worker.ratingAvg` in matching, so Requirement 6's "rating feeds match
  ranking" had silently become false. Rating is now a real 20-point
  factor in `scoreWorker`.
- **Service coverage unified.** `service.controller.ts` had a third copy
  of "is a worker near here"; it now calls the shared `isEligible`, with
  `loadCandidates(..., { includeUnavailable: true })` marking the one
  intentional difference (a service is still *offered* when local workers
  are momentarily mid-job).
- **Indexes added** for every hot path (Phase 33): `Worker
  [verificationStatus, availability]` / `[societyId]`, `Booking
  [status, workerId]` / `[customerId, createdAt]` / `[workerId,
  createdAt]` / `[workerId, assignedAt]` / `[servicePincode]` /
  `[scheduledAt]`, `Society [pincode]`, `CustomerAddress [customerId]`,
  `WelfareFundTransaction [workerId, createdAt]` / `[welfareFundId,
  createdAt]`, `Service [category]`.

### Fair allocation (Requirement 12 / §40)

`scoreWorker` is an explainable 0-100 score over named factors —
pincode 40, distance 30, rating 20, workload 10 — rather than tuned magic
constants, so a new signal (reliability, acceptance rate, certification
depth) is added by extending one function. Two deliberate calls:
unrated workers score at the *midpoint* rather than zero (otherwise a new
worker could never rank well enough to get a first job), and
`jobsToday` pushes an already-busy worker down so work spreads across the
society instead of concentrating on whoever wins every other axis.
**Not built:** staged/tiered broadcast (offer to the top N first, widen
after a delay). Every eligible worker is notified at once, because
first-accept-wins *is* the fairness mechanism here — withholding a
request from lower-ranked workers would quietly turn ranking into
rationing. Rank is carried in the payload so feeds can order by it.

### P1 — required functionality (in progress)

- **Notifications, end to end (§19).** New `Notification` model +
  `notification.service.ts` + `GET/POST /api/notifications`. Persisted
  first, pushed second: a customer whose phone was locked when their
  professional arrived is exactly the one who most needs the record, so
  a failed socket emit never fails the write. Wired into every lifecycle
  transition — booking confirmed / no worker found, new request to each
  eligible worker, assigned, on the way, arrived, started, completed,
  earnings + welfare credited, payment received, rating reminder,
  cancellation (to the party who *didn't* cancel, plus the federation
  when a worker drops an assigned job), reschedule, and the two
  operations events an admin can act on (emergency, unassigned).
  Every socket now also joins a `user:<userId>` room — the existing role
  rooms address someone by what they are *for a booking*, notifications
  are per-person. Mobile: `NotificationContext` (single source for the
  badge and the list), `NotificationsScreen`, `NotificationBell` on both
  home screens, deep-linking to `BookingTracking` (customer) or
  `JobDetail` (worker). Verified end to end: a full lifecycle run
  produced 9 customer + 3 worker notifications in the right order, and
  cross-user isolation holds (marking another user's notification → 404).
- **Service detail page (§12).** `Service` gained `description`,
  `durationMin/MaxMinutes`, `inclusions`, `exclusions`; new
  `GET /services/:id` returns those plus `completedCount`, `ratingAvg`,
  `ratingCount` and recent reviews. This closed a real gap: **ratings
  were write-only** — collected on every completed booking, averaged into
  `Worker.ratingAvg`, and then read by nothing a customer could see.
  New `ServiceDetailScreen` (sticky CTA, inclusions/exclusions, real
  reviews, cooperative trust block) sits between the catalog and the slot
  picker. `ratingAvg` is `null` rather than `0` when nothing is rated —
  an unrated service and a 0-star service are very different claims.
- **Cancellation accountability + rescheduling + expiry (§18).**
  `Booking` gained `cancellationReason` / `cancelledByRole` /
  `cancelledAt` (role taken from the authenticated actor, never the
  request body) and `originalScheduledAt` / `rescheduleCount`. New
  `POST /bookings/:id/reschedule`, allowed only while `REQUESTED` or
  `ASSIGNED` — once a worker is `ON_THE_WAY`, moving the slot would
  strand someone already travelling, so that is a cancel-and-rebook.
  New `bookingExpiry.service.ts` sweeps stale `REQUESTED` bookings into
  `EXPIRED` (previously nothing ever produced that enum value, so a
  booking nobody accepted searched forever).

### New known gaps (surfaced, not silently patched)

- **`prisma/seed.ts` is not idempotent** — it creates rows
  unconditionally, so re-running it against a populated database
  duplicates every federation, worker and booking. The service catalog
  was therefore extracted to `prisma/data/services.ts` (single source of
  truth) with `prisma/backfill-services.ts` to update content on an
  existing database without losing the booking history the forecast and
  welfare ledger are built from.
- **Booking expiry is an in-process `setInterval`**, not a job queue —
  fine for one backend process, and the sweep is idempotent, but move it
  behind a real scheduler before running multi-instance.
- **Decline is still client-only** (unchanged from the dispatch phase).
- **Notification delivery is in-app only** — no push (APNs/FCM), no
  email/SMS. The persistence + fan-out layer is real; the transport to a
  backgrounded phone is not.


### Completion pass — i18n, navigation audit, forecast coherence (done)

Finishing pass over the phase above. Everything below was found by
re-auditing the working tree, not by trusting the previous session's notes.

**Genuinely dead code removed.** `EmergencyAlertScreen.tsx` was an 18-line
`TODO(Phase 4)` stub with **zero references anywhere** — superseded by
JobFeedScreen's inline emergency card. Deleted, along with its now-orphaned
`worker.emergencyAlertTitle` key. (`ChatScreen`'s low `t()` count turned
out to be correct, not a gap: it has exactly one user-facing string.)

**i18n finished and verified structurally.** 83 keys → **259 keys, identical
across en/hi/mr**, with every screen translated (`OnboardingStatusScreen`
was the last real gap). A verification script asserts three things on every
run: locale parity, that every literal `t("…")` key exists, and that every
dynamic key family (`home.why${…}Title`, `bookings.${segment}`,
`address.label${l}`, skill/step label maps) resolves for all its possible
values. 27 dead keys (81 entries across three locales) left over from the
removed password-login and the deleted `WorkerSearchScreen` were pruned.

**i18next pluralization deliberately avoided.** i18next 23 resolves
`_one`/`_other` through `Intl.PluralRules`, which Hermes ships only
partially; a missing implementation fails silently by rendering the raw
key. Explicit `notifiedOne`/`notifiedMany` keys are selected in code
instead — consistent with `formatCurrency`, which already guards `Intl`.

**Real bugs found and fixed in this pass:**
- **Infinite spinner on failure** in both lifecycle hubs.
  `BookingTrackingScreen` and `JobDetailScreen` had no `.catch`: a failed
  fetch set `loading = false` with `booking` still `null`, and the guard
  was `if (loading || !booking) return <LoadingState/>` — so the screen
  span forever, *and* the rejection was unhandled. Both now have an error
  state with retry. Same missing-catch pattern fixed in `WorkerHomeScreen`,
  `JobFeedScreen`, `ChatScreen`, and `NotificationContext`. A scan now
  reports zero unhandled rejections and zero `.then` without `.catch`.
- **Worker Profile tab's notifications were a dead end.** It registered the
  bare `NotificationsScreen` with no `onOpenBooking`, so a booking
  notification tapped there marked itself read and navigated nowhere (the
  Home/Jobs tabs deep-linked correctly). The Profile stack now uses the
  same wrapper and carries `JobDetail`/`Chat`.
- **Duplicate skills in the database.** Worker `9000000506` held
  `{technician, technician}` — the seed's `pick(skills)` could return the
  primary skill again. That produced a duplicate React key wherever skills
  are mapped, and a doubled chip. Fixed at all three layers: the seed
  excludes the primary from the secondary draw, `createWorker` dedupes at
  the API boundary (skills/certifications are `String[]` with no DB
  uniqueness constraint, so no client should be able to persist a
  duplicate), and the existing row was repaired.
- **Incoherent AI forecast.** `cleaner` reported *0 predicted bookings*
  while still recommending *1 worker*. Two causes: Python's banker's
  rounding made `round(0.5)` = 0 (the same gotcha already documented in
  this file), and `recommendedWorkers` was derived from `daily_avg`
  independently of the rounded demand figure shown beside it. Now rounds
  half-up (matching JS `Math.round`) and staffs zero when demand rounds to
  zero. Each row also carries `dailyAverage` + a `basis` string
  ("11 booking(s) in the last 14 days = 0.79/day; at 2 jobs per worker per
  day"), rendered under the recommendation in `DemandForecastWidget` —
  master prompt §24's "make the recommendation explainable".

**Home screens completed against the brief.** Customer home was missing
any view of an in-flight booking; it now surfaces the active booking above
the catalog (status badge, assigned professional or "finding…", tap to
track). Worker home was missing the three things a working professional
most needs: it now leads with an **active-job card**, and adds upcoming-job
count and the worker's own rating alongside today's jobs/earnings/welfare.

**Design system.** Zero hardcoded colors remain outside `theme/tokens.ts`
— the `Avatar` placeholder palette was seven hand-copied hex literals that
were already token values (now `avatarPalette`, derived from `colors`), and
one stray `rgba(255,255,255,0.15)` became `colors.overlayOnDark`.

**Environment fix:** the repo move to `SIH/UrbanCompanyX/` left
`ai-service/.venv` with stale absolute shebangs pointing at the old path,
so `uvicorn` failed with "bad interpreter". Repaired in place. Note the
ai-service must use **its own** `.env` — `backend/.env`'s `DATABASE_URL`
carries Prisma's `?schema=public`, which psycopg2 rejects outright.

### Verification run this pass

- `tsc --noEmit` clean: backend, mobile-app, admin-web. `admin-web` Vite
  build clean. `ai-service` compiles; `/docs` responds 200.
- Expo/Metro Android bundle succeeds (2.78 MB).
- **29/29 end-to-end dispatch checks** (`scratchpad/e2e.py`): customer books
  a service with no worker chosen → 9 simultaneous accepts across 3 workers
  yield exactly 1 × 200 and 8 × 409, with the *database* confirming one
  assigned worker → lifecycle transitions, illegal `ARRIVED→COMPLETED`
  refused → OTP gates (wrong OTP 400, worker reading the customer's OTP
  403) → completion frees the worker → rating, duplicate rating 409 →
  Part F split exact.
- Demo OTP: all **13** demo accounts accept `0000`; a non-demo number is
  rejected (401). No `0000` exists anywhere in the app's logic — the only
  frontend occurrence is explanatory text on the login screen.
- Emergency fairness rule re-verified: base ₹500 → bonus ₹100, fee ₹50 and
  welfare ₹15 computed off base only, worker ₹535 — the surge reaches the
  worker intact.
- All 12 SIH requirements return real data from live endpoints.

**Test harness note:** the first end-to-end script was written in shell and
produced six spurious failures — nested quoting stripped the braces from
the JSON bodies (`body: '"otp":""'` in the server log), which looked
exactly like backend 500s. Rewritten in Python (`scratchpad/e2e.py`); all
29 checks then passed against unchanged application code. Worth
remembering before trusting a shell-based API test.


## V2 product-excellence pass (done)

Polish pass over a verified-working system. The 29-check dispatch
regression was the stated baseline and **remained 29/29 throughout**; a
second suite (`scripts/v2-verify.py`, 34 checks) now guards what V2 added.

### Design system

`theme/tokens.ts` gained **semantic aliases** (`primaryForeground`,
`accent`, `onPrimarySurface`, `shadowTint`, `skeleton`), a `layout` block
carrying accessibility invariants (`minTouchTarget: 44`), and a `type.label`
micro-label. Shadows previously hardcoded `#0A231D` and now read
`colors.shadowTint`. Zero hardcoded colours remain outside the token file.

New shared components, each replacing per-screen duplication:
`Skeleton` (Block/Card/Row/List, Animated with `useNativeDriver` so the
pulse costs nothing on the JS thread while data loads), `BookingTimeline`,
`TrustBadge`/`TrustList`, `MapPanel`, `RequestCard`. `Card` now forwards
`accessibilityRole`/`accessibilityLabel` so a tappable card announces
itself as one action instead of leaking its inner `Text` nodes.

### Backend additions (all additive; no business rule touched)

- `GET /services` now returns `ratingAvg` / `ratingCount` /
  `completedCount` per service, via **two grouped queries** rather than
  per-row counts — the catalog renders every service at once, so per-row
  would be N+1 on the most-loaded screen.
- `GET /services/:id` returns a `pricePreview` for both standard and
  emergency, computed by **the same `computeWageSplit` the booking uses**.
  A hand-rolled preview would be free to drift from what is actually
  charged, which is the one thing this product cannot get wrong.
- `GET /bookings/dispatch/incoming` returns expected duration — a worker
  deciding whether to accept needs to know what they are committing their
  afternoon to, not only what it pays.
- `GET /federations/:id/dashboard` returns operations health:
  `completionRatePercent`, `avgCustomerRating`, `unservedBookings`,
  `pendingVerification`. Both rates are `null` rather than a flattering
  default when nothing has finished — an untested completion rate is not a
  perfect one.
- `GET /bookings` now includes `rating` and `payment`. **Bug fixed:** the
  bookings list had no way to tell a rated booking from an unrated one, so
  it re-prompted for a rating the customer had already given.

### Customer experience

Home leads with location, then search, categories, emergency, the active
booking, and a real cooperative-impact strip. Service cards read as
products (rating, completions, duration, price, trust line) and load as
skeletons rather than a spinner, so layout no longer jumps when data lands.
Service detail gained **How it works** (the honest answer to "why can't I
pick my own professional"), a **Where your money goes** split from the
server preview, FAQs, and an explicit empty state for reviews. The active
booking screen now leads with a worker card (avatar, verified, rating) over
a shared connected timeline. Bookings gained an **Active** tab —
distinguishing "something is happening now" from "merely scheduled" — and
**Book again**.

### Worker experience

`RequestCard` is now one component used by both Home and the Jobs feed,
which had already drifted: the two showed different fields and only one was
translated. Expected earnings lead the card, since knowing the pay *before*
accepting is the cooperative's whole proposition. `JobDetailScreen` shares
the customer's timeline component, so the two sides can no longer describe
the same booking differently.

### Maps — deliberately not faked

`MapPanel` renders the two endpoints it genuinely knows and states its own
limitation. There is no map provider and no live position stream, so it
draws **no route and no moving pin**: inventing movement would be the most
misleading thing this product could do, because a customer would use it to
decide when to come to the door. Props are already shaped for a real
provider (two coordinates + status), so swapping one in is a change to that
file alone.

### AI forecast

Each row now carries `demandLevel`, `trendPercent`, `reason`, and
`baselineDailyAverage` — comparing the 14-day window against the full
60-day history behind it (comparing it to itself would make the trend zero
by construction). The admin widget renders a demand pill plus
"Demand is 63% above the recent daily average."

### Multilingual

323 keys x 3 locales, in parity, no missing or orphaned keys. A length
audit found 8 translations exceeding 1.6x their English source; the two
that sit on CTAs were addressed at the component level — `Button` labels
now wrap to two centred lines with `adjustsFontSizeToFit`, rather than
clipping mid-word.

### Accessibility

`Button` carries a 44pt minimum height. A scripted audit found 8 bare
touchables; 4 wrapped whole cards (fine) and 4 were small text links and
star controls, which gained `hitSlop` and proper roles — the rating stars
now expose `accessibilityRole="radio"` with selected state.

### Verification

- `tsc --noEmit` clean x3; admin Vite build clean; ai-service compiles.
- Expo Android bundle 2.81 MB, clean.
- `scripts/e2e-verify.py` **29/29** (unchanged baseline).
- `scripts/v2-verify.py` **34/34** — including a live check that the
  emergency surge still reaches the worker intact through the new preview
  endpoint, and that no forecast row predicts zero demand while asking for
  workers.

### Known limitations

- **Service packages are not modelled.** The brief asks for them; the
  schema has no package concept, and inventing one in the UI would be
  hardcoding data to look complete. Left out rather than faked.
- No live GPS, no map provider, no push notifications (in-app only), and
  Razorpay is still in mock mode — all unchanged from the previous phase
  and all requiring external credentials or native modules.
- Search is still a client-side filter over the loaded catalog; there is no
  recent/popular-search history (nothing persists searches yet).


## V3 product-completion pass (done)

Closes the two gaps V2 explicitly declined to fake, plus a design-system
correction found by consulting the UI/UX Pro Max skill. Baselines held
throughout: **e2e 29/29, v2 34/34, v3 40/40**.

### Service packages (the headline V2 gap)

V2 left packages out because the schema had no package concept and
inventing one in the UI would have been hardcoding data to look complete.
Now modelled properly.

New `ServicePackage` (name, tier, description, price, duration,
inclusions, isDefault), `@@unique([serviceId, name])` so the backfill can
upsert idempotently. `Booking.packageId` is **nullable** — every historical
booking has none and falls back to `Service.basePrice`, so nothing existing
broke. 18 packages seeded via `prisma/data/packages.ts`, sharing the
services.ts pattern; each service's cheapest tier equals its existing
`basePrice`, which keeps that column truthful as the catalogue's
"starting from" figure with no second constant to sync.

**Pricing stays server-authoritative.** The client sends a `packageId` and
never a price; the server resolves the package, rejects one belonging to a
different service (400) or an unknown id (404), and feeds the resolved
price into the *same* `computeWageSplit`. There is still exactly one
implementation of the fairness rule. Verified: Premium ₹949 → fed ₹94.90,
welfare ₹28.47, worker ₹825.63; emergency surge ₹189.80 reaches the worker
intact with fee and welfare still computed off the package base.

`GET /services/:id` returns a per-package `pricePreview` (standard and
emergency), so the app renders the split rather than doing arithmetic.

**Bug found while wiring this:** the invoice printed
`lineItems.basePrice = service.basePrice`, which became wrong the moment a
booking was priced off a package. Now derived from the booking's own
recorded `totalAmount - emergencyBonus` — a service or package can be
re-priced later, but an invoice must restate what was actually charged.

### Server-side worker decline (the other declared limitation)

Decline was client-only: the card vanished for that session and returned on
the next load, and the federation had no record. New
`BookingWorkerResponse` (ACCEPTED/DECLINED, optional reason,
`@@unique([bookingId, workerId])` so re-declining updates rather than
stacking). `POST /bookings/:id/decline` records it; the dispatch feed
excludes that worker's declines permanently.

Critically it **does not touch the booking** — it stays `REQUESTED` and
every other eligible worker keeps seeing it. All four properties are
asserted in v3-verify: gone from this worker's feed, persisted, booking
still REQUESTED, still visible to others, idempotent, one row per worker.

### Design system — emoji removed as structural icons

The UI/UX Pro Max skill flags this as HIGH severity: emoji are
font-dependent (a "🛠️" renders differently on every OS and Android vendor
skin), cannot take a colour from the design tokens, and don't scale with
the type ramp. The app used them throughout — category icons, notification
types, trust badges, map pins, rating stars, timeline ticks.

New `theme/icons.ts` holds the whole vocabulary: an `IconName` type,
`iconSize` tokens (xs/sm/md/lg/xl/hero), category and notification maps,
and named roles. Migrated to Ionicons (already bundled with Expo, already
used by the tab bar). **Zero emoji remain in any `.tsx`.** Typing
`ServiceCard.icon` as `IconName` meant the compiler found every remaining
call site rather than relying on a grep.

Decorative icons carry `accessibilityElementsHidden` so a screen reader
reads the label, not the glyph beside it.

### Other V3 work

- **Serviceability is now three states, not two** (§16). `coverage` (is
  the area served at all) and `availableWorkerCount` (can anyone start
  now) are separate. "Available here — everyone's on a job" is a different
  message from "not available in this area yet", and the first no longer
  masquerades as the second.
- **Safe-area compliance.** `ServiceDetailScreen`'s sticky CTA ignored
  bottom insets and would sit under the home indicator; it now uses
  `useSafeAreaInsets`, and the scroll view reserves `layout.stickyBarClearance`
  so the last card is never trapped behind it.
- **`ServicePackageCard`** is a real radio group (`accessibilityRole="radio"`,
  selected state, "n of m" hint) built on `Pressable` per the react-native
  guidance, with a pressed style that changes colour only — selecting a
  tier can never shift layout.
- **Error middleware finished.** It carried a stale `TODO(Phase 1)` and
  turned every throw into a generic 500. Now classifies Prisma P2025→404,
  P2002→409, P2003→400, validation→400, supports an explicit `HttpError`,
  guards `res.headersSent`, and only stack-traces genuine 5xx so real
  faults aren't buried under mistyped-id noise.

### Security audit (adversarial, in v3-verify)

All refused server-side: worker creating a booking (403), unrelated worker
reading another's booking (403), worker reading the customer's OTP (403),
non-customer rating (403), customer reading the admin dashboard (403),
customer forcing `COMPLETED` (400), unauthenticated access (401), unknown
packageId (404), cross-service package (400), and a worker without the
skill accepting (403, booking untouched).

### Concurrency at scale

2, 5, 10 and 20 simultaneous accepts each produce exactly one 200 and one
assigned worker in the database. With fewer eligible workers than calls,
each worker fires repeatedly, which also exercises the same-worker
double-accept guard added earlier.

**Test-harness note:** the first run failed at n=2 and n=5 with *zero*
winners. That was the test, not the app — it raced electricians against a
technician booking, so every call was correctly refused by the skill gate.
Fixed to race skill-matched workers, and the skill gate is now asserted
explicitly as its own check.

### Verification

- `tsc --noEmit` clean x3; admin Vite build clean; ai-service compiles.
- Expo Android bundle 2.83 MB, clean.
- i18n **331 keys x 3 locales**, parity holds, no missing keys.
- Zero hardcoded colours outside `tokens.ts`; zero emoji icons.
- Navigation audit: 24 routes, 14 navigate targets, **zero unregistered**.

### Remaining limitations (genuine infrastructure only)

- No live GPS, no route calculation, no map provider — `MapPanel` draws the
  two endpoints it knows and states its own limitation rather than
  animating a fake pin.
- No push notifications (in-app inbox only), no real SMS, Razorpay in mock
  mode. All require credentials or native modules.
- Search remains a client-side filter with no persisted recent/popular
  history.


## V4 polish + demo-readiness pass (done)

Polish only — no new features. Baselines held: **e2e 29/29, v2 34/34,
v3 40/40**.

### The significant bug: bookings created before the customer confirmed

`FairPricingBreakdownScreen` created the booking in a mount effect and
*then* offered a "Confirm and pay" button. Simply opening the confirmation
screen produced a live `REQUESTED` booking, broadcast to every eligible
worker. A customer who backed out left workers chasing a job nobody wanted.
Reproduced before fixing: opening the screen created a booking broadcast to
4 workers, and it was still visible in a worker's feed afterwards.

Rewritten to render a **server-computed preview** (the same per-package
`pricePreview` the detail screen uses) and create the booking only when the
customer actually taps Confirm — so dispatch fires at the moment of
commitment. Navigation to Checkout uses `replace`, since going "back" to a
confirmation screen for a booking that now exists would offer to create it
twice.

The screen also gained the summary the customer needs to check what they
are paying for: service name, package, date/time and service address, above
the split. It previously showed numbers with nothing tying them to the
booking.

### Keyboard handling (UI/UX Pro Max, HIGH)

Five screens with text inputs rendered a bare `ScrollView`. On a small
phone the keyboard covered the lower fields *and the submit button*, with
no way to scroll to them — the address form was literally unfinishable.
New shared `FormScreen` wraps `KeyboardAvoidingView` + `ScrollView` with
`keyboardShouldPersistTaps="handled"` (so a first tap activates a button
instead of only dismissing the keyboard). The iOS/Android `behavior`
difference lives in that one component.

### Emoji eliminated from the admin too

V3 removed emoji from the mobile app but left the admin using them for
**sidebar navigation icons** — the skill's worst case. Added `lucide-react`
(one dependency, for a HIGH-severity rule) and migrated the sidebar, empty
states, KPI accents and the emergency banner. **Zero emoji remain in either
app.**

### Localisation completed

36 more hardcoded English strings found and translated — most importantly
the worker's **entire lifecycle CTA set** ("Start navigating", "I've
arrived", "Start service", "Complete service") and both OTP prompts, which
had been English-only in a trilingual product aimed at workers most likely
to need Hindi/Marathi. Now **393 keys x 3 locales**, parity verified, and a
scan reports **zero** hardcoded user-visible strings in any `.tsx`.

Note: the earlier scan missed the OTP prompts because its character class
excluded digits ("4-digit"). Widened, then re-run to zero.

### Other V4 fixes

- **Empty states now offer a recovery path** (skill: "show helpful message
  and action"). All six previously dead-ended. `EmptyState` gained an
  optional action; bookings → browse services, saved addresses → add one.
  Left optional so states with genuinely nothing to do stay uncluttered.
- **All five admin tables** rendered without a scroll container and would
  push the page sideways on a tablet. Each now scrolls inside
  `overflow-x-auto` with a `min-w` that keeps columns legible rather than
  squashing them.
- Admin `EmptyState` and `KpiCard` gained typed icon props; decorative
  icons carry `aria-hidden`.

### Deliberately not done

- **Blanket list memoization.** The skill flags inline `renderItem`, but
  these lists are virtualized and at most ~60 rows; the brief says optimize
  only where there is a real problem, and there isn't one here.
- The worker job screen's CTA state machine was audited and left alone — it
  already shows exactly one CTA per lifecycle state, and cancel only
  appears pre-service.

### One test assertion corrected (not weakened)

`v3-verify`'s final check is labelled "no active test bookings left
behind" but asserted a *global* zero, so it failed whenever any unrelated
booking was open. Scoped to the suite's own `V3 %` fixtures so it tests
what its label claims.

### Verification

`tsc` clean x3; admin Vite build clean; ai-service compiles; Expo bundle
2.84 MB. i18n 393 keys x 3 in parity, zero missing. Zero hardcoded colours.
Zero emoji icons in either app. Navigation audit clean.
