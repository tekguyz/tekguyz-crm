#!/usr/bin/env python3
"""TEKGUYZ CRM brand asset pipeline — single source of truth.

Regenerates every brand asset from geometry + a font file. Nothing in this
pipeline is hand-edited output; if an asset looks wrong, fix it here and re-run.

    pip install pillow fonttools
    npm i -D @fontsource/inter        # provides the Inter TTFs

    python3 scripts/brand/build_brand.py \
        --inter-bold   node_modules/@fontsource/inter/files/inter-latin-700-normal.woff \
        --inter-medium node_modules/@fontsource/inter/files/inter-latin-500-normal.woff \
        --out public

Wordmark text is converted to SVG <path> outlines. It is never emitted as a
live <text> element: a logo that depends on the viewer having Inter installed
silently degrades to a system stack in email signatures, decks, and anywhere
outside the app.
"""
from __future__ import annotations

import argparse
import math
import os
import sys

# ---------------------------------------------------------------------------
# Palette
# ---------------------------------------------------------------------------
INK = "#1A1A1A"
INK_ON_DARK = "#F5F5F5"
BLUE = "#3B6FE0"          # logo blue — not a UI token, see README
TEAL = "#2FA679"
# On-dark the ink casing flips to near-white, and #2FA679 measures only
# 2.81:1 against it. One lightness step down (hue/chroma locked) clears 3:1
# so the nodes stay separated from their outline. Logotypes are exempt from
# WCAG 1.4.11, but the fix is free and the mark reads better for it.
TEAL_ON_DARK = "#16976B"
SUB_LIGHT = "#6B6B72"
SUB_DARK = "#9A9AA2"

# ---------------------------------------------------------------------------
# Mark geometry — 512x512 design space
# ---------------------------------------------------------------------------
RIM_L, RIM_R, RIM_T = 64.0, 448.0, 206.0
SHOULDER_B = 262.0
NECK_L, NECK_R, NECK_T = 222.0, 290.0, 402.0
STEM_B = 476.0
FILL_Y = 272.0

FUNNEL = [
    (RIM_L, RIM_T), (RIM_R, RIM_T), (RIM_R, SHOULDER_B),
    (NECK_R, NECK_T), (NECK_R, STEM_B),
    (NECK_L, STEM_B), (NECK_L, NECK_T),
    (RIM_L, SHOULDER_B),
]


def _wall_x(y, left=True):
    t = (y - SHOULDER_B) / (NECK_T - SHOULDER_B)
    return (RIM_L + t * (NECK_L - RIM_L)) if left else (RIM_R + t * (NECK_R - RIM_R))


FILL_XL, FILL_XR = _wall_x(FILL_Y, True), _wall_x(FILL_Y, False)

FUNNEL_FILL = [
    (FILL_XL, FILL_Y), (FILL_XR, FILL_Y),
    (NECK_R, NECK_T), (NECK_R, STEM_B),
    (NECK_L, STEM_B), (NECK_L, NECK_T),
]

HEX_R = 44.0
HEXES = [(256.0, 128.0), (148.0, 202.0), (364.0, 202.0)]


def hexagon(cx, cy, r=HEX_R):
    """Pointy-top hexagon."""
    return [
        (cx, cy - r),
        (cx + r * math.sqrt(3) / 2, cy - r / 2),
        (cx + r * math.sqrt(3) / 2, cy + r / 2),
        (cx, cy + r),
        (cx - r * math.sqrt(3) / 2, cy + r / 2),
        (cx - r * math.sqrt(3) / 2, cy - r / 2),
    ]


JUNCTION = (256.0, 306.0)
CONNECTORS = [
    [(256.0, 172.0), JUNCTION],
    [(148.0, 202.0), JUNCTION],
    [(364.0, 202.0), JUNCTION],
]
ARROW_SHAFT = [(256.0, 302.0), (256.0, 372.0)]
ARROW_HEAD = [(220.0, 368.0), (292.0, 368.0), (256.0, 426.0)]

W_FUNNEL, W_HEX, W_CASE = 22.0, 18.0, 32.0
W_TEAL, W_FILL_EDGE, W_SHAFT = 15.0, 20.0, 22.0

REDUCED_SHAFT = [(256.0, 292.0), (256.0, 372.0)]
REDUCED_HEAD = [(214.0, 366.0), (298.0, 366.0), (256.0, 430.0)]
PAD = 8.0


def bbox():
    xs, ys = [], []
    for (x, y) in FUNNEL:
        xs += [x - W_FUNNEL / 2, x + W_FUNNEL / 2]
        ys += [y - W_FUNNEL / 2, y + W_FUNNEL / 2]
    for (cx, cy) in HEXES:
        for (x, y) in hexagon(cx, cy):
            xs += [x - W_HEX / 2, x + W_HEX / 2]
            ys += [y - W_HEX / 2, y + W_HEX / 2]
    for (x, y) in ARROW_HEAD:
        xs.append(x)
        ys.append(y)
    return min(xs), min(ys), max(xs), max(ys)


# ---------------------------------------------------------------------------
# SVG emitters
# ---------------------------------------------------------------------------
def _pts(p):
    return " ".join(f"{x:.2f},{y:.2f}" for x, y in p)


def icon_body(ink=INK, blue=BLUE, teal=TEAL):
    """Inner <g> of the icon, reusable inside a lockup transform."""
    o = [
        f'<g fill="none" stroke="{ink}" stroke-width="{W_FUNNEL}" '
        'stroke-linejoin="round" stroke-linecap="round">'
    ]
    if blue:
        o.append(f'<polygon points="{_pts(FUNNEL_FILL)}" fill="{blue}" stroke="none"/>')
    o.append(f'<polygon points="{_pts(FUNNEL)}"/>')
    o.append(
        f'<line x1="{FILL_XL:.2f}" y1="{FILL_Y}" x2="{FILL_XR:.2f}" y2="{FILL_Y}" '
        f'stroke-width="{W_FILL_EDGE}"/>'
    )
    for (a, b) in CONNECTORS:
        o.append(
            f'<line x1="{a[0]}" y1="{a[1]}" x2="{b[0]}" y2="{b[1]}" '
            f'stroke-width="{W_CASE}"/>'
        )
    if teal:
        for (a, b) in CONNECTORS:
            o.append(
                f'<line x1="{a[0]}" y1="{a[1]}" x2="{b[0]}" y2="{b[1]}" '
                f'stroke="{teal}" stroke-width="{W_TEAL}"/>'
            )
    for (cx, cy) in HEXES:
        f = f' fill="{teal}"' if teal else ""
        o.append(f'<polygon points="{_pts(hexagon(cx, cy))}"{f} stroke-width="{W_HEX}"/>')
    a, b = ARROW_SHAFT
    o.append(
        f'<line x1="{a[0]}" y1="{a[1]}" x2="{b[0]}" y2="{b[1]}" stroke-width="{W_SHAFT}"/>'
    )
    o.append(f'<polygon points="{_pts(ARROW_HEAD)}" fill="{ink}" stroke="none"/>')
    o.append("</g>")
    return "".join(o)


def icon_svg(ink=INK, blue=BLUE, teal=TEAL, title="TEKGUYZ CRM"):
    x0, y0, x1, y1 = bbox()
    x0 -= PAD; y0 -= PAD; x1 += PAD; y1 += PAD
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" '
        f'viewBox="{x0:.2f} {y0:.2f} {x1-x0:.2f} {y1-y0:.2f}" '
        f'width="{x1-x0:.0f}" height="{y1-y0:.0f}" role="img" aria-labelledby="t">'
        f'<title id="t">{title}</title>{icon_body(ink, blue, teal)}</svg>'
    )


def icon_reduced_svg(ink=INK, blue=BLUE, title="TEKGUYZ CRM"):
    """Funnel + arrow only. For <=32px, where the nodes cannot resolve."""
    w = W_FUNNEL * 1.25
    x0, y0 = RIM_L - w - PAD, RIM_T - w - PAD
    x1, y1 = RIM_R + w + PAD, STEM_B + w + PAD
    o = [
        f'<svg xmlns="http://www.w3.org/2000/svg" '
        f'viewBox="{x0:.2f} {y0:.2f} {x1-x0:.2f} {y1-y0:.2f}" '
        f'width="{x1-x0:.0f}" height="{y1-y0:.0f}" role="img" aria-labelledby="t">'
        f'<title id="t">{title}</title>'
        f'<g fill="none" stroke="{ink}" stroke-width="{w:.1f}" '
        'stroke-linejoin="round" stroke-linecap="round">'
    ]
    if blue:
        o.append(f'<polygon points="{_pts(FUNNEL_FILL)}" fill="{blue}" stroke="none"/>')
    o.append(f'<polygon points="{_pts(FUNNEL)}"/>')
    o.append(
        f'<line x1="{FILL_XL:.2f}" y1="{FILL_Y}" x2="{FILL_XR:.2f}" y2="{FILL_Y}" '
        f'stroke-width="{W_FILL_EDGE*1.25:.1f}"/>'
    )
    a, b = REDUCED_SHAFT
    o.append(
        f'<line x1="{a[0]}" y1="{a[1]}" x2="{b[0]}" y2="{b[1]}" '
        f'stroke-width="{W_SHAFT*1.35:.1f}"/>'
    )
    o.append(f'<polygon points="{_pts(REDUCED_HEAD)}" fill="{ink}" stroke="none"/>')
    o.append("</g></svg>")
    return "".join(o)


# ---------------------------------------------------------------------------
# Wordmark: font -> SVG paths (no live <text>)
# ---------------------------------------------------------------------------
class Wordmark:
    """Converts a string to SVG path outlines using real glyph geometry.

    Never emits a live <text> element: a logo that depends on the viewer
    having Inter installed silently degrades to a system stack everywhere
    outside the app.
    """

    def __init__(self, font_path):
        from fontTools.ttLib import TTFont
        self.font = TTFont(font_path, fontNumber=0)
        self.upem = self.font["head"].unitsPerEm
        self.glyphset = self.font.getGlyphSet()
        self.cmap = self.font.getBestCmap()
        self.hmtx = self.font["hmtx"]

    def _draw(self, pen_factory, text, size, tracking_em):
        from fontTools.pens.transformPen import TransformPen
        from fontTools.misc.transform import Transform
        pen = pen_factory()
        scale = size / self.upem
        x = 0.0
        for ch in text:
            name = self.cmap.get(ord(ch))
            if name is None:
                x += size * 0.4
                continue
            self.glyphset[name].draw(
                TransformPen(pen, Transform(scale, 0, 0, -scale, x, 0))
            )
            x += self.hmtx[name][0] * scale + tracking_em * size
        return pen, x

    def render(self, text, size, tracking_em=0.0):
        """(path_d, ink_bounds) with baseline at y=0, pen start at x=0.

        Layout uses ink bounds, not advance width — advance carries side
        bearings and a trailing tracking step, which throws optical centring
        off by several px at logo sizes.
        """
        from fontTools.pens.svgPathPen import SVGPathPen
        from fontTools.pens.boundsPen import BoundsPen
        pen, _ = self._draw(
            lambda: SVGPathPen(self.glyphset, ntos=lambda v: f"{v:.2f}"),
            text, size, tracking_em,
        )
        bp, _ = self._draw(lambda: BoundsPen(self.glyphset), text, size, tracking_em)
        return pen.getCommands(), bp.bounds


MARGIN = 64.0
LINE_GAP = 30.0
ICON_GAP = 56.0


def lockup_svg(wm_bold, wm_med, dark=False, stacked=False):
    """Icon + wordmark. All text is outlined; nothing depends on installed fonts."""
    ink = INK_ON_DARK if dark else INK
    sub = SUB_DARK if dark else SUB_LIGHT
    teal = TEAL_ON_DARK if dark else TEAL

    bx0, by0, bx1, by1 = bbox()
    iw_u, ih_u = (bx1 - bx0), (by1 - by0)
    icon_h = 260.0 if stacked else 280.0
    s = icon_h / ih_u
    icon_w = iw_u * s

    main_size, sub_size = (92.0, 54.0) if stacked else (104.0, 58.0)
    d_main, mb = wm_bold.render("TEKGUYZ", main_size, 0.025)
    d_sub, sb = wm_med.render("CRM", sub_size, 0.16)

    main_w, main_h = mb[2] - mb[0], mb[3] - mb[1]
    sub_w, sub_h = sb[2] - sb[0], sb[3] - sb[1]
    block_h = main_h + LINE_GAP + sub_h
    block_w = max(main_w, sub_w)

    if stacked:
        W = max(icon_w, block_w) + 2 * MARGIN
        H = MARGIN + icon_h + ICON_GAP + block_h + MARGIN
        icon_x, icon_y = (W - icon_w) / 2, MARGIN
        block_top = MARGIN + icon_h + ICON_GAP
        main_x = (W - main_w) / 2 - mb[0]
        sub_x = (W - sub_w) / 2 - sb[0]
    else:
        text_left = MARGIN + icon_w + ICON_GAP
        W = text_left + block_w + MARGIN
        H = icon_h + 2 * MARGIN
        icon_x, icon_y = MARGIN, MARGIN
        block_top = (H - block_h) / 2
        main_x = text_left - mb[0]
        sub_x = text_left - sb[0]

    main_y = block_top - mb[1]
    sub_y = block_top + main_h + LINE_GAP - sb[1]

    parts = [
        f'<g transform="translate({icon_x - bx0*s:.2f},{icon_y - by0*s:.2f}) '
        f'scale({s:.4f})">{icon_body(ink, BLUE, teal)}</g>',
        f'<path transform="translate({main_x:.2f},{main_y:.2f})" d="{d_main}" fill="{ink}"/>',
        f'<path transform="translate({sub_x:.2f},{sub_y:.2f})" d="{d_sub}" fill="{sub}"/>',
    ]
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W:.0f} {H:.0f}" '
        f'width="{W:.0f}" height="{H:.0f}" role="img" aria-labelledby="t">'
        f'<title id="t">TEKGUYZ CRM</title>{"".join(parts)}</svg>'
    )


# ---------------------------------------------------------------------------
# Rasteriser
# ---------------------------------------------------------------------------
SS = 4


def _rgba(h, a=255):
    h = h.lstrip("#")
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), a)


def raster(size, ink=INK, blue=BLUE, teal=TEAL, bg=None, pad_ratio=0.0, reduced=False):
    from PIL import Image, ImageDraw
    S = size * SS
    img = Image.new("RGBA", (S, S), _rgba(bg) if bg else (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    if reduced:
        w = W_FUNNEL * 1.25
        x0, y0, x1, y1 = RIM_L - w, RIM_T - w, RIM_R + w, STEM_B + w
    else:
        x0, y0, x1, y1 = bbox()
    cw, ch = x1 - x0, y1 - y0
    inner = S * (1 - 2 * pad_ratio)
    scale = inner / max(cw, ch)
    ox = (S - cw * scale) / 2 - x0 * scale
    oy = (S - ch * scale) / 2 - y0 * scale

    P = lambda p: [(a * scale + ox, b * scale + oy) for a, b in p]
    W_ = lambda w: max(1, int(round(w * scale)))
    ci, cb, ct = _rgba(ink), _rgba(blue) if blue else None, _rgba(teal) if teal else None

    def stroke(pts, colour, width, closed=False):
        p = P(pts)
        if closed:
            p = p + [p[0]]
        d.line(p, fill=colour, width=W_(width), joint="curve")
        r = W_(width) / 2
        for (x, y) in p:
            d.ellipse([x - r, y - r, x + r, y + r], fill=colour)

    if cb:
        d.polygon(P(FUNNEL_FILL), fill=cb)
    mult = 1.25 if reduced else 1.0
    stroke(FUNNEL, ci, W_FUNNEL * mult, closed=True)
    stroke([(FILL_XL, FILL_Y), (FILL_XR, FILL_Y)], ci, W_FILL_EDGE * mult)
    if reduced:
        stroke(REDUCED_SHAFT, ci, W_SHAFT * 1.35)
        d.polygon(P(REDUCED_HEAD), fill=ci)
    else:
        for c in CONNECTORS:
            stroke(c, ci, W_CASE)
        if ct:
            for c in CONNECTORS:
                stroke(c, ct, W_TEAL)
        for (cx, cy) in HEXES:
            h = hexagon(cx, cy)
            d.polygon(P(h), fill=ct if ct else (0, 0, 0, 0))
            stroke(h, ci, W_HEX, closed=True)
        stroke(ARROW_SHAFT, ci, W_SHAFT)
        d.polygon(P(ARROW_HEAD), fill=ci)

    return img.resize((size, size), Image.LANCZOS)


# ---------------------------------------------------------------------------
# Build
# ---------------------------------------------------------------------------
def build(out, bold_path, med_path):
    svg_dir = os.path.join(out, "brand")
    ico_dir = os.path.join(out, "icons")
    for p in (svg_dir, ico_dir):
        os.makedirs(p, exist_ok=True)

    w = lambda p, s: open(p, "w").write(s)

    w(f"{svg_dir}/icon.svg", icon_svg())
    w(f"{svg_dir}/icon-on-dark.svg", icon_svg(ink=INK_ON_DARK, teal=TEAL_ON_DARK))
    w(f"{svg_dir}/icon-reduced.svg", icon_reduced_svg())
    w(f"{svg_dir}/icon-reduced-on-dark.svg", icon_reduced_svg(ink=INK_ON_DARK))
    w(f"{svg_dir}/icon-mono-ink.svg", icon_svg(blue=None, teal=None))
    w(f"{svg_dir}/icon-mono-white.svg", icon_svg(ink="#FFFFFF", blue=None, teal=None))

    if bold_path and med_path:
        wb, wm = Wordmark(bold_path), Wordmark(med_path)
        w(f"{svg_dir}/lockup-horizontal-light.svg", lockup_svg(wb, wm))
        w(f"{svg_dir}/lockup-horizontal-dark.svg", lockup_svg(wb, wm, dark=True))
        w(f"{svg_dir}/lockup-stacked-light.svg", lockup_svg(wb, wm, stacked=True))
        w(f"{svg_dir}/lockup-stacked-dark.svg", lockup_svg(wb, wm, dark=True, stacked=True))
    else:
        print("!! no font supplied — lockups skipped", file=sys.stderr)

    raster(16, reduced=True).save(f"{ico_dir}/favicon-16x16.png")
    raster(32, reduced=True).save(f"{ico_dir}/favicon-32x32.png")
    raster(48).save(f"{ico_dir}/favicon-48x48.png")
    raster(96).save(f"{ico_dir}/favicon-96x96.png")
    raster(48, reduced=True).save(
        os.path.join(out, "favicon.ico"), sizes=[(16, 16), (32, 32), (48, 48)]
    )
    raster(180, bg="#FFFFFF", pad_ratio=0.13).save(f"{ico_dir}/apple-touch-icon-180.png")
    raster(192).save(f"{ico_dir}/icon-192.png")
    raster(192, ink=INK_ON_DARK, teal=TEAL_ON_DARK).save(f"{ico_dir}/icon-192-on-dark.png")
    raster(512, ink=INK_ON_DARK, teal=TEAL_ON_DARK).save(f"{ico_dir}/icon-512-on-dark.png")
    raster(512).save(f"{ico_dir}/icon-512.png")
    raster(512, bg="#FFFFFF", pad_ratio=0.20).save(f"{ico_dir}/icon-maskable-512.png")
    raster(1024).save(f"{ico_dir}/icon-1024-master.png")
    print(f"brand assets written to {out}/")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="public")
    ap.add_argument("--inter-bold")
    ap.add_argument("--inter-medium")
    a = ap.parse_args()
    build(a.out, a.inter_bold, a.inter_medium)
