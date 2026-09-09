# RUN.md — running the whole stack on a phone with Expo Go

This is the end-to-end runbook: Postgres → backend → AI service → the two
tunnels → Expo Go on your phone → admin dashboard in a browser.

Everything the phone talks to lives on this Mac. Direct inbound to the Mac
is blocked by the corporate EDR agent (CrowdStrike Falcon), so **two
tunnels** are used:

| Tunnel | Carries | Tool | Public host (changes every restart) |
|---|---|---|---|
| Backend | REST API + Socket.io on `:4000` | `cloudflared` | `https://<name>.trycloudflare.com` |
| Metro/JS bundle | Expo dev server on `:8081` | `expo start --tunnel` (uses `@expo/ngrok`) | `exp://<name>.exp.direct` |

---

## 0. Prerequisites (already installed on this machine)

- Docker Desktop (running)
- Node 18, npm 10
- `cloudflared` (`/usr/local/bin/cloudflared`)
- `mobile-app/node_modules/@expo/ngrok` (installed for `--tunnel`)
- **Expo Go** on your phone (App Store / Play Store) — SDK 51 compatible
- Phone and Mac do **not** need to be on the same network (both tunnels are
  public).

---

## 1. Start the infra (Docker: Postgres + backend + AI service)

```bash
cd ~/Documents/SIH/UrbanCompanyX
docker compose up -d
docker compose ps          # all three should say "Up"
curl -s localhost:4000/health          # -> {"status":"ok"}
curl -s "localhost:8000/forecast/demand?federationId=$(docker exec urbancompanyx-postgres-1 psql -U postgres -d sih26089 -tA -c 'select id from "Federation" limit 1')" | head -c 120
```

Notes:
- The Postgres volume is already migrated + seeded. A **fresh** database
  needs, once:
  ```bash
  cd backend
  DATABASE_URL="postgresql://postgres:postgres@localhost:5432/sih26089?schema=public" npx prisma migrate deploy
  npm run prisma:seed
  npx ts-node prisma/demo-tracking-setup.ts   # pins demo customer/worker ~2.1km apart for the live-tracking demo
  ```
  (`demo-tracking-setup.ts` is idempotent — safe to re-run any time to
  reset the demo accounts' coordinates and availability.)
- To run the backend outside Docker instead (hot reload):
  ```bash
  docker compose stop backend
  cd backend && npm run dev            # ts-node-dev on :4000
  ```

---

## 2. Start the backend tunnel (cloudflared → :4000)

```bash
cloudflared tunnel --url http://localhost:4000 --protocol http2 --no-autoupdate
```

> **`--protocol http2` matters on this network.** cloudflared defaults to
> QUIC (UDP/443); the corporate firewall/EDR drops it, and the tunnel then
> loops forever on `control stream encountered a failure while serving`
> with `/ready` stuck at `readyConnections: 0`. Forcing HTTP/2 (TCP/443)
> makes it connect and stay connected.

Leave it running. It prints, within ~10 s:

```
+--------------------------------------------------------------------+
|  Your quick Tunnel has been created! Visit it at ...              |
|  https://alloy-must-bath-created.trycloudflare.com                |
+--------------------------------------------------------------------+
```

**Copy that URL.** Verify it:

```bash
curl -s https://<name>.trycloudflare.com/health          # -> {"status":"ok"}
```

The hostname is different every time `cloudflared` restarts.

---

## 3. Start Expo with the backend URL baked in (Metro tunnel → :8081)

```bash
cd ~/Documents/SIH/UrbanCompanyX/mobile-app
EXPO_PUBLIC_BACKEND_URL=https://<name>.trycloudflare.com npx expo start --tunnel
```

- `EXPO_PUBLIC_BACKEND_URL` is read by `src/lib/apiConfig.ts` (REST) and
  `src/lib/socket.ts` (Socket.io). No file edit needed. If you skip it, the
  app falls back to the hardcoded `BACKEND_URL_FALLBACK` constant in that
  file (which will usually be stale).
- Wait for `Tunnel ready.` and the QR code.
- The QR encodes `exp://<name>.exp.direct`. Get the exact value any time
  with:
  ```bash
  curl -s http://localhost:4040/api/tunnels | python3 -c "import sys,json;print([t['public_url'] for t in json.load(sys.stdin)['tunnels'] if t['proto']=='https'][0])"
  ```
  then swap `https://` → `exp://`.

### Open it on the phone

- **Android:** open **Expo Go** → "Enter URL manually" → `exp://<name>.exp.direct`
  (or scan the QR from the Expo Go home screen).
- **iOS:** open the **Camera** app → point at the QR → tap the banner
  (opens Expo Go).

First load bundles ~8 MB over the tunnel — give it 30–60 s.

### No phone? Use a simulator (no tunnels needed)

```bash
cd mobile-app
# iOS simulator (needs Xcode):
EXPO_PUBLIC_BACKEND_URL=http://localhost:4000 npx expo start --ios
# Android emulator (needs Android Studio; 10.0.2.2 = host loopback):
EXPO_PUBLIC_BACKEND_URL=http://10.0.2.2:4000 npx expo start --android
```

---

## 4. Admin dashboard (browser, not the phone)

```bash
cd ~/Documents/SIH/UrbanCompanyX/admin-web
npm run dev        # http://localhost:5173
```

It talks to `http://localhost:4000` directly (same machine) — no tunnel.

---

## 5. Credentials

Mobile login is **passwordless OTP**. Every seeded demo phone starts with
`900000…` and **always accepts OTP `0000`** (no SMS is sent; real SMS is
muted — `OTP_SMS_ENABLED=false`).

| Role | Phone | Secret | Client |
|---|---|---|---|
| Customer | `9000000201` (Aarav Mehta — has saved Home/Work addresses) | OTP `0000` | Expo Go |
| Customer | `9000000202`, `9000000203` | OTP `0000` | Expo Go |
| Worker — AC/technician (verified) | `9000000121`, `9000000122`, `9000000123` | OTP `0000` | Expo Go |
| Worker — plumber (verified) | `9000000111`, `9000000112`, `9000000113` | OTP `0000` | Expo Go |
| Worker — electrician (verified) | `9000000101`, `9000000102`, `9000000103` | OTP `0000` | Expo Go |
| Worker — mixed skills | `9000000100` (Ramesh Patil) | OTP `0000` | Expo Go |
| Federation Admin | `9000000001` | password **`password123`** | admin-web (`:5173`) |
| Other-federation admin (scoping tests) | `9000000002` | password `password123` | admin-web |

New account: type any unused `900000xxxx` number → OTP `0000` → Register →
choose Customer or Worker (a new Worker then fills a skills + society form).

---

## 6. Demo walkthrough

### Customer (`9000000201`)
1. Login → phone → OTP `0000`.
2. **Home** — location bar (Kothrud, Pune), categories, emergency CTA,
   cooperative-impact strip, active booking (if any) pinned on top.
3. Tap **AC Servicing** → **Service detail**: package tiers, "Where your
   money goes" split (from the server), inclusions/exclusions, real
   reviews.
4. Pick a package → **Slot picker** (day + time chips) → confirm service
   address / add instructions.
5. **Fair-pricing breakdown** — worker share / federation fee / welfare,
   shown **before** you commit. Tap **Confirm** → the booking is created
   and broadcast to nearby verified workers.
6. **Tracking** — "Finding a professional…" with a live eligible-worker
   count → once accepted: worker card (name, **Verified** badge, rating),
   status timeline, chat / call, and the **service-start OTP** (`0000`) to
   read out.
7. Worker completes → you give the **completion OTP** (`0000`) → booking
   **Completed** → **Rate** (stars + comment) → **Invoice** (three
   separate line items).
8. **Emergency**: Home → emergency CTA → same flow; the 20 % surge is added
   and flows **entirely to the worker** (federation fee + welfare are still
   computed off the base price only).
9. **Profile** → language switcher (English / हिन्दी / मराठी) — the whole
   booking → pay → rate flow is translated.

### Worker (`9000000122`, second device or after logout)
1. Login `9000000122` → OTP `0000`.
2. **Home** — AVAILABLE / OFFLINE toggle, active-job card, today's
   jobs / earnings / welfare, your rating.
3. **Jobs feed** — "New requests" shows the broadcast booking (service,
   distance, **expected earnings**, emergency tag). First to tap **Accept**
   wins; everyone else gets "no longer available".
4. **Job detail** — timeline, chat / call, lifecycle CTAs: *Start
   navigating → I've arrived → enter start OTP → Complete service → enter
   completion OTP*.
5. On completion — earnings + welfare credited, itemised in **Earnings**
   and **My Welfare** (running balance, per-job history, demo insurance
   card).

### Federation Admin (`:5173`, `9000000001` / `password123`)
- **Dashboard** — KPI cards (active bookings, **avg worker share %**,
  completion rate, rating, workers, welfare balance) + **demand-forecast
  bar chart** with recommended worker allocation.
- **Verification queue** — approve / reject worker registrations.
- **Worker management**, **Bookings oversight** (updates live over
  Socket.io — keep it open while booking on the phone), **Welfare fund
  ledger**, **Geo-demand**, **Demand forecast**.

---

## 7. What runs where — quick reference

| Piece | Command | Port | Notes |
|---|---|---|---|
| Postgres | `docker compose up -d postgres` | 5432 | volume `urbancompanyx_postgres_data` |
| Backend API | `docker compose up -d backend` | 4000 | or `cd backend && npm run dev` |
| AI service | `docker compose up -d ai-service` | 8000 | FastAPI; `/docs` for Swagger |
| Backend tunnel | `cloudflared tunnel --url http://localhost:4000 --protocol http2` | — | metrics on `127.0.0.1:20241`; check `curl localhost:20241/ready` |
| Expo + Metro tunnel | `EXPO_PUBLIC_BACKEND_URL=… npx expo start --tunnel` | 8081 | ngrok API on `127.0.0.1:4040` |
| admin-web | `cd admin-web && npm run dev` | 5173 | hits `localhost:4000` directly |

---

## 8. Troubleshooting

**App shows a network error / spinner forever**
- `curl https://<name>.trycloudflare.com/health` — if it fails, the
  backend tunnel died. Restart step 2, then restart Expo (step 3) with the
  new URL so it's re-baked into the bundle.
- Confirm the bundle picked up the URL: in the Expo Go dev menu → reload;
  or check `docker logs urbancompanyx-backend-1` for incoming requests.

**`cloudflared` prints a URL but the phone / `curl` can't reach it**
- `curl -s localhost:20241/ready` — if `readyConnections: 0` and the log
  loops on `control stream encountered a failure`, QUIC is being blocked.
  Restart with `--protocol http2` (see step 2).
- If `/ready` is `200` but `/health` 502s, the backend itself is down:
  `docker compose ps` / `docker logs urbancompanyx-backend-1`, or check the
  `npm run dev` terminal.

**Backend container keeps restarting**
- Should be fixed (Dockerfile is `node:20-alpine` + `apk add openssl`).
  If you see `libssl.so.1.1: cannot open shared object file`, someone
  reverted the Dockerfile — do **not** use `node:20-slim`, it has no
  libssl.

**`expo start --tunnel` hangs at "Starting Metro"**
- `@expo/ngrok` missing: `cd mobile-app && npm i -D @expo/ngrok@^4.1.0`.

**`CommandError: failed to start tunnel` / `remote gone away`**
- ngrok (what `--tunnel` uses) allows **one tunnel per machine/account** —
  if another `expo start --tunnel` is already running (even in another
  terminal / another session), the second fails this way. Kill the other:
  `pkill -f "expo start"` and retry.
- Often just transient — retry 2–3 times.
- If ngrok stays broken, tunnel Metro through cloudflared instead of
  ngrok:
  ```bash
  # terminal A
  cloudflared tunnel --url http://localhost:8081 --protocol http2 --no-autoupdate
  # -> note the https URL it prints, e.g. https://foo-bar.trycloudflare.com
  # terminal B
  cd mobile-app
  REACT_NATIVE_PACKAGER_HOSTNAME=foo-bar.trycloudflare.com \
    EXPO_PUBLIC_BACKEND_URL=<backend-cloudflare-url> \
    npx expo start
  ```
  In Expo Go choose "Enter URL manually" → `exp://foo-bar.trycloudflare.com`.

**AI forecast widget empty on the admin dashboard**
- `curl "localhost:8000/forecast/demand?federationId=<id>"` — if it 500s
  with `invalid dsn ... "schema"`, the `docker-compose.yml` ai-service
  `DATABASE_URL` has `?schema=public` again; remove it (psycopg2 rejects
  Prisma's query string).

**OTP rejected**
- Only `900000xxxx` numbers get the fixed `0000`. Any other number
  generates a random code that is printed to `docker logs
  urbancompanyx-backend-1` as `[otp:muted] ...`.

**Reset all demo data**
```bash
docker compose down -v && docker compose up -d
cd backend
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/sih26089?schema=public" npx prisma migrate deploy
npm run prisma:seed
```

---

## 9. Stopping everything

```bash
# Ctrl-C the cloudflared and expo terminals, then:
cd ~/Documents/SIH/UrbanCompanyX
docker compose down            # add -v to also wipe the database
```
