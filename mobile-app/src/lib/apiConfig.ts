// Direct LAN/hotspot connectivity to this Mac is blocked by the
// corporate EDR agent (CrowdStrike Falcon) installed on it — it filters
// unsolicited inbound connections from other devices regardless of the
// regular macOS firewall setting. Routing around it with a Cloudflare
// Quick Tunnel instead: the Mac makes an *outbound* connection out to
// Cloudflare's edge, and the phone talks to that edge over the public
// internet — no inbound connection to the Mac is ever needed.
//
// This URL is only valid for the lifetime of the current `cloudflared`
// process (it changes every time the tunnel is restarted) — update it
// here whenever the tunnel gets re-established with a new hostname.
export const BACKEND_URL = "https://spokesman-gave-intent-msgid.trycloudflare.com";
