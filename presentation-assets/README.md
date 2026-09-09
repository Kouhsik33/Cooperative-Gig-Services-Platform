# SIH26089 — presentation assets

Nine diagrams for the five-slide SIH presentation. Every figure is taken from
the verified evidence pack or queried from the running database. Nothing here
is illustrative, and nothing implies functionality the repository does not have.

## Building

```bash
python3 presentation-assets/build.py         # SVGs only
python3 presentation-assets/build.py --png   # SVGs + PNG previews
python3 presentation-assets/build.py 02 03   # rebuild specific diagrams
```

Rasterisation uses headless Chrome, which is the only SVG rasteriser available
in this environment (no rsvg-convert, inkscape, ImageMagick or cairosvg).

## Files

| File | Slide | Communicates |
|---|---|---|
| `01-cooperative-marketplace` | 1 (hero) | Demand meets a supply network that already exists |
| `02-first-accept-wins` | 2 (hero) | Twenty concurrent accepts resolve to exactly one assignment |
| `03-fair-wage-engine` | 2 + 4 (hero) | Fee and welfare come off base price; the surge cannot be captured |
| `04-two-sided-transparency` | 2 | Customer and worker see the same number before either commits |
| `05-service-lifecycle` | 2 | Two OTP gates the booking cannot move past |
| `06-system-architecture` | 3 | Four layers and one clearly-marked provider boundary |
| `07-federation-scale-model` | 3 (hero) | The rollout channel is an existing institution |
| `08-demand-forecasting` | 3 | An explainable statistical forecast, not a black box |
| `09-welfare-flow` | 4 | Welfare as an auditable ledger, not a promise |

---

## The visual system

`_tokens.py` holds every colour, type size, radius and stroke weight. No
diagram defines its own — that is what keeps nine separately-authored figures
reading as one deck.

**Semantic colour, applied without exception:**

| Role | Colour | Treatment | Why |
|---|---|---|---|
| Customer | `#2F6FB0` blue | outlined | the demand side |
| Worker | `#0F6B5C` teal | outlined | the supply side; takes the primary hue because this is a worker-first product |
| Cooperative | `#0A4F44` deep green | **filled** | institutions are solid; systems are outlined |
| Technology | `#6B7C76` grey | light stroke | infrastructure should recede |
| Provider-ready | grey | **dashed** | one consistent signal for "not yet integrated" |
| Accent | `#C0651F` terracotta | — | exactly one emphasis per diagram |

Palette derives from the product's own `mobile-app/src/theme/tokens.ts`, so the
deck, the running app and the audit documents are one family.

**Type:** Manrope (display/metrics, good tabular numerals) + IBM Plex Mono
(code, file paths, captions). Scale 46 / 30 / 20 / 14 / 11 / 10 — golden-adjacent
(1.53, 1.50, 1.43, 1.27) but tuned for legibility rather than computed.

**Geometry:** radius 8 everywhere · 2px actor stroke · 1.5px infrastructure ·
3px for the single emphasised element · no drop shadows (depth comes from
tinted bands).

---

## Per-diagram notes

### 01 · Cooperative marketplace — Slide 1 hero

**Communicates.** A booking meets a supply network that was already there.

**Why this representation.** A linear customer→worker flow would have shown the
journey but hidden the argument. Two-sided convergence — one thin demand arrow
against a dense pre-existing tree — makes "no marketplace cold start" readable
from the geometry before the annotation is read.

**Evidence.** `matching.service.ts` (the four eligibility criteria shown are the
literal predicate); `Federation → Society → Worker` in `schema.prisma`. Society
names, pincodes and per-society verified counts (13 / 4 / 4 = 21) are live
values queried from the seeded database. Worker dots are iconography capped at
four; the number beside them carries the real figure.

**Status.** Current functionality.

### 02 · First-accept-wins — Slide 2 hero

**Communicates.** Twenty simultaneous accepts, one assignment, enforced by the
database.

**Why this representation.** A starting gate, not a queue. All twenty markers
sit on one horizontal line so simultaneity is encoded in the geometry; a fanned
or staggered origin would quietly assert an arrival order that does not exist.
The nineteen rejected lanes end in cross-bars rather than arrowheads — they stop,
they do not flow onward.

**Evidence.** `booking.controller.ts` `acceptBooking` — the two `updateMany`
calls are quoted verbatim. Results verified at 2, 5, 10 and 20 concurrent
accepts in `scripts/v3-verify.py` §7, asserted against the database rather than
the API response. The READ COMMITTED explanation is from PostgreSQL's own
documentation on transaction isolation.

**Status.** Current functionality.

### 03 · Fair-wage engine — Slide 2 secondary, Slide 4 hero

**Communicates.** The emergency surge is arithmetically unreachable by the
federation.

**Why this representation.** Two bars on one shared px-per-rupee scale, with
the federation and welfare segments rendered at identical widths in both and
tied by callouts reading "identical in both" / "unchanged". That repetition
*is* the proof — it lands without reading a number. The 3% welfare sliver is
too thin to label in place, so it gets a leader line rather than being left
looking like a border.

**Evidence.** `services/wageSplit.ts`. Figures are the live API response for AC
Servicing → Standard package: base ₹899 → worker ₹782.13, federation ₹89.90,
welfare ₹26.97; emergency surge ₹179.80 → worker ₹961.93 with fee and welfare
unchanged. Verified in `scripts/v3-verify.py` §2–3.

**Status.** Current functionality.

### 04 · Two-sided transparency — Slide 2

**Communicates.** Both sides see ₹782.13 before either commits.

**Why this representation.** The two amounts have deliberately equal visual
weight and sit at the same y-position, so neither reads as primary. The spine
between them names the reason they agree.

**Evidence.** **This is a UI reconstruction, not a screenshot.** No iOS
simulator, Android SDK tooling or browser automation exists in this environment,
and the Expo app has no `react-native-web`/`react-dom` installed — adding them
would modify the application. Rather than fabricate a screenshot, the frames are
drawn from the app's own design tokens using its real i18n strings
(`fairPricing.workerShare` → "Worker's share", `fairPricing.title` → "Fair
Pricing Breakdown", `workerHome.expectedEarnings` → "Expected earnings",
`workerHome.accept` → "Accept") and the live API amount. The caption on the
diagram states this. If an emulator becomes available before the event, real
captures are a drop-in replacement.

**Status.** Current functionality, reconstructed rendering.

### 05 · Verified service lifecycle — Slide 2

**Communicates.** OTPs are enforced boundaries, not form fields.

**Why this representation.** Swim lanes crossing two literal gates. Drawing the
OTPs as barriers the timeline must pass through encodes "these are enforced"
in a way a row of chevrons would not. Lanes make the customer/worker/system
division legible without a legend.

**Evidence.** `booking.controller.ts` — `PLAIN_TRANSITIONS` and
`verifyServiceOtp`. `IN_PROGRESS` and `COMPLETED` are genuinely unreachable via
`PATCH /bookings/:id/status`.

**Status.** Current functionality.

### 06 · System architecture — Slide 3

**Communicates.** Four layers, and a provider boundary that is clearly not yet
connected.

**Why this representation.** Modules appear as peers inside a band because that
is what they are. Drawing arrows between every service would assert a call graph
the code does not have. The provider boundary is separated, dashed and labelled
so it can never be mistaken for a live integration.

**Evidence.** `backend/src/` (45 endpoints across 11 route modules),
`schema.prisma` (16 models), `socket/index.ts` (4 room types),
`ai-service/app/routers/forecast.py`, `docker-compose.yml`.

**Status.** Solid nodes are current functionality. **Dashed nodes are
provider-ready boundaries** — Razorpay in mock mode, SMS muted, demo location
instead of GPS, in-app notifications only.

### 07 · Federation scale model — Slide 3 hero

**Communicates.** Three of the five layers are pre-existing institutions.

**Why this representation.** Shading does the work: a judge reads "they are not
building a marketplace from zero" before reading a word. An earlier version
widened each rung to suggest scale, which pushed the "already exists" tags to
ragged positions and collided them with the bracket — uniform width and a
right-hand annotation carry more than the widening metaphor did.

**Evidence.** `Federation → Society → Worker` relations in `schema.prisma`;
`requireOwnFederation` in `auth.middleware.ts` (per-federation tenancy is
already enforced).

**Status.** Current functionality. The expansion path is a deployment model, not
a claim about existing deployments.

### 08 · Demand forecasting — Slide 3

**Communicates.** An explainable statistical forecast that shows its arithmetic.

**Why this representation.** The pipeline is drawn end to end and the admin's
actual output is quoted verbatim, including the derivation line. Labelled
"Demand Forecasting Service", never "AI-powered" — the implementation is a
14-day moving average, and overclaiming invites a question the team would lose.
The capacity assumption is called out in its own panel rather than buried.

**Evidence.** `ai-service/app/routers/forecast.py`. The quoted output is a live
response: "technician — HIGH, 6 predicted, +1 worker · Demand is 63% above the
recent daily average · Based on 11 booking(s) in the last 14 days = 0.79/day; at
2 jobs per worker per day."

**Status.** Current functionality. `WORKER_DAILY_CAPACITY = 2` is a declared
constant, not derived from capacity data.

### 09 · Welfare flow — Slide 4

**Communicates.** Welfare accrues automatically with an auditable trail.

**Evidence.** `WelfareFundTransaction` + `WelfareFund.balance`, incremented in
the same transaction that marks the booking `COMPLETED`
(`booking.controller.ts` `verifyServiceOtp`). ₹1,914 across 135 ledger entries
is a live database figure. The "credited only when paid" gate is real — see the
`payment.status === "paid"` check.

**Status.** Current functionality. The insurance card in the app is demo-labelled;
no insurer integration exists.

---

## What is deliberately absent

- **No screenshots.** See 04 above — reconstruction rather than fabrication.
- **No live GPS, route lines or moving worker pins** in any diagram. There is no
  position stream, and animating one would be the most misleading thing these
  assets could do.
- **No "AI-powered" labelling.**
- **No projected users, revenue or growth curves.** Nothing in the repository
  supports them.
- **No emoji, stock imagery, gradients or 3D.**

## Quality pass

Every diagram was rendered and visually inspected at presentation size, then
corrected. Fixes made during that pass:

- `02` — lanes originally read as a faint grid rather than twenty workers;
  redesigned with worker markers on the gate line and 200px of empty lane
  compressed to 118px.
- `05` — the "OTP" gate label collided with the "Reads code" step label at the
  same y-position; gate raised and the step renamed "Shares code" (the customer
  shares the code, they do not read it twice).
- `07` — "ALREADY EXISTS" tags collided with the bracket and annotation;
  rebuilt with uniform rung width and the annotation moved into the empty right
  half.
- `03` — the 3% welfare segment rendered as a border; given leader lines.
- `01` — worker dots showed 13 while the label said 21; now shows real
  per-society counts.
- `01 03 04 05 07 08 09` — canvas heights trimmed to their content.
