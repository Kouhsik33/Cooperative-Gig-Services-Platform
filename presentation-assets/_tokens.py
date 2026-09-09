"""Design tokens and SVG primitives for the SIH26089 presentation assets.

Every diagram is generated from this one module so the nine visuals share a
single visual system rather than drifting apart. Colours derive from the
product's own design system (mobile-app/src/theme/tokens.ts), so the deck,
the running app and the audit documents all read as one family.

Semantic rule, applied without exception across every diagram:

    customer      blue      outlined      — the demand side
    worker        teal      outlined      — the supply side
    cooperative   deep green FILLED       — institutions are solid
    technology    grey      light stroke  — infrastructure recedes
    provider      grey      DASHED        — not yet integrated
    accent        terracotta              — exactly one emphasis per diagram
"""

# ── Colour ──────────────────────────────────────────────────────────────
C = {
    "bg":        "#F7F8F6",
    "surface":   "#FFFFFF",
    "elev":      "#EDF1EE",
    "text":      "#16211E",
    "text2":     "#5B6B65",
    "border":    "#D8E0DB",

    "primary":   "#0F6B5C",
    "secondary": "#0A4F44",
    "accent":    "#C0651F",

    "customer":  "#2F6FB0",
    "worker":    "#0F6B5C",
    "coop":      "#0A4F44",
    "tech":      "#6B7C76",

    "success":   "#1E7A50",
    "warning":   "#96631A",
    "danger":    "#9E3B32",
}

# Tints, pre-computed so no diagram invents its own rgba().
TINT = {
    "customer": "#E8F0F8",
    "worker":   "#E1F0EB",
    "coop":     "#DCE8E4",
    "accent":   "#FAEDE1",
    "success":  "#E2F2E9",
    "danger":   "#F8E7E5",
    "warning":  "#F8EFDC",
}

# ── Type ────────────────────────────────────────────────────────────────
# Golden-ratio-adjacent, tuned for legibility rather than computed:
# 46/30 = 1.53 · 30/20 = 1.50 · 20/14 = 1.43 · 14/11 = 1.27
F_DISPLAY, F_H1, F_H2, F_BODY, F_LABEL, F_CAP = 46, 30, 20, 14, 11, 10
SANS = "Manrope, 'Helvetica Neue', Helvetica, Arial, sans-serif"
MONO = "'IBM Plex Mono', 'SF Mono', Menlo, monospace"

# ── Geometry ────────────────────────────────────────────────────────────
R = 8            # node corner radius, everywhere
SW_NODE = 2      # actor node stroke
SW_TECH = 1.5    # infrastructure stroke
SW_HERO = 3      # the one emphasised element per diagram
SW_LINE = 2      # connector

# Google Fonts is fetched at render time so PNG previews match the deck's
# typography exactly. SVGs still carry a full fallback stack, so they render
# correctly in tools that do not fetch remote CSS.
FONT_IMPORT = (
    "@import url('https://fonts.googleapis.com/css2?"
    "family=Manrope:wght@400;500;600;800&family=IBM+Plex+Mono:wght@400;500;600&display=swap');"
)


def head(w, h, title):
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}"
     viewBox="0 0 {w} {h}" role="img" aria-label="{esc(title)}">
<title>{esc(title)}</title>
<defs>
  <style><![CDATA[{FONT_IMPORT}]]></style>
  <marker id="ar" viewBox="0 0 10 10" refX="9" refY="5"
          markerWidth="6" markerHeight="6" orient="auto-start-reverse">
    <path d="M0,0 L10,5 L0,10 z" fill="{C['tech']}"/>
  </marker>
  <marker id="ar-p" viewBox="0 0 10 10" refX="9" refY="5"
          markerWidth="6" markerHeight="6" orient="auto-start-reverse">
    <path d="M0,0 L10,5 L0,10 z" fill="{C['primary']}"/>
  </marker>
</defs>
<rect width="{w}" height="{h}" fill="{C['bg']}"/>
'''


def esc(s):
    return (str(s).replace("&", "&amp;").replace("<", "&lt;")
            .replace(">", "&gt;").replace('"', "&quot;"))


def text(x, y, s, size=F_BODY, fill=None, weight="500", anchor="start",
         font=None, ls=None, opacity=None):
    fill = fill or C["text"]
    a = f' letter-spacing="{ls}"' if ls else ""
    o = f' opacity="{opacity}"' if opacity else ""
    return (f'<text x="{x}" y="{y}" font-family="{font or SANS}" font-size="{size}" '
            f'font-weight="{weight}" fill="{fill}" text-anchor="{anchor}"{a}{o}>{esc(s)}</text>')


def label(x, y, s, fill=None, anchor="start"):
    """Uppercase micro-label — the deck's Label style."""
    return text(x, y, str(s).upper(), F_LABEL, fill or C["tech"], "600", anchor, ls="1.1")


def rect(x, y, w, h, fill="none", stroke=None, sw=SW_NODE, r=R, dash=None, opacity=None):
    s = f' stroke="{stroke}" stroke-width="{sw}"' if stroke else ""
    d = f' stroke-dasharray="{dash}"' if dash else ""
    o = f' opacity="{opacity}"' if opacity else ""
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}" fill="{fill}"{s}{d}{o}/>'


def node(x, y, w, h, lines, kind="tech", size=F_BODY, hero=False):
    """One node in the shared vocabulary. `kind` selects the semantic role."""
    styles = {
        "customer": (C["customer"], "none",       C["customer"], SW_NODE, None),
        "worker":   (C["worker"],   "none",       C["secondary"], SW_NODE, None),
        "coop":     (C["coop"],     C["coop"],    "#FFFFFF",     SW_NODE, None),
        "tech":     (C["tech"],     C["surface"], C["tech"],     SW_TECH, None),
        "provider": (C["tech"],     "none",       C["tech"],     SW_TECH, "5 4"),
        "accent":   (C["accent"],   TINT["accent"], C["accent"], SW_NODE, None),
    }
    stroke, fill, fg, sw, dash = styles[kind]
    if hero:
        stroke, fill, sw = C["primary"], TINT["worker"], SW_HERO
        fg = C["secondary"]
    out = [rect(x, y, w, h, fill if fill != "none" else C["surface"], stroke, sw, dash=dash)]
    if kind == "provider":
        out = [rect(x, y, w, h, "none", stroke, sw, dash=dash)]
    if isinstance(lines, str):
        lines = [lines]
    n = len(lines)
    lh = size * 1.25
    y0 = y + h / 2 - (n - 1) * lh / 2 + size * 0.35
    for i, ln in enumerate(lines):
        out.append(text(x + w / 2, y0 + i * lh, ln, size, fg,
                        "600" if kind != "tech" else "500", "middle"))
    return "\n".join(out)


def line(x1, y1, x2, y2, stroke=None, sw=SW_LINE, dash=None, arrow=False, opacity=None):
    s = stroke or C["tech"]
    d = f' stroke-dasharray="{dash}"' if dash else ""
    m = ' marker-end="url(#ar-p)"' if (arrow and s == C["primary"]) else (' marker-end="url(#ar)"' if arrow else "")
    o = f' opacity="{opacity}"' if opacity else ""
    return (f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{s}" '
            f'stroke-width="{sw}" stroke-linecap="round"{d}{m}{o}/>')


def path(d, stroke=None, sw=SW_LINE, fill="none", dash=None, arrow=False, opacity=None):
    s = stroke or C["tech"]
    da = f' stroke-dasharray="{dash}"' if dash else ""
    m = ' marker-end="url(#ar-p)"' if (arrow and s == C["primary"]) else (' marker-end="url(#ar)"' if arrow else "")
    o = f' opacity="{opacity}"' if opacity else ""
    return (f'<path d="{d}" fill="{fill}" stroke="{s}" stroke-width="{sw}" '
            f'stroke-linecap="round" stroke-linejoin="round"{da}{m}{o}/>')


def band(x, y, w, h, fill=None, r=12):
    """Grouping band — depth comes from tint, never from a drop shadow."""
    return rect(x, y, w, h, fill or C["elev"], None, r=r)


def caption(x, y, s, anchor="start", fill=None):
    return text(x, y, s, F_CAP, fill or C["text2"], "400", anchor, font=MONO)


def title_block(x, y, kicker, headline, w=None):
    """Consistent diagram header used by every asset."""
    out = [label(x, y, kicker)]
    out.append(text(x, y + 30, headline, F_H2, C["text"], "800"))
    return "\n".join(out)


def foot():
    return "</svg>\n"
