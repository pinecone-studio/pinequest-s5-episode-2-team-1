"""Адал явдлын газрын зураг: 3 бүлэг (ой → тал → мөсөн уул) доороос дээш үргэлжилнэ, бүлэг бүрийн төгсгөлд boss.

Бүлэг бүр DESIGN.md §8-04-ийн 16 зангилаатай ижил зигзаг; бүлгүүдийн хооронд 2 гүүр чулуу. Нэг зурагт зурж,
утасны texture-ийн хязгаараас хэтрэхгүйн тулд 380px-ийн хэсгүүдэд хуваана. Зангилааны байрлалыг апп
mobile/src/lib/pixelBear/world.json-оос уншина, тиймээс мод зам дээр хэзээ ч ургахгүй.

Ажиллуулах:  python3 docs/design/pixel-bear/tools/mapgen_world.py && python3 mobile/scripts/build-sprites.py
"""
import json
import random
from pathlib import Path

import numpy as np
from PIL import Image

random.seed(11)
ROOT = Path(__file__).resolve().parents[4]
SPRITES = ROOT / 'docs/design/pixel-bear/sprites'
WORLD_JSON = ROOT / 'mobile/src/lib/pixelBear/world.json'


def hx(h): h = h.lstrip('#'); return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


class C:
    def __init__(s, w, h):
        s.w, s.h = w, h; s.a = np.zeros((h, w, 4), int)

    def p(s, x, y, col, al=255):
        x, y = int(x), int(y)
        if 0 <= x < s.w and 0 <= y < s.h:
            c = hx(col) if isinstance(col, str) else col
            if al >= 255 or s.a[y, x, 3] == 0: s.a[y, x, :3] = c; s.a[y, x, 3] = max(al, s.a[y, x, 3])
            else:
                t = al / 255; s.a[y, x, :3] = (np.array(c) * t + s.a[y, x, :3] * (1 - t)).astype(int)

    def rect(s, x0, y0, x1, y1, col, al=255):
        for y in range(int(y0), int(y1) + 1):
            for x in range(int(x0), int(x1) + 1): s.p(x, y, col, al)

    def poly(s, pts, col, al=255):
        xs = [p[0] for p in pts]; ys = [p[1] for p in pts]; n = len(pts)
        for y in range(max(0, int(min(ys)) - 1), min(s.h, int(max(ys)) + 2)):
            for x in range(max(0, int(min(xs)) - 1), min(s.w, int(max(xs)) + 2)):
                px, py = x + .5, y + .5; ins = False; j = n - 1
                for i in range(n):
                    xi, yi = pts[i]; xj, yj = pts[j]
                    if (yi > py) != (yj > py) and px < (xj - xi) * (py - yi) / (yj - yi) + xi: ins = not ins
                    j = i
                if ins: s.p(x, y, col, al)

    def ellipse(s, cx, cy, rx, ry, col):
        for y in range(int(cy - ry), int(cy + ry) + 1):
            for x in range(int(cx - rx), int(cx + rx) + 1):
                if ((x + .5 - cx) / rx) ** 2 + ((y + .5 - cy) / ry) ** 2 <= 1: s.p(x, y, col)

    def blit(s, spr, x, y):
        h, w, _ = spr.shape
        for j in range(h):
            for i in range(w):
                if spr[j, i, 3] > 0: s.p(x + i, y + j, tuple(spr[j, i, :3]), spr[j, i, 3])



def save(a, name): Image.fromarray(np.clip(a, 0, 255).astype(np.uint8), 'RGBA').save(SPRITES / f'{name}.png')


BAY = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]


def lerp(a, b, t): return tuple(int(round(x + (y - x) * t)) for x, y in zip(hx(a), hx(b)))


def vgrad(c, stops, band=60):
    """Босоо gradient: `band` px тутамд нэг өнгөний шат, шатуудын хооронд Bayer dither."""
    for (y0, c0), (y1, c1) in zip(stops, stops[1:]):
        nb = max(1, round((y1 - y0) / band))
        bands = [lerp(c0, c1, j / nb) for j in range(nb + 1)]
        for y in range(y0, min(y1, c.h)):
            s = (y - y0) / max(1, y1 - y0) * nb; i = min(int(s), nb - 1); f = s - i
            for x in range(c.w): c.p(x, y, bands[i + 1] if f * 16 > BAY[y % 4][x % 4] else bands[i])


def outline(spr, col):
    h, w, _ = spr.shape; o = np.zeros((h + 2, w + 2, 4), int); o[1:-1, 1:-1] = spr
    f = o[..., 3] > 0; c = hx(col)
    for y in range(h + 2):
        for x in range(w + 2):
            if not f[y, x] and any(0 <= y + dy < h + 2 and 0 <= x + dx < w + 2 and f[y + dy, x + dx]
                                   for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                o[y, x, :3] = c; o[y, x, 3] = 255
    return o


# ---------- бүлгүүд ----------
# (нэр, газрын дээд/доод өнгө, мод L/M/D/их бие/хүрээ, өвс, цэцэг, мангас boss-ын их бие/гэрэл/сүүдэр)
REGIONS = [
    dict(name='forest', top='#DCE9C9', bot='#BFDAA1', tree=('#6CC07A', '#3F9A5C', '#2B7148', '#8A5530', '#1E4A30'),
         grass='#9EC57F', flowers=['#FFFFFF', '#F2A7C0', '#F6D24A', '#B8A4FF']),  # boss: boss_pumpkin.py
    dict(name='steppe', top='#EFEBC8', bot='#DCD79F', tree=('#EBC75E', '#C9962E', '#9C6B22', '#7A4A28', '#5C3A12'),
         grass='#C2B266', flowers=['#FFFFFF', '#F29779', '#B8A4FF'], boss=('#F08A4B', '#F7B27F', '#C25E26')),
    dict(name='snow', top='#EEF4F3', bot='#DCE8E5', tree=('#FFFFFF', '#4F9A7A', '#2F6F57', '#7A5A44', '#1E4A3A'),
         grass='#C3D7D2', flowers=['#FFFFFF', '#B8E0F2'], boss=('#7CC6EA', '#B5E2F7', '#4A94BE')),
]
UNITS = len(REGIONS)
UNIT = 16
PITCH = 302  # бүлгийн өндөр (px): дотоод 255 + boss → гүүр → гүүр → дараагийн эхний чулуу (19+14+14)
W, H = 195, 380 + PITCH * (UNITS - 1)

# DESIGN.md §8-04 (dp). Бүлэг бүр ижил; 0-р бүлэг нь хуучин 390×760 газрын зурагтай яг давхцана.
DESIGN = [(140, 684), (180, 656), (220, 628), (272, 590), (220, 552), (180, 524), (128, 486), (180, 448),
          (220, 420), (272, 382), (220, 344), (180, 316), (128, 278), (180, 240), (220, 212), (272, 174)]

trail = []  # px; i = түвшний дугаар, гүүр чулуунд байхгүй
for k in range(UNITS):
    oy = (H - 380) - k * PITCH
    for j, (x, y) in enumerate(DESIGN):
        trail.append({'x': x // 2, 'y': y // 2 + oy, 'i': k * UNIT + j})
    if k < UNITS - 1:
        bx, by = trail[-1]['x'], trail[-1]['y']
        trail += [{'x': bx - 26, 'y': by - 19}, {'x': bx - 46, 'y': by - 33}]
nodes = [t for t in trail if 'i' in t]
assert [(n['x'] * 2, n['y'] * 2 - (H - 380) * 2) for n in nodes[:UNIT]] == DESIGN, '0-р бүлэг DESIGN хүснэгтээс зөрлөө'
for k in range(UNITS - 1):  # гүүрийн сүүлийн чулуунаас дараагийн бүлгийн эхний чулуу хүртэл ердийн алхам
    a, b = trail[(k + 1) * (UNIT + 2) - 1], nodes[(k + 1) * UNIT]
    assert (a['x'] - b['x'], a['y'] - b['y']) == (20, 14), (a, b)
bosses = [nodes[k * UNIT + UNIT - 1] for k in range(UNITS)]


def region_at(y):
    """Бүлгүүдийн зааг = гүүрийн дунд."""
    for k in range(UNITS - 1):
        if y > bosses[k]['y'] - 24: return k
    return UNITS - 1


def pine(w, h, pal, fade=False):
    c = C(w, h)
    L, M, D, T, O = pal
    if fade: L, M, D, T, O = '#A9D3B0', '#8FBF9C', '#7FAE90', '#B79A7E', '#8FAE98'
    tiers = 4; th = (h - 5) / tiers
    for t in range(tiers):
        top = t * th * 0.82; bot = top + th * 1.55
        half = (w / 2 - 1) * (0.45 + 0.55 * (t + 1) / tiers)
        cx = w / 2
        c.poly([(cx, top), (cx + half, bot), (cx - half, bot)], M)
        c.poly([(cx, top), (cx + half, bot), (cx + half * 0.15, bot)], D)
        c.poly([(cx, top + 1), (cx - half * 0.55, bot - 1), (cx - half * 0.2, bot - 1)], L)
    c.rect(w / 2 - 1, h - 6, w / 2 + 1, h - 1, T)
    return outline(c.a, O)


def boss(body, light, dark):
    """Мангас: эвэртэй бөөрөнхий биет, ууртай хөмсөг, соёо."""
    c = C(28, 26)
    c.poly([(5, 10), (10, 7), (3, 0)], '#F5E6C8'); c.poly([(22, 10), (17, 7), (24, 0)], '#F5E6C8')
    c.poly([(5, 10), (7, 8), (3, 0)], '#D9C7A3'); c.poly([(22, 10), (20, 8), (24, 0)], '#D9C7A3')
    c.rect(0, 14, 3, 17, dark); c.rect(24, 14, 27, 17, dark)  # гар
    c.ellipse(14, 15, 12, 10, body)
    c.ellipse(11, 12, 7, 5, light); c.ellipse(13, 15, 10, 7.5, body)
    for x in range(4, 25):  # доод сүүдэр
        for y in range(19, 25):
            if ((x + .5 - 14) / 12) ** 2 + ((y + .5 - 15) / 10) ** 2 <= 1 and y > 20 - (x - 4) / 8: c.p(x, y, dark)
    c.rect(7, 11, 11, 14, '#FFFFFF'); c.rect(16, 11, 20, 14, '#FFFFFF')
    c.rect(9, 12, 10, 13, '#2A140A'); c.rect(17, 12, 18, 13, '#2A140A')
    for i in range(4): c.p(7 + i, 9 + i // 2, '#2A140A'); c.p(20 - i, 9 + i // 2, '#2A140A')
    c.rect(9, 18, 18, 19, '#2A140A'); c.p(10, 17, '#FFFFFF'); c.p(17, 17, '#FFFFFF')
    c.rect(7, 24, 11, 25, dark); c.rect(16, 24, 20, 25, dark)  # хөл
    return outline(c.a, '#2A140A')


def flag():
    c = C(14, 26)
    c.rect(1, 2, 2, 25, '#5A5A66')
    c.poly([(3, 2), (13, 6), (3, 10)], '#8B6CF6'); c.poly([(3, 2), (9, 4), (3, 6)], '#B7A3FF')
    return outline(c.a, '#2A140A')


# ---------- газар ----------
m = C(W, H)
stops = [(0, '#E6EFE3')]
for k in reversed(range(UNITS)):
    top = 0 if k == UNITS - 1 else bosses[k]['y'] - 24
    bot = H if k == 0 else bosses[k - 1]['y'] - 24
    stops += [(top + 40, REGIONS[k]['top']), (bot - 30, REGIONS[k]['bot'])]
stops.append((H, REGIONS[0]['bot']))
vgrad(m, stops)
# уулс (зөвхөн хамгийн дээд бүлэгт)
for (cx, hw, top, col) in [(30, 60, 18, '#C9D9D6'), (120, 70, 10, '#C3D4D2'), (190, 50, 22, '#C9D9D6'), (80, 40, 26, '#D3E0DB')]:
    m.poly([(cx - hw, 58), (cx, top), (cx + hw, 58)], col)
    m.poly([(cx, top), (cx + 5, top + 4), (cx + 2, top + 5), (cx - 1, top + 7), (cx - 4, top + 4)], '#F4F8F6')
for y in range(50, 64):
    for x in range(W):
        if random.random() < (y - 50) / 14: m.p(x, y, REGIONS[-1]['top'])
for x in range(-4, W, 9):
    m.blit(pine(9, 15, REGIONS[-1]['tree'], fade=True), x + random.randint(-2, 2), 46 + random.randint(-2, 3))

# boss ба туг: зангилааны баруун талд (PathMap.tsx-ийн BOSS_DX)
avoid = [(t['x'], t['y']) for t in trail] + [(b['x'] + 24, b['y']) for b in bosses]


def near_path(tx, ty): return any(abs(tx - x) < 34 and -40 < ty - y < 24 for x, y in avoid)


trees = []
for ty in range(70, H, 26):
    for side in (0, 1):
        tx = random.randint(-6, 16) if side == 0 else random.randint(168, 190)
        trees.append((tx, ty + random.randint(-8, 8), random.choice([(20, 32), (24, 38), (18, 28)])))
for _ in range(UNITS * 8):
    tx, ty = random.randint(20, 170), random.randint(70, H - 30)
    if not near_path(tx, ty): trees.append((tx, ty, random.choice([(16, 26), (14, 22), (18, 30)])))
trees = [t for t in trees if not near_path(t[0], t[1])]
for _ in range(170 * H // 380):
    tx, ty = random.randint(0, W - 1), random.randint(66, H - 1)
    if near_path(tx, ty): continue
    r = REGIONS[region_at(ty)]
    if random.random() < 0.75:
        m.p(tx, ty, r['grass']); m.p(tx - 1, ty - 1, r['grass']); m.p(tx + 1, ty - 1, r['grass'])
    else:
        m.p(tx, ty + 1, '#6FA357'); m.p(tx, ty, random.choice(r['flowers']))
for tx, ty, (tw, th) in sorted(trees, key=lambda t: t[1] + t[2][1]):
    for xx in range(tx + 2, tx + tw): m.p(xx, ty + th, '#9FC486', 150)
    m.blit(pine(tw, th, REGIONS[region_at(ty + th)]['tree']), tx, ty)

def bear_turn(name):
    """Тулааны баавгай: газрын зургийн баавгайн (map_bear*.png) нүүрийг boss руу (зүүн тийш) эргүүлнэ.
    Нүүрийг (нүд, хоншоор, хацрын сүүдэр) задлахгүй бүхэлд нь 2px шилжүүлж, баруун хацрыг үсээр нөхнө."""
    o = np.array(Image.open(SPRITES / f'{name}.png').convert('RGBA')).astype(int)
    a = o.copy()
    OUT = (42, 20, 10, 255)
    a[10, 5:25] = o[10, 7:27]; a[10, 25:27] = o[10, 27]  # хөмсөг (толгойн хүрээг дарахгүй)
    for y in range(11, 24):
        a[y, 4:27] = o[y, 6:29]; a[y, 27:29] = o[y, 29]
    a[24, 9:21] = o[24, 11:23]; a[24, 21:28] = OUT  # эрүүний доод мөр

    def cream(p): return p[3] > 0 and p[0] > 230 and p[1] > 150

    def fur(p): return p[3] > 0 and 120 <= p[0] <= 215 and 60 <= p[1] <= 140 and p[2] < 110

    belly = [(y, x) for y in range(31, 48) for x in range(9, 25) if cream(o[y, x])]  # гэдэс 1px, хүрээ/ороолтыг дарахгүй
    for y, x in belly: a[y, x] = (182, 107, 69, 255)
    for y, x in belly:
        if fur(a[y, x - 1]) or cream(a[y, x - 1]): a[y, x - 1] = o[y, x]
    return a


def bear_battle():
    """Тулааны баавгайн frame-ууд (BossArena.tsx-ийн F): 0 зогсох, 1 амьсгал, 2 ирмэх, 3 шидэх, 4 цочих, 5 цагаан,
    6 бэлдэх, 7 цэнэглэх, 8 дагах, 9–10 гүйх, 11 хумсаа өргөх, 12 сарвуудах. Ойрын (зүүн) гарыг биеэс салгаж
    frame бүрт мөрнөөс сарвуу хүртэл шинээр зурна, тиймээс гар нь од шидэх, сарвуудах үед бодитоор хөдөлнө.
    Pixel бүхэл алхмаар хөдөлдөг тул scale-ээр сунгахгүй (Scott Pilgrim маягийн frame анимаци)."""
    PADL = 8
    pad = lambda a: np.pad(a, ((0, 0), (PADL, 2), (0, 0)))  # урд талд сунгасан гар, одны зай
    W, L, Y, OUT = (255, 255, 255, 255), (243, 246, 108, 255), (255, 224, 138, 255), (42, 20, 10, 255)
    FUR, SHADE = '#b66b45', '#965434'
    SEP = {33: 9, 34: 9, 35: 9, 36: 9, 37: 8, 38: 8, 39: 9, 40: 9, 41: 8, 42: 8, 43: 7, 44: 7, 45: 6, 46: 6}

    def armless(a):  # ойрын гарыг арилгаж биеийн ирмэгийг хүрээгээр хаана
        b = a.copy()
        for y, sep in SEP.items():
            b[y, :PADL + sep] = 0
            if b[y, PADL + sep, 3]: b[y, PADL + sep] = OUT
        return b

    base, blink = armless(pad(bear_turn('map_bear'))), armless(pad(bear_turn('map_bear_blink')))

    def breathe(a):
        b = a.copy(); b[1:31] = a[0:30]; b[0] = 0
        return b

    def lean(a, dx):  # толгой+ороолт dx, цээж dx/2
        b = np.zeros_like(a)
        for y in range(a.shape[0]):
            d = dx if y <= 30 else int(dx / 2) if y <= 44 else 0
            b[y] = np.roll(a[y], d, axis=0)
        return b

    def legs(a, lift_left=0, lift_right=0):  # гүйх: нэг хөлөө өргөнө
        b = a.copy()
        for side, lift in ((range(0, PADL + 17), lift_left), (range(PADL + 17, a.shape[1]), lift_right)):
            if not lift: continue
            cols = list(side)
            part = a[47:61, cols].copy()
            b[47:61, cols] = 0
            b[47 - lift:61 - lift, cols] = np.where(part[..., 3:] > 0, part, b[47 - lift:61 - lift, cols])
        return b

    def arm(a, dx, to, claws=False):
        """Мөрнөөс (лийн шилжилттэй) `to` (мөрнөөс харьцангуй) хүртэл 5px өргөн гар; доод тал нь сүүдэртэй."""
        sx, sy = PADL + 6 + int(dx / 2), 34
        px, py = sx + to[0], sy + to[1]
        h, w = a.shape[:2]
        c = C(w, h)
        n = max(1, int(max(abs(px - sx), abs(py - sy)) * 2))
        for i in range(n + 1):
            t = i / n
            c.ellipse(sx + (px - sx) * t + .5, sy + (py - sy) * t + .5, 2.6, 2.6, FUR)
        nx, ny = (py - sy), -(px - sx)  # гарын тэнхлэгт перпендикуляр: доод талд сүүдэр
        ln = max(1e-6, (nx * nx + ny * ny) ** .5); nx, ny = nx / ln, ny / ln
        if ny < 0: nx, ny = -nx, -ny
        for i in range(n + 1):
            t = i / n
            c.p(sx + (px - sx) * t + nx * 1.6 + .5, sy + (py - sy) * t + ny * 1.6 + .5, SHADE)
        if claws:
            m = max(1e-6, ((px - sx) ** 2 + (py - sy) ** 2) ** .5); ux, uy = (px - sx) / m, (py - sy) / m
            for k in (-1, 0, 1):  # гурван хумс сарвууны үзүүрээс
                for d in (3, 4):
                    c.p(px + ux * d - uy * k * 1.4 + .5, py + uy * d + ux * k * 1.4 + .5, '#FFFFFF')
        o = outline(c.a, '#2a140a')[1:-1, 1:-1]
        b = a.copy(); b[o[..., 3] > 0] = o[o[..., 3] > 0]
        return b, (px, py)

    def glow(a, at, kind):
        b = a.copy(); x0, y0 = int(at[0]), int(at[1])
        pts = {'spark': [(0, 0, W), (-1, -1, L), (1, 1, L)],
               'star': [(0, d, L) for d in range(-3, 4)] + [(d, 0, L) for d in range(-3, 4)] + [(-1, -1, Y), (1, -1, Y), (-1, 1, Y), (1, 1, Y), (0, 0, W)],
               'burst': [(d, 0, W) for d in range(-4, 5)] + [(0, d, W) for d in range(-4, 5)] + [(-2, -2, L), (2, -2, L), (-2, 2, L), (2, 2, L), (-3, -3, Y), (3, -3, Y), (-3, 3, Y), (3, 3, Y)]}[kind]
        for dx_, dy_, col in pts:
            x, y = x0 + dx_, y0 + dy_
            if 0 <= x < b.shape[1] and 0 <= y < b.shape[0]: b[y, x] = col
        return b

    def pose(src, dx, to, fx=None, claws=False, lift=(0, 0), up=0):
        f = legs(lean(src, dx), *lift)
        if up: f = np.concatenate([f[up:], np.zeros_like(f[:up])])  # бүтэн бие дээш (ороож эргүүлэхгүй)
        f, paw = arm(f, dx, (to[0], to[1] - up), claws)
        return glow(f, paw, fx) if fx else f

    hurt = pose(blink, 2, (-3, 11))
    white = hurt.copy(); white[white[..., 3] > 0, :3] = 255
    frames = [
        pose(base, 0, (-3, 11)),                    # 0 зогсох
        pose(breathe(base), 0, (-3, 11)),           # 1 амьсгал
        pose(blink, 0, (-3, 11)),                   # 2 ирмэх
        pose(base, -2, (-11, -2), 'burst'),         # 3 шидэх: гар урагш, гэрэл тэсэрнэ
        hurt,                                        # 4 цочих
        white,                                       # 5 цагаан
        pose(base, 1, (-4, -7), 'spark'),           # 6 бэлдэх: гараа нүүрний урд өргөж, оч
        pose(base, 2, (-6, -10), 'star'),           # 7 цэнэглэх: гар өндөрт, од томорно
        pose(base, -1, (-9, 6)),                    # 8 дагах: гар урагш-доош
        pose(base, -2, (4, 8), lift=(2, 0), up=1),  # 9 гүйх A
        pose(base, -2, (-7, 7), lift=(0, 2)),       # 10 гүйх B
        pose(base, -1, (-5, -10), claws=True),      # 11 хумсаа өргөх
        pose(base, -3, (-10, 6), claws=True),       # 12 сарвуудах
    ]
    return np.concatenate(frames, axis=1)


def bear_gallop():
    """4 хөлөөрөө давхих баавгай (4 frame, 64×61): толгой нь жинхэнэ баавгайнх (bear_turn), бие/хөл/сүүл/ороолтыг
    энд зурна. Цикл: 0 тэнийх → 1 хумих (агаарт) → 2 урд хөлөөр газардах → 3 хойд хөлөөр түлхэх (тоос)."""
    FW, FH = 64, 61
    head = outline(bear_turn('map_bear')[0:25, 0:34], '#2a140a')  # доод талдаа хүрээтэй (наасан мэт харагдахгүй)
    FUR, FAR, SHADE, BELLY = '#b66b45', '#8f4f30', '#9f5736', '#e3ad7c'
    G, GD, GO = '#2f7a4c', '#1d5434', '#e9b949'
    # хөлийн [ёзоор → сарвуу] (ёзоорт харьцангуй), frame бүрт: урд-ойр, урд-хол, хойд-ойр, хойд-хол
    LEGS = [
        [(-7, 10), (-5, 10), (7, 10), (5, 10)],   # тэнийх
        [(-1, 8), (1, 8), (-2, 8), (0, 8)],       # хумих
        [(-3, 11), (-5, 10), (5, 7), (3, 8)],     # урд газардах
        [(-5, 7), (-3, 8), (7, 10), (5, 11)],     # хойд түлхэх
    ]
    BOB = [0, -2, 0, -1]
    frames = []
    for k in range(4):
        c = C(FW, FH)
        up = BOB[k]
        roots = [(30, 48 + up), (33, 48 + up), (50, 48 + up), (53, 48 + up)]

        def leg(i, col):
            (rx, ry), (dx, dy) = roots[i], LEGS[k][i]
            for t in np.linspace(0, 1, 16):
                c.ellipse(rx + dx * t + .5, ry + dy * t + .5, 3.4 - t * 0.6, 3.4 - t * 0.6, col)
            c.ellipse(rx + dx + .5, ry + dy + .3, 3.4, 2.0, col)  # сарвуу

        leg(1, FAR); leg(3, FAR)  # цаад хөлүүд биеийн ард
        c.ellipse(42, 42 + up, 17, 9.5, FUR)  # бие: намхан, бөөрөнхий
        c.ellipse(33, 36 + up, 8, 6.5, FUR)  # мөрний бөгтөр
        c.ellipse(51, 39 + up, 9, 9, FUR)  # том ташаа
        c.ellipse(46, 35 + up, 11, 3.5, '#c98257')  # нурууны гэрэл
        c.ellipse(41, 48 + up, 12, 3, BELLY)  # хэвлийн доод тал
        c.ellipse(60, 37 + up, 3, 3, FUR)  # сүүл
        leg(0, FUR); leg(2, FUR)
        # ороолт: хүзүүнд ороож, үзүүр нь араас намирна (frame бүрт өөр)
        tail = [(28, 33 + up), (47, 28 + up + (k % 2)), (50, 32 + up + (k % 2)), (30, 38 + up)]
        c.poly(tail, G); c.poly([tail[1], tail[2], (45, 32 + up)], GD)
        c.rect(47, 28 + up + (k % 2), 49, 29 + up + (k % 2), GO)
        a = outline(c.a, '#2a140a')[1:-1, 1:-1]
        hy = 13 + up + (1 if k == 2 else 0)  # толгой: давхих хэмнэлээр бага зэрэг дохино
        for y in range(head.shape[0]):
            for x in range(head.shape[1]):
                if head[y, x, 3] and 0 <= hy + y < FH and 0 <= x < FW: a[hy + y, x] = head[y, x]
        if k == 3:  # хойд сарвууны араас тоос
            for (x, y) in [(60, 57), (62, 55), (61, 59), (58, 59)]: a[y, x] = (233, 225, 210, 200)
        frames.append(a)
    return np.concatenate(frames, axis=1)


def slash():
    """Сарвуудсан ул мөр: 3 frame (гурван зураас сунаж гарч → бүрэн → бүдгэрнэ), 24×24."""
    frames = []
    for k in range(3):
        c = C(24, 24)
        for j in range(3):
            ox = 5 + j * 5
            n = (8, 18, 18)[k]
            for i in range(n):
                x, y = ox + i * 0.55, 2 + i
                if k < 2: c.p(x, y, '#FFFFFF'); c.p(x + 1, y, '#F3F66C')
                else: c.p(x, y, '#F3F66C', 150); c.p(x + 1, y, '#F3F66C', 150)
        frames.append(c.a)
    return np.concatenate(frames, axis=1)


def white_of(name):
    """Цохиулсан агшны цагаан дүрс (boss-ын дээр анивчина)."""
    a = np.array(Image.open(SPRITES / f'{name}.png').convert('RGBA')).astype(int)
    a[a[..., 3] > 0, :3] = 255
    return a


def spark(core, ray, dot):
    """Онох агшны оч: 3 frame (жижиг од → 8 цацрагтай тэсрэлт → тарсан цэгүүд)."""
    frames = []
    for k in range(3):
        c = C(15, 15)
        if k == 0:
            c.rect(6, 4, 8, 10, core); c.rect(4, 6, 10, 8, core); c.rect(7, 7, 7, 7, '#FFFFFF')
        elif k == 1:
            for i in range(-6, 7):
                c.p(7 + i, 7, ray); c.p(7, 7 + i, ray)
                if abs(i) < 5: c.p(7 + i, 7 + i, ray); c.p(7 + i, 7 - i, ray)
            c.rect(5, 5, 9, 9, core); c.rect(6, 6, 8, 8, '#FFFFFF')
        else:
            for (x, y) in [(1, 7), (13, 7), (7, 1), (7, 13), (3, 3), (11, 3), (3, 11), (11, 11)]: c.rect(x, y, x + 1, y + 1, dot)
        frames.append(c.a)
    return np.concatenate(frames, axis=1)


# ---------- boss-ын гэр (тулааны дэвсгэр) ----------
# 430×464 dp (2×): самбарын доод талд төвлөрнө. Газар LG мөрөөс эхэлнэ = BossArena-ийн GROUND (доороос 102 dp).
# Boss зүүн талд (x≈14–84), баавгай баруун талд (x≈149–190) зогсдог тул тэдгээрийн хооронд гол барилга.
LW, LH, LG = 215, 232, 181
lr = random.Random(5)  # газрын зургийн random дарааллыг өөрчлөхгүй


def sky_dots(c, n, ymax, cols, skip=lambda x, y: False):
    for _ in range(n):
        x, y = lr.randrange(LW), lr.randrange(ymax)
        if not skip(x, y): c.p(x, y, lr.choice(cols))


def tufts(c, col, n, y0=LG, y1=LH):
    for _ in range(n):
        x, y = lr.randrange(LW), lr.randrange(y0, y1)
        c.p(x, y, col); c.p(x - 1, y - 1, col); c.p(x + 1, y - 1, col)


def pumpkin():
    c = C(7, 6)
    c.ellipse(3.5, 3.5, 3.5, 2.6, '#E07B2E'); c.rect(3, 1, 3, 5, '#B85A1E'); c.rect(3, 0, 3, 1, '#4F7A2E')
    return outline(c.a, '#2A140A')


def lair_pumpkin():
    """Хулуун шидтэн: сартай шөнө, сүнстэй байшин, хуурай мод, булш, хулуунууд."""
    c = C(LW, LH)
    vgrad(c, [(0, '#170C38'), (110, '#3A2170'), (LG, '#6A4596')], 30)
    sky_dots(c, 70, 120, ['#FFFFFF', '#F3F66C', '#CFC6FF'], lambda x, y: (x - 178) ** 2 + (y - 36) ** 2 < 400)
    for y in range(10, 62):  # сарны туяа
        for x in range(152, 205):
            d = ((x - 178) ** 2 + (y - 36) ** 2) ** 0.5
            if 15 < d < 23 and (x + y) % 2: c.p(x, y, '#F3F0C8', 50)
    c.ellipse(178, 36, 15, 15, '#F3F0C8'); c.ellipse(172, 31, 3, 3, '#DAD3A3'); c.ellipse(184, 42, 2.5, 2.5, '#DAD3A3'); c.ellipse(181, 28, 1.6, 1.6, '#DAD3A3')
    c.poly([(0, LG), (0, 158), (30, 150), (70, 160), (110, 148), (160, 156), (215, 146), (215, LG)], '#2C1B55')
    # хуурай мод (зүүн захад, boss-ын ард)
    c.rect(8, 96, 12, LG, '#1C1136')
    for (x0, y0, x1, y1) in [(10, 120, 0, 104), (10, 110, 26, 92), (20, 100, 30, 98), (6, 106, 2, 92), (10, 132, 30, 120)]:
        for t in range(21):
            c.rect(x0 + (x1 - x0) * t / 20, y0 + (y1 - y0) * t / 20, x0 + (x1 - x0) * t / 20 + 1, y0 + (y1 - y0) * t / 20, '#1C1136')
    # сүнстэй байшин: гол их бие, хазгай дээвэр, цамхаг
    h = C(LW, LH)
    h.rect(86, 122, 132, LG, '#2A1B4C'); h.poly([(80, 124), (108, 94), (138, 124)], '#1F1440')
    h.rect(122, 92, 140, LG, '#251846'); h.poly([(118, 94), (131, 64), (144, 94)], '#1A1038'); h.rect(130, 58, 131, 64, '#1A1038')
    h.rect(86, 122, 87, LG, '#4B3580'); h.rect(122, 92, 123, LG, '#4B3580')  # сарны гэрэл туссан ирмэг
    for (x, y, col) in [(92, 132, '#F6C445'), (110, 132, '#9CF06A'), (127, 104, '#F6C445'), (92, 150, '#F6C445'), (127, 126, '#9CF06A')]:
        h.rect(x, y, x + 6, y + 7, '#5A3A1E'); h.rect(x + 1, y + 1, x + 5, y + 6, col); h.rect(x + 3, y + 1, x + 3, y + 6, '#5A3A1E')
    h.rect(104, 160, 114, LG, '#140B28'); h.ellipse(109, 160, 5, 4, '#140B28')
    c.blit(outline(h.a, '#0F0820')[1:-1, 1:-1], 0, 0)
    # газар
    vgrad(c, [(LG, '#3B3060'), (LH, '#1B1530')], 18)
    for x in range(LW):
        if lr.random() < 0.5: c.p(x, LG, '#5A4C8A')
    tufts(c, '#4E4280', 45)
    for x in range(140, 215, 9): c.rect(x, LG - 9, x + 1, LG, '#2A2048'); c.p(x, LG - 10, '#2A2048')  # хашаа
    c.rect(140, LG - 6, 215, LG - 6, '#2A2048')
    for gx in (96, 196):  # булшны чулуу
        c.rect(gx, LG - 9, gx + 7, LG, '#8E8AA6'); c.ellipse(gx + 3.5, LG - 9, 3.5, 3, '#8E8AA6'); c.rect(gx + 3, LG - 8, gx + 4, LG - 3, '#5E5A78'); c.rect(gx + 1, LG - 6, gx + 6, LG - 6, '#5E5A78')
    for (x, y) in [(118, LG + 4), (88, LG + 12), (134, LG + 16), (204, LG + 9), (4, LG + 18)]: c.blit(pumpkin(), x, y)
    for y in range(LG - 6, LG + 4):  # газрын манан
        for x in range(LW):
            if (x // 3 + y) % 3 == 0: c.p(x, y, '#B9A8E8', 40)
    return c.a


def lair_steppe():
    """Талын мангас: жаргах нар, хадан агуй, хад чулуу, хуурай өвс, яс."""
    c = C(LW, LH)
    vgrad(c, [(0, '#2B1B44'), (80, '#6B3456'), (140, '#D2704A'), (LG, '#F4B66A')], 25)
    sky_dots(c, 25, 70, ['#FFFFFF', '#F3D7C8'])
    c.ellipse(192, 134, 20, 20, '#FFC86A'); c.ellipse(192, 134, 15, 15, '#FFE3A0')  # уулын хяр дээгүүр цухуйсан нар
    for y in range(124, 152, 5): c.rect(170, y, 214, y, '#F0A055')
    c.poly([(0, LG), (0, 150), (40, 136), (80, 150), (130, 132), (175, 146), (215, 128), (215, LG)], '#7A3A4E')
    c.poly([(0, LG), (60, 160), (120, 168), (215, 152), (215, LG)], '#5E2E40')
    # хадан хясаа ба агуйн ам (boss-ын ард)
    r = C(LW, LH)
    r.poly([(0, LG), (0, 62), (22, 52), (46, 60), (66, 80), (88, 104), (104, 132), (112, LG)], '#7A5442')
    r.poly([(66, 80), (88, 104), (104, 132), (112, LG), (78, LG), (70, 120)], '#573B2E')
    r.poly([(0, 62), (22, 52), (46, 60), (40, 66), (20, 60), (0, 70)], '#9C735C')
    for (x, y, w) in [(14, 90, 10), (40, 112, 8), (8, 140, 12), (58, 100, 6)]: r.rect(x, y, x + w, y, '#573B2E')  # ан цав
    r.ellipse(50, LG, 30, 46, '#1E120E'); r.ellipse(50, LG, 22, 38, '#120A08')
    c.blit(outline(r.a, '#2E1C14')[1:-1, 1:-1], 0, 0)
    for (x, y, rx, ry) in [(126, LG - 3, 7, 5), (205, LG - 4, 10, 7), (196, LG - 1, 5, 3)]:
        c.ellipse(x, y, rx, ry, '#6E5040'); c.ellipse(x - 1, y - 2, rx - 2, ry - 2, '#8C6A55')
    vgrad(c, [(LG, '#A07E48'), (LH, '#6A4E2C')], 18)
    for x in range(LW):
        if lr.random() < 0.5: c.p(x, LG, '#C8A866')
    tufts(c, '#D2BE6E', 55)
    for (x, y) in [(112, LG + 14), (186, LG + 22)]:  # яс
        c.rect(x, y, x + 8, y + 1, '#EDE3CF'); c.rect(x - 1, y - 1, x, y + 2, '#EDE3CF'); c.rect(x + 8, y - 1, x + 9, y + 2, '#EDE3CF')
    return c.a


def lair_ice():
    """Мөсөн мангас: туйлын туяа, мөсөн ордон, цасан шуурга, мөсөн хэлтэрхий."""
    c = C(LW, LH)
    vgrad(c, [(0, '#0A1A36'), (110, '#1D4A6C'), (LG, '#5797B2')], 30)
    sky_dots(c, 45, 110, ['#FFFFFF', '#CFEFFF'])
    for x in range(LW):  # туйлын туяа
        y = 28 + 9 * np.sin(x / 17) + 4 * np.sin(x / 7)
        for k in range(16):
            c.p(x, y + k, '#7EF0C0' if k < 8 else '#5FD0E8', max(0, 110 - k * 7))
    p = C(LW, LH)
    p.rect(16, 128, 138, LG, '#A9D8EE'); p.rect(78, 128, 138, LG, '#8CC4DE')
    for (x, w, top) in [(20, 16, 98), (48, 18, 78), (82, 22, 56), (118, 16, 92)]:
        p.rect(x, top, x + w, LG, '#C9EBF8'); p.rect(x + w // 2, top, x + w, LG, '#9CCDE4')
        p.poly([(x - 2, top + 1), (x + w / 2, top - 22), (x + w + 2, top + 1)], '#E4F6FC'); p.poly([(x + w / 2, top - 22), (x + w + 2, top + 1), (x + w / 2, top + 1)], '#A9D8EE')
        for wy in range(top + 8, LG - 14, 14): p.rect(x + w // 2 - 2, wy, x + w // 2 + 1, wy + 5, '#FFF6A0')
    for x in range(16, 139, 6): p.rect(x, 124, x + 3, 128, '#C9EBF8')  # хананы шүд
    p.rect(60, 150, 80, LG, '#1E3F5A'); p.ellipse(70, 150, 10, 9, '#1E3F5A')  # хаалга
    c.blit(outline(p.a, '#2E5E78')[1:-1, 1:-1], 0, 0)
    vgrad(c, [(LG, '#EAF6FA'), (LH, '#B5D5E2')], 18)
    for x in range(LW):
        if lr.random() < 0.6: c.p(x, LG, '#FFFFFF')
    for (x, y) in [(104, LG + 6), (196, LG + 12), (134, LG + 20), (8, LG + 14)]:  # мөсөн хэлтэрхий
        c.poly([(x, y + 6), (x + 3, y), (x + 7, y + 6)], '#BFE6F5'); c.poly([(x + 3, y), (x + 7, y + 6), (x + 4, y + 6)], '#8CC4DE')
    sky_dots(c, 60, LG, ['#FFFFFF'])  # цас
    return c.a


# ---------- хадгалах ----------
for k in range(UNITS):  # доороос дээш: 0 = эхний бүлэг
    y1 = H - k * 380; y0 = max(0, y1 - 380)
    save(m.a[y0:y1], f'map_world_{k}')
    print(f'map_world_{k}: {W}x{y1 - y0}')
    if y0 == 0: break
for k, r in enumerate(REGIONS):
    if 'boss' in r: save(boss(*r['boss']), f'map_boss_{k}')
save(flag(), 'map_flag')
for k, lair in enumerate([lair_pumpkin, lair_steppe, lair_ice]): save(lair(), f'lair_{k}')
save(bear_battle(), 'bear_battle')
save(slash(), 'fx_slash')
save(bear_gallop(), 'bear_gallop')
for n in ['map_boss_1', 'map_boss_2']: save(white_of(n), f'{n}_white')  # хулууных sheet-дээ (boss_pumpkin.py)
save(spark('#F3F66C', '#FFE08A', '#FFFFFF'), 'fx_spark'); save(spark('#9CF06A', '#5FD068', '#D9FF7A'), 'fx_spark_magic')
WORLD_JSON.write_text(json.dumps({
    '//': 'Автоматаар үүсгэсэн: docs/design/pixel-bear/tools/mapgen_world.py. Гараар засахгүй.',
    'width': W * 2, 'height': H * 2, 'unitSize': UNIT, 'units': UNITS,
    'trail': [{**t, 'x': t['x'] * 2, 'y': t['y'] * 2} for t in trail],
}, ensure_ascii=False) + '\n')
print(f'{WORLD_JSON.relative_to(ROOT)}: {len(nodes)} зангилаа, {W * 2}x{H * 2} dp')
