# SIH26089 — Cooperative Gig Services Platform
## FINAL Development Specification (Requirement-Complete, User-Centered)

> This is the single source of truth to hand to Claude Code. It supersedes the two earlier docs by adding full requirement traceability — every line of the PS is mapped to a concrete, user-visible feature, not just a backend capability. Nothing in the PS's "Expected Solution" list is optional; each is engineered here as something a judge can actually see and interact with in the demo.

---

## PART A — REQUIREMENT TRACEABILITY MATRIX

This is the checklist judges will literally use. Every row = something that must be visibly demoable, not just present in code.

| # | PS Requirement (verbatim) | Feature | Who sees it | User-facing manifestation (not just backend) |
|---|---|---|---|---|
| 1 | Service provider registration and verification | Worker onboarding + federation verification | Worker, Federation Admin | Worker sees a "Verified by [Federation Name]" badge on their own profile once approved; customers see the same badge on every worker card before booking — verification must be *visually present at the point of trust decision*, not buried in a settings page |
| 2 | Worker skill profiling and certification | Skill tags + certificate upload | Worker, Customer | Worker profile shows skill chips + certificate icons (tap to view); customer search/filter is driven by these tags, so the skill profile is functionally load-bearing, not decorative |
| 3 | Customer booking and scheduling system | Service catalog → slot picker → confirm | Customer | Standard calendar/time-slot UI; must show **estimated worker earning for this slot** at booking time (see Requirement 12 below — this is where fairness becomes visible to the *customer*, not just the worker) |
| 4 | Geo-location based service matching | Nearest-verified-worker matching | Customer, Worker | Customer sees a map with nearby available workers + ETA; worker sees incoming job requests ranked by distance. Same-federation/society workers are surfaced first — **this is the "local cooperative trust" story made visible**, not an invisible query optimization |
| 5 | Digital payments and invoicing | Razorpay checkout + PDF invoice | Customer, Worker | Customer gets a checkout screen showing itemized invoice; **invoice explicitly itemizes worker share, federation fee, and welfare contribution as three separate line items** — this single invoice screen is your strongest "fair wages, not opaque commission" proof point |
| 6 | Rating and feedback mechanism | Post-job star rating + comment | Customer, Worker | Standard rating flow; worker's profile shows aggregate rating publicly, which feeds back into their visibility in matching (better-rated workers surfaced higher — meritocratic, not pay-to-rank like some private platforms) |
| 7 | Worker welfare and insurance integration | Auto-accruing welfare fund per completed job | Worker, Federation Admin | Worker app has a dedicated **"My Welfare" tab** showing running balance, contribution history per job, and (mocked) insurance coverage status — this must be a first-class navigation destination, not a hidden ledger entry |
| 8 | Emergency and on-demand service booking | Priority "Book Now" flow, no schedule needed | Customer, Worker | A visually distinct "Emergency" button/flow on the customer app; matched worker gets a high-priority push-style alert. **Fairness rule enforced here**: any urgency premium charged to the customer flows proportionally to the worker's share, never absorbed entirely as platform fee — must be shown on the same itemized invoice as Requirement 5 |
| 9 | Cooperative federation administration dashboard | Web dashboard: worker mgmt, bookings, welfare fund, forecast | Federation Admin | Full web dashboard — worker verification queue, live booking oversight, welfare fund balance + disbursement log, demand forecast widget (Requirement 11) |
| 10 | Multilingual mobile application | i18n across customer + worker apps | Customer, Worker | Language switcher visible on first launch and in settings; minimum English + 2 regional languages, applied to all core flows (booking, earnings, welfare) — not just static labels, but also formatted currency/date per locale |
| 11 | AI-based demand forecasting and workforce allocation | 7-day forecast per federation/service | Federation Admin | Dashboard widget: bar chart of predicted demand per service category next 7 days, with a "Recommended worker allocation" suggestion — must render as an actual chart, not a text summary, for demo impact |
| 12 *(implied by Problem Statement text, not a bullet — but explicitly graded)* | "Ensuring fair wages, worker welfare, and consumer trust" | Wage transparency + trust signals woven through every screen | All three personas | This is not a single feature — it's a design principle. It must appear at minimum in: (a) the booking confirmation screen (customer sees wage split before paying), (b) the worker earnings screen (worker sees exact split logic, not just a lump sum), (c) the federation dashboard (admin sees aggregate fairness metrics — e.g., "avg. worker share % this month") |

**Rule for Claude Code while building:** if a feature exists only in the database/API and has no corresponding screen a judge can tap through, it does not count as "covered" for evaluation purposes. Every row above needs a UI element, not just a working endpoint.

---

## PART B — USER-END EXPERIENCE DESIGN (the part most teams skip)

Most competing teams will implement fairness/welfare as backend business logic and never surface it. That's the gap you're closing. Concretely:

### Customer journey — where trust/fairness must be visible
1. **Search/browse workers** → verification badge + rating + skill tags visible on every card (not just in a detail view)
2. **Select service + slot** → before confirming, show a **"Fair Pricing Breakdown"** card: total price, worker's share (as ₹ and %), federation fee, welfare contribution. This is a deliberate UI moment, not an afterthought on a receipt.
3. **Emergency booking** → same breakdown card appears even for urgent bookings, showing that surge amount also increases the worker's share proportionally
4. **Post-payment** → invoice (PDF or in-app) repeats the same itemization
5. **Post-job rating** → optional micro-copy: "Your rating affects [Worker Name]'s visibility for future jobs — cooperative workers are ranked by service quality, not by platform fees paid."

### Worker journey — where welfare/fairness must be visible
1. **Onboarding** → clear verification status stepper ("Submitted → Federation Review → Verified")
2. **Job feed** → each job card shows the exact earning for that job *before* accepting (not after)
3. **Earnings tab** → running total + per-job breakdown identical in structure to the customer's pricing card, so both sides see the same number
4. **Welfare tab** → dedicated screen: welfare fund balance, per-job contribution log, insurance status (mocked but visually complete)
5. **Emergency job alert** → shows the boosted earning explicitly, framed as "Emergency bonus: +₹X added to your share"

### Federation Admin journey — where oversight/impact must be visible
1. **Dashboard home** → aggregate cards: total workers, active bookings, welfare fund balance, **average worker earning share %** (a fairness KPI, not just revenue)
2. **Worker verification queue** → simple approve/reject with skill/certification review
3. **Welfare fund ledger** → transaction log, filterable by worker
4. **Demand forecast widget** → chart + allocation recommendation (Requirement 11)

**Why this matters for evaluation:** SIH panels for a cooperative-ministry PS are specifically primed to check whether "fair wages, worker welfare, and consumer trust" (the PS's own words) show up as *experienced* outcomes, not just claimed ones. A judge tapping through your app should be able to point at a specific screen and say "this is where fairness is enforced" — that's the bar.

---

## PART C — SYSTEM ARCHITECTURE

```
┌─────────────────┐   ┌─────────────────┐   ┌──────────────────────┐
│  Mobile App       │   │  Mobile App      │   │ Federation Dashboard │
│  Customer role    │   │  Worker role     │   │   (React/Vite, web)  │
│  (React Native/   │   │ (React Native/   │   │                      │
│   Expo — 1 app,   │   │  Expo — same app)│   │                      │
│   role-routed)    │   │                  │   │                      │
└────────┬─────────┘   └────────┬─────────┘   └──────────┬───────────┘
         │                      │                          │
         └──────────────┬───────┴──────────────────────────┘
                         │  REST API (JWT auth, role-scoped)
                ┌────────▼─────────┐
                │  Node.js/Express  │
                │  Backend API      │──────────┐
                └────────┬──────────┘          │
                         │                      │  internal call
              ┌──────────▼──────────┐  ┌────────▼─────────┐
              │  PostgreSQL+PostGIS  │  │ Python AI service │
              │  (Prisma ORM)        │  │ (FastAPI, demand  │
              └───────────────────────┘  │ forecasting)      │
                         │                └────────────────────┘
              ┌──────────▼──────────┐
              │  Razorpay (test)     │
              │  Socket.io (realtime)│
              └───────────────────────┘
```

**Stack:**

| Layer | Choice | Why |
|---|---|---|
| Customer & Worker app | **React Native + Expo**, single app, role-based navigation post-login | Field-facing roles need real mobile; one Expo project halves setup time vs. two separate apps; demoable instantly via Expo Go QR scan |
| Federation Admin | **React + Vite + TailwindCSS** (web) | Institutional/office use fits web; matches "administration dashboard" wording in PS |
| State/data | **TanStack Query** | Consistent async handling across RN and web |
| Backend | **Node.js + Express + TypeScript** | Fast to scaffold, consistent codegen for Claude Code |
| DB | **PostgreSQL + PostGIS** | Native geo-distance queries for Requirement 4 |
| ORM | **Prisma** | Type-safe schema + migrations + seed scripts |
| Auth | **JWT** (access + refresh), roles: CUSTOMER / WORKER / FEDERATION_ADMIN | Standard, demoable |
| Payments | **Razorpay test mode** | No real money needed; itemized order creation supports Requirement 5/12 |
| Geo | **Mapbox GL JS / Google Maps SDK** + PostGIS `ST_Distance` | Requirement 4 |
| Realtime | **Socket.io** | Emergency booking alerts (Requirement 8) |
| i18n | **react-i18next**, English + 2 regional languages minimum | Requirement 10 |
| AI forecasting | **Python FastAPI microservice**, simple moving-average or Prophet | Requirement 11, kept isolated and scoped |
| Welfare/Insurance | Internal ledger table, mocked insurance webhook | Requirement 7, fully demoable without a real partner |

---

## PART D — DATA MODEL (Prisma schema)

```prisma
model Federation {
  id            String   @id @default(uuid())
  name          String
  region        String
  createdAt     DateTime @default(now())
  societies     Society[]
  welfareFund   WelfareFund?
}

model Society {
  id            String   @id @default(uuid())
  name          String
  federationId  String
  federation    Federation @relation(fields: [federationId], references: [id])
  workers       Worker[]
}

model User {
  id           String   @id @default(uuid())
  name         String
  phone        String   @unique
  role         Role
  language     String   @default("en")
  passwordHash String
  worker       Worker?
  bookingsAsCustomer Booking[] @relation("CustomerBookings")
}

enum Role {
  CUSTOMER
  WORKER
  FEDERATION_ADMIN
}

model Worker {
  id             String   @id @default(uuid())
  userId         String   @unique
  user           User     @relation(fields: [userId], references: [id])
  societyId      String
  society        Society  @relation(fields: [societyId], references: [id])
  skills         String[]
  certifications String[]
  verificationStatus VerificationStatus @default(SUBMITTED)
  latitude       Float?
  longitude      Float?
  ratingAvg      Float    @default(0)
  bookings       Booking[]
  welfareTx      WelfareFundTransaction[]
}

enum VerificationStatus {
  SUBMITTED
  UNDER_REVIEW
  VERIFIED
  REJECTED
}

model Service {
  id          String  @id @default(uuid())
  name        String
  category    String
  basePrice   Float
  bookings    Booking[]
}

model Booking {
  id                  String   @id @default(uuid())
  customerId          String
  customer            User     @relation("CustomerBookings", fields: [customerId], references: [id])
  workerId            String
  worker              Worker   @relation(fields: [workerId], references: [id])
  serviceId           String
  service             Service  @relation(fields: [serviceId], references: [id])
  status              BookingStatus @default(REQUESTED)
  isEmergency          Boolean  @default(false)
  scheduledAt          DateTime
  latitude             Float
  longitude            Float
  totalAmount          Float
  workerShare          Float
  federationFee        Float
  welfareContribution  Float
  emergencyBonus       Float   @default(0)
  payment              Payment?
  rating               Rating?
  createdAt            DateTime @default(now())
}

enum BookingStatus {
  REQUESTED
  ACCEPTED
  IN_PROGRESS
  COMPLETED
  CANCELLED
}

model Payment {
  id         String   @id @default(uuid())
  bookingId  String   @unique
  booking    Booking  @relation(fields: [bookingId], references: [id])
  razorpayId String?
  status     String
  paidAt     DateTime?
}

model Rating {
  id        String  @id @default(uuid())
  bookingId String  @unique
  booking   Booking @relation(fields: [bookingId], references: [id])
  stars     Int
  comment   String?
}

model WelfareFund {
  id           String   @id @default(uuid())
  federationId String   @unique
  federation   Federation @relation(fields: [federationId], references: [id])
  balance      Float    @default(0)
  transactions WelfareFundTransaction[]
}

model WelfareFundTransaction {
  id            String   @id @default(uuid())
  welfareFundId String
  welfareFund   WelfareFund @relation(fields: [welfareFundId], references: [id])
  workerId      String
  worker        Worker   @relation(fields: [workerId], references: [id])
  bookingId     String?
  amount        Float
  type          String   // "contribution" | "claim"
  createdAt     DateTime @default(now())
}

model DemandForecast {
  id            String   @id @default(uuid())
  federationId  String
  serviceCategory String
  forecastDate  DateTime
  predictedBookings Int
  recommendedWorkers Int
  createdAt     DateTime @default(now())
}
```

---

## PART E — API ENDPOINTS

```
Auth
  POST   /api/auth/register
  POST   /api/auth/login
  POST   /api/auth/refresh
  PATCH  /api/auth/language          (Requirement 10)

Worker (Requirements 1, 2)
  POST   /api/workers
  GET    /api/workers/:id
  PATCH  /api/workers/:id/verify           (federation admin action)
  PATCH  /api/workers/:id/location
  GET    /api/workers/nearby?lat=&lng=&skill=      (Requirement 4)

Federation (Requirement 9)
  GET    /api/federations/:id/dashboard
  GET    /api/federations/:id/workers
  GET    /api/federations/:id/welfare-fund
  GET    /api/federations/:id/fairness-metrics     (avg worker share % — Requirement 12)

Services & Booking (Requirements 3, 8)
  GET    /api/services
  POST   /api/bookings                       (standard, computes wage split)
  POST   /api/bookings/emergency             (Requirement 8, applies fairness-rule surge)
  PATCH  /api/bookings/:id/status
  GET    /api/bookings/:id
  GET    /api/bookings?userId=&role=

Payments (Requirements 5, 12)
  POST   /api/payments/create-order          (returns itemized breakdown)
  POST   /api/payments/webhook
  GET    /api/payments/:bookingId/invoice     (itemized PDF/JSON)

Ratings (Requirement 6)
  POST   /api/bookings/:id/rating

Welfare (Requirement 7)
  GET    /api/workers/:id/welfare
  GET    /api/federations/:id/welfare-fund/transactions

Forecasting (Requirement 11)
  GET    /api/forecast/demand?federationId=&days=7

Realtime (Requirement 8)
  Socket.io events: booking:new, booking:statusUpdate, booking:emergency
```

---

## PART F — WAGE-SPLIT & FAIRNESS LOGIC (implement exactly)

```
totalAmount = service.basePrice
if isEmergency:
    emergencyBonus = totalAmount * EMERGENCY_SURGE_PERCENT   // e.g. 20%
    totalAmount += emergencyBonus
else:
    emergencyBonus = 0

federationFee = service.basePrice * FEE_PERCENT              // e.g. 10%, NOT applied to emergency bonus
welfareContribution = service.basePrice * WELFARE_PERCENT    // e.g. 3%, NOT applied to emergency bonus
workerShare = totalAmount - federationFee - welfareContribution
```

**Critical fairness rule:** `emergencyBonus` flows entirely to `workerShare` — federation fee and welfare % are computed only off the base price, never off the surge. This must be visible in the itemized invoice (Requirement 5) and explicitly labeled "Emergency bonus goes to your worker" on the customer side, and "Emergency bonus: +₹X" on the worker side.

---

## PART G — MULTILINGUAL SCOPE (Requirement 10)

Minimum viable: `en.json`, `hi.json`, + one more regional language relevant to a real Labour Cooperative Federation's operating state (e.g., `mr.json` for Maharashtra, `ta.json` for Tamil Nadu — pick based on which federation you use as your pilot example in the pitch). Cover at minimum: onboarding, booking flow, pricing breakdown card, earnings/welfare screens, emergency booking flow. Language switcher on first launch + settings.

---

## PART H — AI FORECASTING SCOPE (Requirement 11)

- Input: historical booking counts per federation × service category × day (synthetic seed data, 60-90 days)
- Model: simple moving average or Prophet, 7-day forward forecast
- Output: `predictedBookings` + `recommendedWorkers` per service category, rendered as a bar chart in the Federation Dashboard with a text recommendation line beneath it

---

## PART I — SEED DATA PLAN

- 1 Federation, 2-3 Societies
- 15-20 Workers across skills (electrician, plumber, caregiver, cleaner, driver, gardener, technician), realistic lat/lng clustered around one demo city, mixed verification statuses (some SUBMITTED, most VERIFIED — to demo the verification queue)
- 8-10 Services with base prices
- 60-90 days synthetic booking history (for forecasting)
- 2-3 demo customer accounts
- A handful of pre-completed bookings with ratings + welfare transactions already populated, so the Worker's "Welfare" and "Earnings" tabs aren't empty on first login

---

## PART J — PHASED BUILD PLAN

**Phase 1 — Core loop (must-have)**
Auth (3 roles), Worker/Federation/Society models, service catalog, booking creation with geo-matching, wage-split computation + itemized display (Parts B, F) on both customer and worker sides.

**Phase 2 — Trust & payments**
Razorpay test-mode checkout with itemized order, invoice screen/PDF, rating & feedback, worker verification queue (admin).

**Phase 3 — Differentiators (this is what separates you from a generic clone — do not skip even under time pressure)**
Welfare fund ledger + "My Welfare" tab, federation dashboard (worker mgmt, bookings, welfare fund, fairness-metrics card), multilingual UI on core flows.

**Phase 4 — Polish & stretch**
AI demand forecasting widget, Socket.io real-time booking/emergency alerts, emergency booking flow with fairness-rule surge logic fully wired end to end.

**If time runs out, stop at the end of a phase — every phase alone is a coherent, fully demoable product state.**

---

## PART K — INSTRUCTIONS FOR CLAUDE CODE (paste as the build prompt)

```
Build a monorepo implementing the FULL specification above:

- /backend    — Node.js + Express + TypeScript + Prisma + PostgreSQL/PostGIS.
  Implement the schema in Part D and every endpoint in Part E. Implement the
  wage-split and fairness logic EXACTLY as specified in Part F, including the
  emergency-bonus rule.

- /mobile-app — One React Native + Expo app with role-based navigation
  (CUSTOMER and WORKER roles share the app, routed post-login). Implement every
  screen implied by Part B's user journeys — especially the "Fair Pricing
  Breakdown" card (customer) and "My Welfare" tab (worker), which must appear
  as first-class, dedicated screens, not embedded in a receipt or settings menu.
  Apply i18n per Part G to all core flows.

- /admin-web  — React + Vite + TailwindCSS. Implement the Federation Admin
  dashboard per Part B (worker verification queue, live bookings, welfare fund
  ledger, fairness-metrics card, demand forecast chart from Part H).

- /ai-service — Python FastAPI microservice implementing GET /forecast/demand
  per Part H, using synthetic seed data.

- /docker-compose.yml — Postgres (PostGIS enabled) + backend + ai-service.
  Mobile app via `expo start`, admin-web via `npm run dev`.

Build order: Phase 1 → 2 → 3 → 4 exactly as sequenced in Part J. Do not build
Phase 4 features before Phase 3 is complete — Phase 3 (welfare tab, fairness
dashboard, multilingual) is what makes this submission distinct from a generic
gig-marketplace clone and must not be cut for time.

Seed the database per Part I on first run so every screen has realistic,
non-empty data immediately — including at least a few pre-completed bookings
so the Worker's Earnings and Welfare tabs are populated on first login, not
empty states.

Cross-check against Part A's requirement traceability matrix before considering
any phase "done" — every row must correspond to an actual visible, tappable
screen element, not just a working API response.
```

---

*This document is self-contained — Parts A and B are the product/UX brain, Parts C–K are the buildable implementation. Use Part A as your final pre-submission checklist against the actual PS text.*
