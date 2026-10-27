"""Draws the New York night skyline used behind the site's glass panels.

Three silhouette layers (far, mid, near) against a warm gold horizon glow, with lit windows in the
house gold. Landmarks: Chrysler Building, Empire State Building, 432 Park Avenue, One World Trade Center.
Deterministic (fixed random seed), so every build produces the same picture.

  python site/tools/skyline.py
writes site/assets/skyline.svg (background image) and refreshes the inline copy in site/shell.html
(between <!--SKYLINE:START--> and <!--SKYLINE:END-->), whose lit windows the home intro switches on as you scroll.
"""
import os
import random
import re

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.dirname(HERE)
W, H = 1600, 420
GROUND = H
rng = random.Random(1931)  # the Empire State Building's opening year

FAR, MID, NEAR = "#221F1A", "#15140F", "#0A0A0B"
GOLD = "#E8C77B"


def rect(x, y, w, h):
    return [(x, y), (x + w, y), (x + w, GROUND), (x, GROUND)]


def path(points):
    return "M" + " L".join("%.1f %.1f" % p for p in points) + " Z"


shapes = {"far": [], "mid": [], "near": []}
windows = []  # (x, y, cls, opacity)


def lit(layer, x0, x1, y0, y1, p, step=(8, 10)):
    """Scatter lit windows inside a box (left, right, top, bottom)."""
    sx, sy = step
    y = y0 + 6
    while y < y1 - 8:
        x = x0 + 4
        while x < x1 - 5:
            if rng.random() < p:
                windows.append((x, y, rng.choice(("w1", "w1", "w2", "w3")), rng.choice((.55, .7, .85, .95)), layer))
            x += sx
        y += sy


def block(layer, x, w, top, p=0.0, crown=None):
    pts = rect(x, top, w, GROUND - top)
    if crown == "step":  # a setback near the top
        s = max(4, w // 5)
        pts = [(x, top + 18), (x + s, top + 18), (x + s, top), (x + w - s, top), (x + w - s, top + 18), (x + w, top + 18), (x + w, GROUND), (x, GROUND)]
    elif crown == "spire":
        pts = [(x, top), (x + w / 2 - 2, top - 14), (x + w / 2, top - 30), (x + w / 2 + 2, top - 14), (x + w, top), (x + w, GROUND), (x, GROUND)]
    shapes[layer].append(path(pts))
    if p:
        lit(layer, x, x + w, top + (18 if crown == "step" else 0), GROUND, p)


# far layer: a low, dense ridge
x = -10
while x < W:
    w = rng.randint(26, 64)
    block("far", x, w, GROUND - rng.randint(110, 215), crown=rng.choice((None, None, "step")))
    x += w - rng.randint(0, 6)

# mid layer: midtown, with gaps left for the landmarks
x = -6
while x < W:
    w = rng.randint(34, 70)
    h = rng.randint(120, 230)
    if not (430 < x + w and x < 545) and not (720 < x + w and x < 870):
        block("mid", x, w, GROUND - h, p=.10, crown=rng.choice((None, "step", None, "spire" if rng.random() < .25 else None)))
    x += w + rng.randint(4, 26)

# Chrysler Building: tower, stepped crown, needle
cx, cw, ctop = 482, 52, 175
shapes["mid"].append(path(rect(cx - cw / 2, ctop, cw, GROUND - ctop)))
lit("mid", cx - cw / 2, cx + cw / 2, ctop, GROUND, .14)
crown, half, y = [], cw / 2 - 4, ctop
for _ in range(6):
    crown.append((cx - half, y)); y -= 6; crown.append((cx - half, y)); half -= 3.6; y -= 5
left = crown + [(cx - 1.5, y), (cx, y - 58), (cx + 1.5, y)]
right = [(2 * cx - px, py) for px, py in reversed(crown)]
shapes["mid"].append(path(left + right))

# Empire State Building: setbacks, mast, antenna, with a beacon
ex = 795
tiers = [(98, 232), (76, 200), (58, 168), (42, 140), (30, 118), (14, 88)]
prev_top = GROUND
for w, top in tiers:
    shapes["mid"].append(path(rect(ex - w / 2, top, w, prev_top - top + 2)))
    if w > 20:
        lit("mid", ex - w / 2, ex + w / 2, top, prev_top, .16)
    prev_top = top
shapes["mid"].append(path([(ex - 1.6, 88), (ex - .6, 34), (ex + .6, 34), (ex + 1.6, 88)]))

# near layer: lower foreground blocks
x = -8
while x < W:
    w = rng.randint(40, 90)
    h = rng.randint(55, 150)
    if not (995 < x + w and x < 1040) and not (1150 < x + w and x < 1270):
        block("near", x, w, GROUND - h, p=.16, crown=rng.choice((None, None, "step")))
    x += w + rng.randint(10, 40)

# 432 Park Avenue: the pencil tower
shapes["near"].append(path(rect(1006, 74, 24, GROUND - 74)))
lit("near", 1006, 1030, 74, GROUND, .12, step=(7, 12))

# One World Trade Center: base, tapering obelisk, antenna, beacon
shapes["near"].append(path([(1168, GROUND), (1168, 344), (1191, 122), (1229, 122), (1252, 344), (1252, GROUND)]))
shapes["near"].append(path(rect(1194, 112, 32, 10)))
shapes["near"].append(path([(1208.8, 112), (1209.6, 16), (1210.4, 16), (1211.2, 112)]))
for yy in range(130, 340, 11):
    t = (yy - 122) / (344 - 122)
    l, r = 1191 - 23 * t, 1229 + 23 * t
    xx = l + 6
    while xx < r - 6:
        if rng.random() < .13:
            windows.append((xx, yy, rng.choice(("w1", "w2", "w3")), .8, "near"))
        xx += 8


def svg(inline):
    """inline=True: classes w1/w2/w3 on windows so CSS can switch them on; the file version shows them lit."""
    out = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %d %d" preserveAspectRatio="xMidYMax slice"%s>' % (W, H, ' class="sky-svg" aria-hidden="true" focusable="false"' if inline else ' role="img" aria-label="New York skyline at night"'),
           '<defs><radialGradient id="skyGlow" cx="50%" cy="100%" r="75%"><stop offset="0" stop-color="#C9A04F" stop-opacity=".30"/><stop offset=".45" stop-color="#8E6A2A" stop-opacity=".12"/><stop offset="1" stop-color="#0D0E10" stop-opacity="0"/></radialGradient>'
           '<linearGradient id="skyFade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0D0E10" stop-opacity="0"/><stop offset="1" stop-color="#0D0E10" stop-opacity=".55"/></linearGradient></defs>',
           '<rect width="%d" height="%d" fill="url(#skyGlow)"/>' % (W, H)]
    for layer, fill in (("far", FAR), ("mid", MID), ("near", NEAR)):
        out.append('<path fill="%s" d="%s"/>' % (fill, " ".join(shapes[layer])))
        if layer in ("mid", "near"):
            out.append('<g fill="%s">' % GOLD + "".join('<rect%s x="%.0f" y="%.0f" width="2.6" height="3.6" opacity="%s"/>' % (' class="%s"' % c if inline else "", x, y, o) for x, y, c, o, lay in windows if lay == layer) + "</g>")
    # beacons on the two tallest towers
    out.append('<g fill="%s"><circle cx="%d" cy="34" r="1.8"/><circle cx="%d" cy="34" r="6" opacity=".18"/><circle cx="1210" cy="16" r="1.8"/><circle cx="1210" cy="16" r="6" opacity=".18"/></g>' % (GOLD, ex, ex))
    out.append('<rect y="%d" width="%d" height="%d" fill="url(#skyFade)"/>' % (H - 90, W, 90))
    out.append("</svg>")
    return "".join(out)


if __name__ == "__main__":
    with open(os.path.join(SITE, "assets", "skyline.svg"), "w", encoding="utf-8") as f:
        f.write(svg(False))
    shell_path = os.path.join(SITE, "shell.html")
    shell = open(shell_path, encoding="utf-8").read()
    block_html = '<!--SKYLINE:START--><template id="tpl-skyline">' + svg(True) + "</template><!--SKYLINE:END-->"
    if "<!--SKYLINE:START-->" in shell:
        shell = re.sub(r"<!--SKYLINE:START-->.*?<!--SKYLINE:END-->", lambda m: block_html, shell, flags=re.S)
    else:
        shell = shell.replace("<!--SCRIPTS-->", block_html + "\n<!--SCRIPTS-->")
    open(shell_path, "w", encoding="utf-8").write(shell)
    print("skyline: %d lit windows, %d KB" % (len(windows), len(svg(False)) // 1024))
