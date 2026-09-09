// Where the mobile app finds the backend API.
//
// Resolution order:
//   1. EXPO_PUBLIC_BACKEND_URL   — set it when starting Metro, e.g.
//        EXPO_PUBLIC_BACKEND_URL=https://xxxx.trycloudflare.com npx expo start
//      (Expo inlines any EXPO_PUBLIC_* var at bundle time.) This is the
//      preferred knob — no file edit, no accidental commit of a dead URL.
//   2. BACKEND_URL_FALLBACK below — edit this if you'd rather hardcode it.
//
// Why a tunnel and not the Mac's LAN IP: direct inbound connectivity to
// this Mac is blocked by the corporate EDR agent (CrowdStrike Falcon)
// regardless of the macOS firewall setting. A Cloudflare Quick Tunnel
// routes around it — the Mac dials *out* to Cloudflare's edge and the
// phone talks to that edge, so nothing ever connects inbound to the Mac.
//
//   cloudflared tunnel --url http://localhost:4000
//
// A quick-tunnel hostname lives only as long as that cloudflared process
// and changes on every restart, so prefer passing it via the env var.
//
// If you're on an emulator or a network where the LAN *does* reach the
// Mac, EXPO_PUBLIC_BACKEND_URL=http://192.168.x.x:4000 also works.
const BACKEND_URL_FALLBACK =
  "https://hybrid-accessing-allows-offerings.trycloudflare.com";

export const BACKEND_URL =
  process.env.EXPO_PUBLIC_BACKEND_URL?.replace(/\/+$/, "") ||
  BACKEND_URL_FALLBACK;
