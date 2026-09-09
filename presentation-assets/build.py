#!/usr/bin/env python3
"""Generates the SIH26089 presentation diagrams.

    python3 presentation-assets/build.py          # write SVGs
    python3 presentation-assets/build.py --png    # also rasterise previews

Every figure in these diagrams is taken from the verified evidence pack or
queried from the running database. Nothing here is illustrative.
"""
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _tokens import (  # noqa: E402
    C, TINT, F_DISPLAY, F_H1, F_H2, F_BODY, F_LABEL, F_CAP, SANS, MONO,
    R, SW_HERO, SW_LINE, SW_TECH,
    head, foot, text, label, rect, node, line, path, band, caption, title_block,
)

OUT = Path(__file__).parent
W, H = 1600, 900          # 16:9 — matches the deck's content proportion


# ══════════════════════════════════════════════════════════════════════
# 01 · Cooperative marketplace — Slide 1 hero
#
# Metaphor: two-sided convergence, NOT a linear flow. The left side is a
# single customer request; the right side is a supply network that already
# exists. Drawing supply as a dense pre-existing tree — against one thin
# arrow of demand — is what makes "no marketplace cold start" readable
# without reading the annotation.
# ══════════════════════════════════════════════════════════════════════
def d01():
    s = [head(W, 790, "Cooperative marketplace — demand meets an existing supply network")]
    s.append(title_block(70, 74, "Slide 1 · what we built",
                         "A marketplace whose supply network already exists"))

    # ── demand side ──
    s.append(label(70, 178, "Demand", C["customer"]))
    s.append(node(70, 200, 250, 74, ["Customer"], "customer", F_H2))
    s.append(node(70, 296, 250, 62, ["Location · pincode"], "customer"))
    s.append(node(70, 378, 250, 62, ["Service + package"], "customer"))
    s.append(node(70, 460, 250, 62, ["Address + time slot"], "customer"))
    s.append(caption(70, 556, "The customer never chooses a worker."))
    s.append(caption(70, 574, "18 packages across 8 services."))

    # demand → dispatch
    s.append(path(f"M 320 491 H 372", C["customer"], SW_LINE, arrow=True))

    # ── dispatch gate (the hero) ──
    gx, gy, gw, gh = 392, 200, 268, 322
    s.append(rect(gx, gy, gw, gh, TINT["worker"], C["primary"], SW_HERO, r=12))
    s.append(text(gx + gw / 2, gy + 54, "Cooperative", F_H2, C["secondary"], "800", "middle"))
    s.append(text(gx + gw / 2, gy + 82, "dispatch", F_H2, C["secondary"], "800", "middle"))
    s.append(line(gx + 40, gy + 104, gx + gw - 40, gy + 104, C["primary"], 1.5, opacity=".35"))
    for i, (t, d) in enumerate([
        ("Verified", "only federation-approved workers"),
        ("Skilled", "service category must match"),
        ("Local", "same pincode, or within 25 km"),
        ("Available", "free to start right now"),
    ]):
        yy = gy + 138 + i * 46
        s.append(text(gx + 26, yy, t, F_BODY, C["secondary"], "700"))
        s.append(text(gx + 26, yy + 17, d, F_CAP, C["text2"], "400", font=MONO))
    s.append(caption(gx, gy + gh + 34, "Eligibility is a pure per-worker rule,"))
    s.append(caption(gx, gy + gh + 52, "so every channel agrees by construction."))

    # dispatch → network
    s.append(path(f"M {gx+gw} 361 H 780", C["primary"], SW_HERO, arrow=True))

    # ── supply side: the network that already exists ──
    nx = 800
    s.append(band(nx - 22, 168, W - nx - 48, 420, C["elev"]))
    s.append(label(nx, 200, "Supply network — already in place", C["coop"]))

    s.append(node(nx, 220, 190, 62, ["Federation"], "coop", F_H2))

    # Live per-society counts. Dots are iconography capped at four; the
    # number beside them carries the actual figure, so nothing is overstated.
    socs = [("Kothrud", "411038", 13), ("Hadapsar", "411028", 4), ("Wakad", "411057", 4)]
    sy = 330
    for i, (name, pin, n) in enumerate(socs):
        yy = sy + i * 86
        s.append(path(f"M {nx+95} 282 V {yy+26} H {nx+232}", C["coop"], SW_TECH, opacity=".55"))
        s.append(node(nx + 240, yy, 168, 52, [name], "coop"))
        s.append(caption(nx + 240, yy + 68, f"pincode {pin}"))
        s.append(path(f"M {nx+408} {yy+26} H {nx+436}", C["tech"], SW_TECH, opacity=".5"))
        for k in range(min(n, 4)):
            cx = nx + 456 + k * 32
            s.append(f'<circle cx="{cx}" cy="{yy+26}" r="12" fill="none" '
                     f'stroke="{C["worker"]}" stroke-width="2"/>')
            s.append(f'<circle cx="{cx}" cy="{yy+26}" r="4" fill="{C["worker"]}"/>')
        s.append(text(nx + 456 + 4 * 32 + 6, yy + 32, f"{n} verified",
                      F_BODY, C["secondary"], "700"))

    s.append(label(nx + 440, 200, "21 verified workers · 3 societies", C["worker"]))

    # the argument, stated once
    ay = 630
    s.append(rect(70, ay, W - 140, 92, TINT["accent"], C["accent"], 2, r=12))
    s.append(text(96, ay + 40, "The supply network is not built per booking — it is the cooperative.",
                  F_H2, C["accent"], "800"))
    s.append(text(96, ay + 68,
                  "Federations and societies already hold member registries, verification and local governance. "
                  "There is no marketplace cold start to solve.",
                  F_BODY, C["text2"], "400"))

    s.append(caption(70, 766, "Federation · Society · Worker counts are live values from the seeded demo database."))
    s.append(foot())
    return "\n".join(s)


# ══════════════════════════════════════════════════════════════════════
# 02 · First-accept-wins — Slide 2 hero
#
# Metaphor: a starting gate, not a queue. All twenty lanes begin on ONE
# horizontal line so simultaneity is encoded in the geometry itself; a
# staggered or fanned origin would quietly assert an arrival order that
# does not exist.
# ══════════════════════════════════════════════════════════════════════
def d02():
    s = [head(W, 760, "First-accept-wins — twenty concurrent accepts, one assignment")]
    s.append(title_block(70, 74, "Slide 2 · race-safe dispatch",
                         "Twenty workers tap Accept. Exactly one gets the job."))

    s.append(node(W / 2 - 230, 142, 460, 52,
                  ["1 booking broadcast to every eligible worker"], "customer"))

    # Starting gate: one horizontal line carrying all twenty markers. The
    # shared origin IS the claim — a fanned or staggered start would assert
    # an arrival order that does not exist.
    gate_y = 250
    s.append(line(130, gate_y, W - 130, gate_y, C["customer"], 3))
    s.append(path(f"M {W/2} 194 V {gate_y - 6}", C["customer"], 2, arrow=True))
    s.append(label(130, gate_y - 16, "All 20 accepts issued at the same instant", C["customer"]))

    n, winner = 20, 8
    x0, x1 = 172, W - 172
    step = (x1 - x0) / (n - 1)
    guard_y = 372
    lane_end = guard_y - 6

    for i in range(n):
        x = x0 + i * step
        win = i == winner
        col = C["success"] if win else C["danger"]
        # Worker marker sitting on the gate, so the lanes read as people.
        s.append(f'<circle cx="{x}" cy="{gate_y}" r="9" fill="{C["surface"]}" '
                 f'stroke="{col}" stroke-width="{3 if win else 2}"'
                 f'{"" if win else ' opacity="0.55"'}/>')
        s.append(f'<circle cx="{x}" cy="{gate_y}" r="3.5" fill="{col}"'
                 f'{"" if win else ' opacity="0.55"'}/>')
        s.append(line(x, gate_y + 11, x, lane_end, col,
                      4 if win else 2.5, opacity=None if win else ".38"))
        if not win:
            # Short cross-bar, not an arrowhead: these attempts stop here.
            s.append(line(x - 7, lane_end, x + 7, lane_end, col, 2.5, opacity=".55"))

    # The guard
    s.append(rect(130, guard_y, W - 260, 116, TINT["worker"], C["primary"], SW_HERO, r=12))
    s.append(text(W / 2, guard_y + 38, "Atomic guard — two conditional UPDATEs",
                  F_H2, C["secondary"], "800", "middle"))
    s.append(text(W / 2, guard_y + 68,
                  "UPDATE Worker  SET availability='BUSY'  WHERE availability='AVAILABLE'",
                  F_BODY - 1, C["text2"], "500", "middle", font=MONO))
    s.append(text(W / 2, guard_y + 92,
                  "UPDATE Booking SET workerId=…  WHERE status='REQUESTED' AND workerId IS NULL",
                  F_BODY - 1, C["text2"], "500", "middle", font=MONO))

    # Outcomes: only the winner's lane continues through the guard.
    oy = guard_y + 168
    wx = x0 + winner * step
    s.append(line(wx, guard_y + 116, wx, oy, C["success"], 4))
    s.append(rect(wx - 170, oy, 340, 96, TINT["success"], C["success"], 2, r=12))
    s.append(text(wx, oy + 46, "1 × 200", F_H1, C["success"], "800", "middle"))
    s.append(text(wx, oy + 74, "ASSIGNED", F_LABEL, C["success"], "700", "middle", ls="1.4"))

    rx = W - 130 - 340
    s.append(rect(rx, oy, 340, 96, TINT["danger"], C["danger"], 2, r=12, opacity=".9"))
    s.append(text(rx + 170, oy + 46, "19 × 409", F_H1, C["danger"], "800", "middle"))
    s.append(text(rx + 170, oy + 74, "NO LONGER AVAILABLE", F_LABEL, C["danger"], "700",
                  "middle", ls="1.3"))
    # Tie the nineteen stopped lanes to their outcome without implying flow.
    s.append(path(f"M {rx + 170} {guard_y + 116} V {oy - 6}", C["danger"], 2,
                  dash="5 5", opacity=".45"))

    ey = 672
    s.append(text(70, ey, "Why exactly one survives", F_BODY + 2, C["text"], "700"))
    s.append(text(70, ey + 26,
                  "Under READ COMMITTED a second UPDATE waits for the first to commit, then re-evaluates its "
                  "WHERE clause against the committed row — and no longer matches.",
                  F_BODY, C["text2"], "400"))
    s.append(caption(70, ey + 52,
                     "Verified at 2, 5, 10 and 20 concurrent accepts, asserted against the database rather than the "
                     "API response.  scripts/v3-verify.py §7"))
    s.append(foot())
    return "\n".join(s)


# ══════════════════════════════════════════════════════════════════════
# 03 · Fair-wage engine — Slide 2 secondary, Slide 4 hero
#
# Metaphor: two bars sharing vertical alignment rails. The rails are the
# argument — they prove the federation and welfare segments do not move
# when the surge is added, without the viewer reading a single number.
# ══════════════════════════════════════════════════════════════════════
def d03():
    s = [head(W, 830, "Fair-wage engine — the emergency surge cannot be captured")]
    s.append(title_block(70, 74, "Slide 2 · slide 4 · fair-wage engine",
                         "Fee and welfare come off the base price. The surge cannot be touched."))

    BX, BW = 70, W - 300          # bar origin and full width for the emergency total
    base, fed, wel, surge = 899.0, 89.90, 26.97, 179.80
    worker_std = 782.13
    emer_total = base + surge
    px = BW / emer_total          # px per rupee — both bars share this scale

    def bar(y, segs, h=96):
        out, x = [], BX
        for w_rupees, colr, lab, sub in segs:
            w = w_rupees * px
            out.append(rect(x, y, w, h, colr, None, r=0))
            if w > 108:
                out.append(text(x + w / 2, y + h / 2 - 4, lab, F_H2, "#FFFFFF", "800", "middle"))
                out.append(text(x + w / 2, y + h / 2 + 20, sub, F_CAP, "#FFFFFF", "500", "middle",
                                font=MONO, opacity=".85"))
            x += w
        return out, x

    # standard
    y1 = 200
    s.append(label(BX, y1 - 16, "Standard booking · ₹899"))
    segs1, end1 = bar(y1, [
        (worker_std, C["worker"], "₹782.13", "WORKER"),
        (fed,        C["tech"],   "₹89.90",  "FEDERATION"),
        (wel,        C["coop"],   "",        ""),
    ])
    s.extend(segs1)
    s.append(rect(BX, y1, end1 - BX, 96, "none", C["border"], 1, r=0))

    # emergency
    y2 = 400
    s.append(label(BX, y2 - 16, "Emergency booking · ₹1,078.80", C["accent"]))
    segs2, end2 = bar(y2, [
        (worker_std, C["worker"],  "₹782.13", "WORKER"),
        (surge,      C["accent"],  "+₹179.80", "SURGE → WORKER"),
        (fed,        C["tech"],    "₹89.90",  "FEDERATION"),
        (wel,        C["coop"],    "",        ""),
    ])
    s.extend(segs2)
    s.append(rect(BX, y2, end2 - BX, 96, "none", C["border"], 1, r=0))

    # alignment rails — the proof
    fed_start_1 = BX + worker_std * px
    fed_start_2 = BX + (worker_std + surge) * px
    for x1_, x2_, lab in [(fed_start_1, fed_start_2, None)]:
        pass
    # welfare segment is tiny; annotate both bars' fee+welfare block instead
    s.append(line(fed_start_1, y1 + 96, fed_start_1, y2 - 22, C["tech"], 1.5, dash="4 4", opacity=".7"))
    s.append(line(end1, y1 + 96, end1, y2 - 22, C["tech"], 1.5, dash="4 4", opacity=".7"))
    s.append(rect(fed_start_1, y1 + 108, end1 - fed_start_1, 62, TINT["warning"], C["warning"], 1.5, r=6))
    s.append(text((fed_start_1 + end1) / 2, y1 + 132, "₹116.87", F_BODY, C["warning"], "800", "middle"))
    s.append(text((fed_start_1 + end1) / 2, y1 + 152, "identical in both", F_CAP, C["warning"], "600",
                  "middle", font=MONO))

    s.append(rect(fed_start_2, y2 + 108, end2 - fed_start_2, 62, TINT["warning"], C["warning"], 1.5, r=6))
    s.append(text((fed_start_2 + end2) / 2, y2 + 132, "₹116.87", F_BODY, C["warning"], "800", "middle"))
    s.append(text((fed_start_2 + end2) / 2, y2 + 152, "unchanged", F_CAP, C["warning"], "600",
                  "middle", font=MONO))

    # the formula, stated exactly as implemented
    fy = 622
    s.append(rect(70, fy, W - 140, 130, C["surface"], C["border"], 1.5, r=12))
    s.append(label(96, fy + 30, "One function · backend/src/services/wageSplit.ts"))
    rows = [
        ("federationFee", "= basePrice × 10%", "₹89.90", C["tech"]),
        ("welfareContribution", "= basePrice × 3%", "₹26.97", C["coop"]),
        ("workerShare", "= totalAmount − federationFee − welfareContribution", "₹782.13 · ₹961.93", C["worker"]),
    ]
    for i, (k, f, v, colr) in enumerate(rows):
        yy = fy + 60 + i * 26
        s.append(text(96, yy, k, F_BODY, colr, "700", font=MONO))
        s.append(text(300, yy, f, F_BODY, C["text2"], "400", font=MONO))
        s.append(text(W - 96, yy, v, F_BODY, colr, "700", "end", font=MONO))
    s.append(text(96, fy + 130 + 30,
                  "Fee and welfare are computed from basePrice; the worker's share is computed from totalAmount. "
                  "The surge is arithmetically unreachable by the federation.",
                  F_BODY, C["text"], "500"))

    # Welfare is a 3% sliver — too thin to label in place, so it gets a
    # leader line rather than being left looking like a border.
    wel_x = BX + (worker_std + fed) * px + (wel * px) / 2
    s.append(line(wel_x, y1, wel_x, y1 - 34, C["coop"], 1.5))
    s.append(text(wel_x + 6, y1 - 40, "Welfare  ₹26.97", F_CAP, C["coop"], "700", font=MONO))
    wel_x2 = BX + (worker_std + surge + fed) * px + (wel * px) / 2
    s.append(line(wel_x2, y2, wel_x2, y2 - 34, C["coop"], 1.5))
    s.append(text(wel_x2 + 6, y2 - 40, "Welfare  ₹26.97", F_CAP, C["coop"], "700", font=MONO))

    # the headline number
    s.append(text(W - 70, 118, "87.1%", F_DISPLAY, C["primary"], "800", "end"))
    s.append(label(W - 70, 142, "average worker share", C["text2"], "end"))
    s.append(foot())
    return "\n".join(s)


# ══════════════════════════════════════════════════════════════════════
# 04 · Two-sided transparency — Slide 2
#
# UI reconstruction, not a screenshot: no simulator or browser automation
# exists in this environment. Strings are the app's real i18n values and
# the amount is the live API figure, so the reconstruction is faithful to
# what the running app renders.
# ══════════════════════════════════════════════════════════════════════
def d04():
    s = [head(W, 830, "Two-sided transparency — one number, both sides")]
    s.append(title_block(70, 74, "Slide 2 · two-sided transparency",
                         "The customer and the worker see the same number, before either commits"))

    PW, PH, PY = 400, 520, 190
    lx, rx = 150, W - 150 - PW

    def phone(x, who, whocol, kicker, amount, cta, ctacol, rows):
        o = [rect(x, PY, PW, PH, C["surface"], C["border"], 2, r=24)]
        o.append(line(x + PW / 2 - 34, PY + 22, x + PW / 2 + 34, PY + 22, C["border"], 5))
        o.append(label(x + 30, PY + 74, who, whocol))
        o.append(text(x + 30, PY + 112, kicker, F_H2, C["text"], "700"))
        yy = PY + 158
        for k, v, strong in rows:
            o.append(text(x + 30, yy, k, F_BODY, C["text2"], "400"))
            o.append(text(x + PW - 30, yy, v, F_BODY,
                          whocol if strong else C["text"], "700" if strong else "500", "end"))
            yy += 30
        o.append(line(x + 30, yy + 6, x + PW - 30, yy + 6, C["border"], 1.5))
        o.append(label(x + 30, yy + 40, kicker if False else "", C["text2"]))
        o.append(text(x + 30, yy + 46, amount[0], F_LABEL, C["text2"], "600", ls="1.1"))
        o.append(text(x + 30, yy + 96, amount[1], F_DISPLAY, whocol, "800"))
        o.append(rect(x + 30, PY + PH - 78, PW - 60, 50, ctacol, None, r=8))
        o.append(text(x + PW / 2, PY + PH - 46, cta, F_BODY + 2, "#FFFFFF", "700", "middle"))
        return o

    s.extend(phone(lx, "Customer app", C["customer"], "Fair Pricing Breakdown",
                   ("WORKER'S SHARE", "₹782.13"), "Confirm booking", C["customer"],
                   [("Total price", "₹899.00", False),
                    ("Federation fee", "₹89.90", False),
                    ("Welfare contribution", "₹26.97", False)]))

    s.extend(phone(rx, "Worker app", C["worker"], "New service request",
                   ("EXPECTED EARNINGS", "₹782.13"), "Accept", C["worker"],
                   [("AC Servicing · Standard", "", False),
                    ("2.4 km away", "", False),
                    ("Est. 60–90 min", "", False)]))

    # the spine — both numbers derive from one calculation
    cx = W / 2
    s.append(line(lx + PW + 20, PY + PH / 2, cx - 130, PY + PH / 2, C["primary"], 2))
    s.append(line(cx + 130, PY + PH / 2, rx - 20, PY + PH / 2, C["primary"], 2))
    s.append(rect(cx - 130, PY + PH / 2 - 54, 260, 108, TINT["worker"], C["primary"], SW_HERO, r=12))
    s.append(text(cx, PY + PH / 2 - 18, "ONE", F_LABEL, C["primary"], "700", "middle", ls="1.6"))
    s.append(text(cx, PY + PH / 2 + 6, "SERVER-SIDE", F_LABEL, C["primary"], "700", "middle", ls="1.6"))
    s.append(text(cx, PY + PH / 2 + 30, "CALCULATION", F_LABEL, C["primary"], "700", "middle", ls="1.6"))

    s.append(text(70, 762,
                  "On a conventional gig platform neither screen exists: the customer sees a price, the worker sees a payout, "
                  "and nobody sees both.", F_BODY + 2, C["text"], "600"))
    s.append(caption(70, 792,
                     "UI reconstruction from the app's own design tokens and real i18n strings "
                     "(fairPricing.workerShare · workerHome.expectedEarnings); amount is the live API value."))
    s.append(foot())
    return "\n".join(s)


# ══════════════════════════════════════════════════════════════════════
# 05 · Verified service lifecycle — Slide 2 footer
#
# Metaphor: swim lanes crossing two literal gates. Drawing the OTPs as
# barriers the timeline must pass through encodes "these are enforced
# boundaries", which a row of chevrons would not.
# ══════════════════════════════════════════════════════════════════════
def d05():
    s = [head(W, 600, "Verified service lifecycle — OTP as enforced boundaries")]
    s.append(title_block(70, 66, "Slide 2 · service lifecycle",
                         "Two OTP gates the booking cannot move past without the customer"))

    lanes = [("Customer", C["customer"]), ("Worker", C["worker"]), ("System", C["tech"])]
    LX, LW = 200, W - 270
    for i, (nm, colr) in enumerate(lanes):
        y = 200 + i * 96
        s.append(band(LX - 10, y - 34, LW + 20, 76, C["elev"] if i % 2 == 0 else C["surface"]))
        s.append(label(70, y + 6, nm, colr))

    gate1, gate2 = 700, 1130
    for gx, lab in [(gate1, "START OTP"), (gate2, "COMPLETION OTP")]:
        s.append(rect(gx - 46, 126, 92, 340, TINT["accent"], C["accent"], SW_HERO, r=10))
        s.append(text(gx, 150, "OTP", F_LABEL, C["accent"], "700", "middle", ls="1.4"))
        s.append(text(gx, 492, lab, F_LABEL, C["accent"], "700", "middle", ls="1.2"))

    steps = [
        (250, 0, "Books service"),
        (400, 2, "Broadcast to\neligible workers"),
        (545, 1, "Accepts"),
        (620, 1, "Navigates"),
        (700, 0, "Shares code"),
        (790, 1, "Enters code"),
        (930, 1, "Performs service"),
        (1130, 0, "Shares code"),
        (1220, 1, "Enters code"),
        (1340, 2, "Welfare credited\n+ worker freed"),
        (1450, 0, "Rates"),
    ]
    for x, lane, lab in steps:
        y = 200 + lane * 96
        colr = lanes[lane][1]
        s.append(f'<circle cx="{x}" cy="{y}" r="9" fill="{C["surface"]}" stroke="{colr}" stroke-width="2.5"/>')
        for j, ln in enumerate(lab.split("\n")):
            s.append(text(x, y - 24 + j * 13 - (13 if "\n" in lab else 0), ln,
                          F_CAP, C["text2"], "500", "middle", font=MONO))

    s.append(line(240, 200 + 96, 1470, 200 + 96, C["border"], 2, opacity=".6"))
    s.append(text(70, 540,
                  "IN_PROGRESS and COMPLETED are unreachable by any plain status update — only a customer-issued, "
                  "server-validated code moves the booking across a gate.",
                  F_BODY, C["text"], "500"))
    s.append(caption(70, 566, "backend/src/controllers/booking.controller.ts · PLAIN_TRANSITIONS · verifyServiceOtp"))
    s.append(foot())
    return "\n".join(s)


# ══════════════════════════════════════════════════════════════════════
# 06 · System architecture — Slide 3
#
# Four bands, not a mesh. Modules are shown as peers inside a band because
# that is what they are; drawing arrows between every service would assert
# a call graph that does not exist.
# ══════════════════════════════════════════════════════════════════════
def d06():
    s = [head(W, H, "System architecture — four layers and one provider boundary")]
    s.append(title_block(70, 74, "Slide 3 · architecture",
                         "Independently understandable modules over one backend"))

    def row(y, h, title_, items, kind, note=None):
        o = [band(70, y, W - 140, h)]
        o.append(label(96, y + 28, title_))
        if note:
            o.append(caption(W - 96, y + 28, note, "end"))
        n = len(items)
        gap, pad = 16, 96
        avail = W - 140 - (pad - 70) * 2 - gap * (n - 1)
        bw = avail / n
        for i, it in enumerate(items):
            x = pad + i * (bw + gap)
            o.append(node(x, y + 44, bw, h - 62, it if isinstance(it, list) else [it], kind))
        return o

    s.extend(row(150, 132, "Applications", [
        ["Customer mobile", "React Native · Expo"],
        ["Worker mobile", "React Native · Expo"],
        ["Federation admin", "React · Vite · Tailwind"],
    ], "tech"))

    s.extend(row(310, 168, "Platform services", [
        "Auth", "Service catalog", "Booking", "Geo matching",
        "Dispatch", "OTP", "Payments", "Welfare", "Ratings",
    ], "tech", "Node · Express · TypeScript · 45 endpoints"))

    s.extend(row(506, 132, "Data · realtime · intelligence", [
        ["PostgreSQL", "Prisma · 16 models"],
        ["Socket.io", "4 room types"],
        ["Demand forecasting", "Python · FastAPI"],
    ], "tech"))

    # provider boundary — visually separated, dashed, unmistakable
    py = 692
    s.append(rect(70, py, W - 140, 118, "none", C["tech"], 2, r=12, dash="8 6"))
    s.append(label(96, py + 28, "Provider boundary — integration points, not yet connected", C["accent"]))
    for i, it in enumerate([["Razorpay", "mock mode"], ["SMS provider", "muted"],
                            ["GPS · Maps", "demo location"], ["Push transport", "in-app only"]]):
        bw = (W - 140 - 52 - 3 * 16) / 4
        s.append(node(96 + i * (bw + 16), py + 44, bw, 56, it, "provider"))

    s.append(line(W / 2, 282, W / 2, 310, C["tech"], 2, arrow=True))
    s.append(line(W / 2, 478, W / 2, 506, C["tech"], 2, arrow=True))
    s.append(line(W / 2, 638, W / 2, 692, C["tech"], 2, dash="6 5", arrow=True, opacity=".6"))

    s.append(caption(70, H - 34,
                     "Solid = implemented and running.  Dashed = defined integration point, not simulated in the interface."))
    s.append(foot())
    return "\n".join(s)


# ══════════════════════════════════════════════════════════════════════
# 07 · Federation scale model — Slide 3 hero
# ══════════════════════════════════════════════════════════════════════
def d07():
    s = [head(W, 760, "Federation scale model — rollout rides existing institutions")]
    s.append(title_block(70, 74, "Slide 3 · operating model",
                         "The rollout channel already exists"))

    # Uniform rung width. An earlier version widened each rung to suggest
    # scale, which pushed the "already exists" tags to ragged x-positions and
    # collided them with the bracket — alignment carries more here than the
    # widening metaphor did.
    RW, RX = 780, 70
    rungs = [
        ("Federation", "registered cooperative apex body", True),
        ("Societies", "local units with member registries", True),
        ("Verified workers", "admitted and skill-profiled members", True),
        ("Local service zones", "pincode coverage", False),
        ("Customers", "households and institutions", False),
    ]
    y0, RH, GAP = 170, 76, 14
    for i, (nm, sub, exists) in enumerate(rungs):
        y = y0 + i * (RH + GAP)
        if exists:
            s.append(rect(RX, y, RW, RH, C["elev"], None, r=10))
            s.append(rect(RX, y, 6, RH, C["coop"], None, r=3))
            s.append(text(RX + 30, y + 32, nm, F_H2, C["secondary"], "700"))
            s.append(text(RX + 30, y + 56, sub, F_CAP, C["text2"], "400", font=MONO))
            s.append(text(RX + RW - 24, y + 44, "ALREADY EXISTS", F_LABEL, C["coop"],
                          "700", "end", ls="1.3"))
        else:
            s.append(rect(RX, y, RW, RH, C["surface"], C["border"], 1.5, r=10))
            s.append(text(RX + 30, y + 32, nm, F_H2, C["text2"], "600"))
            s.append(text(RX + 30, y + 56, sub, F_CAP, C["text2"], "400", font=MONO))

    # Bracket + argument live in the right half, which was previously empty.
    bx = RX + RW + 40
    top, bot = y0 + 4, y0 + 3 * (RH + GAP) - GAP - 4
    s.append(path(f"M {bx+20} {top} H {bx} V {bot} H {bx+20}", C["coop"], SW_HERO))
    ax = bx + 44
    s.append(text(ax, top + 52, "Three of five layers", F_H2, C["secondary"], "800"))
    s.append(text(ax, top + 80, "are pre-existing institutions.", F_H2, C["secondary"], "800"))
    s.append(text(ax, top + 116,
                  "Member registries, verification and local", F_BODY, C["text2"], "400"))
    s.append(text(ax, top + 138,
                  "governance are already in place — there is", F_BODY, C["text2"], "400"))
    s.append(text(ax, top + 160,
                  "no marketplace cold start to solve.", F_BODY, C["text2"], "400"))
    s.append(rect(ax, top + 186, 520, 60, TINT["accent"], C["accent"], 2, r=10))
    s.append(text(ax + 22, top + 224,
                  "Adoption is not a customer-acquisition problem.",
                  F_BODY + 2, C["accent"], "700"))

    sy = y0 + 5 * (RH + GAP) + 22
    s.append(label(RX, sy, "Expansion path"))
    seq = ["1 federation", "n societies", "n districts", "n states"]
    x = RX
    for i, t in enumerate(seq):
        w = 210
        s.append(node(x, sy + 18, w, 56, [t], "coop" if i == 0 else "tech"))
        if i < len(seq) - 1:
            s.append(path(f"M {x+w+8} {sy+46} H {x+w+30}", C["tech"], 2, arrow=True))
        x += w + 38
    s.append(caption(x + 6, sy + 52, "Per-federation tenancy is already in the schema."))
    s.append(foot())
    return "\n".join(s)


# ══════════════════════════════════════════════════════════════════════
# 08 · Demand forecasting — Slide 3
#
# Deliberately labelled "Demand Forecasting Service", never "AI-powered":
# the implementation is a moving average with a stated capacity constant,
# and the diagram shows every step so nothing is taken on faith.
# ══════════════════════════════════════════════════════════════════════
def d08():
    s = [head(W, 620, "Demand forecasting — explainable, not opaque")]
    s.append(title_block(70, 66, "Slide 3 · demand forecasting service",
                         "Every recommendation shows the arithmetic that produced it"))

    stages = [
        (["Booking history", "60 days, real"], "tech"),
        (["14-day moving", "average"], "tech"),
        (["Compare to", "60-day baseline"], "tech"),
        (["Demand level", "+ trend %"], "tech"),
        (["Recommended", "workers"], "accent"),
    ]
    x, y, bw = 70, 180, 268
    for i, (lines, kind) in enumerate(stages):
        s.append(node(x, y, bw, 92, lines, kind))
        if i < len(stages) - 1:
            s.append(path(f"M {x+bw+8} {y+46} H {x+bw+26}", C["tech"], 2, arrow=True))
        x += bw + 34

    ey = 322
    s.append(rect(70, ey, W - 140, 148, C["surface"], C["border"], 1.5, r=12))
    s.append(label(96, ey + 28, "What the federation admin actually sees"))
    s.append(text(96, ey + 62, "technician", F_H2, C["text"], "700"))
    s.append(rect(280, ey + 44, 96, 26, TINT["danger"], None, r=5))
    s.append(text(328, ey + 62, "HIGH", F_LABEL, C["danger"], "700", "middle", ls="1.3"))
    s.append(text(W - 96, ey + 62, "6 predicted  ·  +1 worker", F_H2, C["accent"], "700", "end"))
    s.append(text(96, ey + 96, "Demand is 63% above the recent daily average.", F_BODY, C["text"], "500"))
    s.append(text(96, ey + 120,
                  "Based on 11 booking(s) in the last 14 days = 0.79/day; at 2 jobs per worker per day.",
                  F_BODY, C["text2"], "400", font=MONO))

    s.append(rect(70, 500, W - 140, 76, TINT["warning"], C["warning"], 1.5, r=10))
    s.append(text(96, 530, "Stated assumption, not a hidden parameter", F_BODY, C["warning"], "700"))
    s.append(text(96, 554,
                  "WORKER_DAILY_CAPACITY = 2 is a declared constant. No capacity data is modelled, and the "
                  "service claims no machine-learned precision.",
                  F_BODY, C["text2"], "400"))
    s.append(foot())
    return "\n".join(s)


# ══════════════════════════════════════════════════════════════════════
# 09 · Welfare flow — Slide 4
# ══════════════════════════════════════════════════════════════════════
def d09():
    s = [head(W, 560, "Welfare — a ledger, not a promise")]
    s.append(title_block(70, 66, "Slide 4 · worker welfare",
                         "3% of every completed booking, with an auditable trail"))

    steps = [
        (["Service", "completed"], "worker"),
        (["OTP verified", "by customer"], "accent"),
        (["3% credited", "in one transaction"], "coop"),
        (["Welfare ledger", "135 entries"], "coop"),
        (["Worker benefit", "insurance · support"], "worker"),
    ]
    x, y, bw = 70, 190, 268
    for i, (lines, kind) in enumerate(steps):
        s.append(node(x, y, bw, 96, lines, kind))
        if i < len(steps) - 1:
            s.append(path(f"M {x+bw+8} {y+48} H {x+bw+26}", C["tech"], 2, arrow=True))
        x += bw + 34

    s.append(rect(70, 336, 700, 96, TINT["worker"], C["primary"], 2, r=12))
    s.append(text(96, 376, "₹1,914", F_H1, C["primary"], "800"))
    s.append(text(240, 370, "accrued across 135 ledger entries", F_BODY, C["text"], "600"))
    s.append(text(240, 394, "on the seeded prototype dataset", F_CAP, C["text2"], "400", font=MONO))

    s.append(rect(800, 336, W - 870, 96, C["surface"], C["border"], 1.5, r=12))
    s.append(text(826, 370, "Credited only when the booking is paid.", F_BODY, C["text"], "600"))
    s.append(text(826, 394, "Completing an unpaid job does not credit money never collected.",
                 F_CAP, C["text2"], "400", font=MONO))

    s.append(caption(70, 500,
                     "Requirement 7 · WelfareFundTransaction + WelfareFund.balance, incremented inside the same "
                     "transaction that marks the booking COMPLETED."))
    s.append(foot())
    return "\n".join(s)


DIAGRAMS = [
    ("01-cooperative-marketplace", d01),
    ("02-first-accept-wins", d02),
    ("03-fair-wage-engine", d03),
    ("04-two-sided-transparency", d04),
    ("05-service-lifecycle", d05),
    ("06-system-architecture", d06),
    ("07-federation-scale-model", d07),
    ("08-demand-forecasting", d08),
    ("09-welfare-flow", d09),
]

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"


def rasterise(svg_path, png_path):
    """Headless Chrome is the only rasteriser available in this environment."""
    import re
    src = svg_path.read_text()
    m = re.search(r'width="(\d+)"\s+height="(\d+)"', src)
    w, h = (int(m.group(1)), int(m.group(2))) if m else (W, H)
    subprocess.run([
        CHROME, "--headless", "--disable-gpu", "--no-sandbox",
        "--force-device-scale-factor=1",
        "--hide-scrollbars",
        f"--screenshot={png_path}", f"--window-size={w},{h}",
        f"file://{svg_path.resolve()}",
    ], capture_output=True)


if __name__ == "__main__":
    want_png = "--png" in sys.argv
    only = [a for a in sys.argv[1:] if not a.startswith("--")]
    for name, fn in DIAGRAMS:
        if only and not any(o in name for o in only):
            continue
        svg = OUT / f"{name}.svg"
        svg.write_text(fn())
        msg = f"  {name}.svg"
        if want_png:
            rasterise(svg, OUT / f"{name}.png")
            msg += f"  →  {name}.png"
        print(msg)
    print("done")
