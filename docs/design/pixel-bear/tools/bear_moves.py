"""Тулааны баавгайн хөдөлгөөн: «манай баавгай» (map_bear.png)-ын бие + кодоор зурсан гар, хөл.

Гар, хөлийг жижиг z-buffer renderer-ээр зурна: үе бүр (мөр → тохой → сарвуу, ташаа → өвдөг → тавхай) нь гэрэл
(зүүн дээрээс) тусах бөмбөрцөг/капсул, өнгө нь баавгайн өөрийн палитрын шатаар Bayer dither-тэй. Ойр/хол хэсгийн
заагт z-ийн ялгаагаар дотоод зураас гарна, тиймээс гар биеийн урд, хөл нь биеийн доор бодитоор давхарлана.
Нүүрийг задлахгүй: толгой, гэдэс, ороолт нь эх sprite-аас бүтнээрээ ирнэ.

Гаралт (docs/design/pixel-bear/sprites):
  bear_battle.png  14 frame × 48×61: зогсох, амьсгал, ирмэх, од шидэх 6 frame, цочих, цагаан, сарвуудах 3 frame
  bear_run.png      9 frame × 48×61: 2 хөлөөр гүйх 8 frame + урагшаа харсан (эргэх) frame. Буцахдаа апп толин
                    тусгалаар эргүүлнэ (frame-ийн бие голдоо байгаа тул байрнаасаа хөдлөхгүй).

Ажиллуулах:  python3 docs/design/pixel-bear/tools/bear_moves.py && python3 mobile/scripts/build-sprites.py
Шалгах:      python3 docs/design/pixel-bear/tools/bear_moves.py --preview <dir>   (8× томруулсан contact sheet)
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[4]
SPRITES = ROOT / 'docs/design/pixel-bear/sprites'


def hx(h): h = h.lstrip('#'); return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)])


OUT = hx('#2a140a')
LINE = hx('#4b2016')  # дотоод зааг (гар биеийн урд гэх мэт)
# map_bear.png-ийн палитр: харанхуйгаас гэгээ рүү
FUR = [hx(c) for c in ('#532519', '#6a3321', '#7c3f29', '#8f4c2f', '#a05837', '#b56741', '#c27248', '#cf8256')]
PAD = [hx(c) for c in ('#ca855a', '#e4a474', '#f7c38e', '#fdd5a5')]
CLAW = [hx(c) for c in ('#b9a27f', '#e9dcc3', '#fff6e6')]
W_, L_, Y_ = hx('#ffffff'), hx('#f3f66c'), hx('#ffe08a')
DUST = [hx(c) for c in ('#c9b79c', '#e9e1d2', '#fbf6ec')]
BAYER = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]) / 16 - 0.47
LIGHT = np.array([-0.55, -0.62, 0.56]); LIGHT = LIGHT / np.linalg.norm(LIGHT)

FW, FH = 48, 61  # frame
BX = 7  # 34px өргөн эх баавгай frame-ийн голд: зүүн/баруун 7px (толин тусгалаар эргүүлэхэд байрнаасаа хөдлөхгүй)
# Эх баавгайн гарын зааг (мөр: тэр мөрөнд ойр гар энэ баганаас зүүн тийш); хол гар нь толин тусгал (33 − x)
SEP = {33: 9, 34: 9, 35: 9, 36: 9, 37: 8, 38: 8, 39: 9, 40: 9, 41: 8, 42: 8, 43: 7, 44: 7, 45: 6, 46: 6}
LEG_CUT = 52  # энэ мөрнөөс доош эх хөлийг арилгаж шинээр зурна


class Layer:
    """Z-buffer давхарга: хэсэг бүр өөрийн id, гүн (z), өнгөтэй; ойр нь хол хэсгийг дарна."""

    def __init__(s, w=FW, h=FH):
        s.w, s.h = w, h
        s.X, s.Y = np.meshgrid(np.arange(w) + .5, np.arange(h) + .5)
        s.z = np.full((h, w), -np.inf)
        s.c = np.zeros((h, w, 3), int)
        s.id = np.full((h, w), -1)

    def _put(s, inside, nx, ny, nz, z, ramp, pid, bias, alt=None):
        n = np.stack([nx, ny, nz]); n = n / np.maximum(1e-6, np.linalg.norm(n, axis=0))
        i = np.tensordot(LIGHT, n, axes=1)  # -1..1
        lvl = (i * .5 + .5) * (len(ramp) - 1) + bias + BAYER[s.Y.astype(int) % 4, s.X.astype(int) % 4] * .9
        idx = np.clip(np.round(lvl), 0, len(ramp) - 1).astype(int)
        col = np.array(ramp)[idx]
        if alt is not None:  # alt = (mask, ramp): хэсгийн доторх өөр материал (сарвууны дэвсгэр гэх мэт)
            m, r2 = alt
            l2 = np.clip(np.round((i * .5 + .5) * (len(r2) - 1) + BAYER[s.Y.astype(int) % 4, s.X.astype(int) % 4] * .9), 0, len(r2) - 1).astype(int)
            col = np.where(m[..., None], np.array(r2)[l2], col)
        win = inside & (z > s.z)
        s.z[win] = z[win]; s.c[win] = col[win]; s.id[win] = pid

    def ball(s, c, rx, ry, ramp, z0, pid, bias=0., alt=None):
        u, v = (s.X - c[0]) / rx, (s.Y - c[1]) / ry
        q = u * u + v * v; inside = q <= 1
        nz = np.sqrt(np.clip(1 - q, 0, 1))
        a = alt(u, v) if alt else None
        s._put(inside, u, v, nz, z0 + nz * min(rx, ry), ramp, pid, bias, None if a is None else (a, alt.ramp))

    def capsule(s, a, b, r0, r1, ramp, z0, pid, bias=0.):
        ab = np.subtract(b, a, dtype=float); L2 = max(1e-6, ab @ ab)
        t = np.clip(((s.X - a[0]) * ab[0] + (s.Y - a[1]) * ab[1]) / L2, 0, 1)
        cx, cy = a[0] + ab[0] * t, a[1] + ab[1] * t
        r = r0 + (r1 - r0) * t
        dx, dy = s.X - cx, s.Y - cy
        inside = dx * dx + dy * dy <= r * r
        nx, ny = dx / r, dy / r
        nz = np.sqrt(np.clip(1 - nx * nx - ny * ny, 0, 1))
        s._put(inside, nx, ny, nz, z0 + nz * r, ramp, pid, bias)

    def rgba(s, lines=2.2, out=OUT):
        """Хэсгүүдийн заагт (хөрш нь илт ойр бол) дотоод зураас, гадна талд 1px хүрээ."""
        a = np.zeros((s.h, s.w, 4), int)
        on = s.id >= 0
        a[on, :3] = s.c[on]; a[on, 3] = 255
        z = np.where(on, s.z, -np.inf)
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nz = np.full_like(z, -np.inf); nid = np.full_like(s.id, -1)
            ys, yd = (slice(dy, None), slice(None, -dy or None)) if dy >= 0 else (slice(None, dy), slice(-dy, None))
            xs, xd = (slice(dx, None), slice(None, -dx or None)) if dx >= 0 else (slice(None, dx), slice(-dx, None))
            nz[yd, xd] = z[ys, xs]; nid[yd, xd] = s.id[ys, xs]
            edge = on & (nid >= 0) & (nid // 10 != s.id // 10) & (nz - z > lines)
            a[edge, :3] = LINE
        return outline(a, out)


def outline(a, col=OUT):
    """Ил хэсгийн гадна 1px хүрээ (frame-ээс гарахгүй)."""
    f = a[..., 3] > 0
    g = np.zeros_like(f)
    g[1:] |= f[:-1]; g[:-1] |= f[1:]; g[:, 1:] |= f[:, :-1]; g[:, :-1] |= f[:, 1:]
    o = a.copy(); ring = g & ~f
    o[ring, :3] = col; o[ring, 3] = 255
    return o


def over(dst, src):
    m = src[..., 3] > 0; d = dst.copy(); d[m] = src[m]; return d


def bear_turn(name):
    """Нүүрийг (нүд, хоншоор, хацрын сүүдэр) задлахгүй бүхэлд нь 2px зүүн тийш (boss руу) шилжүүлж, баруун хацрыг
    үсээр нөхнө; гэдэсний цайвар хэсгийг 1px дагуулна."""
    o = np.array(Image.open(SPRITES / f'{name}.png').convert('RGBA')).astype(int)
    a = o.copy()
    a[10, 5:25] = o[10, 7:27]; a[10, 25:27] = o[10, 27]  # хөмсөг (толгойн хүрээг дарахгүй)
    for y in range(11, 24):
        a[y, 4:27] = o[y, 6:29]; a[y, 27:29] = o[y, 29]
    a[24, 9:21] = o[24, 11:23]; a[24, 21:28] = (*OUT, 255)  # эрүүний доод мөр

    def cream(p): return p[3] > 0 and p[0] > 230 and p[1] > 150

    def fur(p): return p[3] > 0 and 120 <= p[0] <= 215 and 60 <= p[1] <= 140 and p[2] < 110

    belly = [(y, x) for y in range(31, 48) for x in range(9, 25) if cream(o[y, x])]
    for y, x in belly: a[y, x] = (182, 107, 69, 255)
    for y, x in belly:
        if fur(a[y, x - 1]) or cream(a[y, x - 1]): a[y, x - 1] = o[y, x]
    return a


def centered(src):
    b = np.zeros((FH, FW, 4), int); b[:, BX:BX + 34] = src
    return b


def torso(a):
    """Эх баавгайн (frame-ийн голд) гар, хөлгүй их бие. Огтолсон ирмэг бүр хүрээтэй."""
    b = a.copy()
    for y, sep in SEP.items():
        b[y, :BX + sep] = 0; b[y, BX + 34 - sep:] = 0
        for x in (BX + sep, BX + 33 - sep):
            if b[y, x, 3]: b[y, x, :3] = OUT
    b[LEG_CUT:] = 0
    for x in range(FW):  # хөлийг огтолсон доод ирмэг: зөөлөн зураас (хөл үүний ард)
        if b[LEG_CUT - 1, x, 3] and tuple(b[LEG_CUT - 1, x, :3]) != tuple(OUT): b[LEG_CUT - 1, x, :3] = LINE
    return b


def shift(a, dy):
    """Бүх зургийг `dy` pixel босоо шилжүүлнэ (дээш = сөрөг), гарсан хэсэг тайрагдана."""
    b = np.zeros_like(a)
    if dy >= 0: b[dy:] = a[:a.shape[0] - dy]
    else: b[:dy] = a[-dy:]
    return b


def lean(a, dx):
    """Толгой+ороолт `dx`, цээж dx/2 (биеийг бөхийлгөнө)."""
    b = np.zeros_like(a)
    for y in range(a.shape[0]):
        d = dx if y <= 30 else int(dx / 2) if y <= 44 else 0
        b[y] = np.roll(a[y], d, axis=0)
    return b


def breathe(a):
    b = a.copy(); b[1:31] = a[0:30]; b[0] = 0
    return b


# ---------- гар, хөл ----------
NEAR_SH = (BX + 6, 35)  # ойр (зүүн, boss талын) мөр
FAR_SH = (BX + 27, 35)


class Pads:
    """Сарвууны дэвсгэр: бөмбөрцгийн `side` (u, v) чиглэлд харсан хэсэг цайвар."""
    ramp = PAD

    def __init__(s, du, dv, k=.25): s.du, s.dv, s.k = du, dv, k

    def __call__(s, u, v): return u * s.du + v * s.dv > s.k


def arm(layer, sh, elbow, paw, far=False, claws=False, palm=None, z=8, ghost=False):
    """Мөр → тохой → сарвуу. Хол гар биеийн ард, нэг шат бараан; smear-ийн сүүдэр (`ghost`) хоёр шат цайвар.
    `palm` = сарвууны дэвсгэр харагдах чиглэл."""
    bias = -1.4 if far else 2.6 if ghost else 0
    z0 = -14 if far else z
    pid = 30 if far else 60 if ghost else 20
    k = .7 if ghost else 1  # smear-ийн гар нарийн
    if not ghost: layer.ball(sh, 3.6, 3.6, FUR, z0 - 1, pid, bias)
    layer.capsule(sh, elbow, 3.5 * k, 3.2 * k, FUR, z0, pid, bias)
    layer.capsule(elbow, paw, 3.2 * k, 3.0 * k, FUR, z0 + .5, pid, bias)
    d = np.subtract(paw, elbow, dtype=float); d /= max(1e-6, np.hypot(*d))
    c = (paw[0] + d[0] * 1.2, paw[1] + d[1] * 1.2)
    layer.ball(c, 3.4 * k, 3.3 * k, FUR, z0 + 1.5, pid + 1, bias + .3, Pads(*palm) if palm else None)
    if claws:
        for k in (-1, 0, 1):  # гурван хумс: сарвууны үзүүрээс сэнс хэлбэрээр
            px, py = -d[1], d[0]
            base = (c[0] + d[0] * 2.6 + px * k * 1.9, c[1] + d[1] * 2.6 + py * k * 1.9)
            tip = (base[0] + d[0] * 3.2 + px * k * .8, base[1] + d[1] * 3.2 + py * k * .8)
            layer.capsule(base, tip, .95, .55, CLAW, z0 + 4, pid + 2, .4)
    return c


THIGH = SHIN = 4.3
ANKLE_Y = 56  # газардсан шагай: тавхайн доод мөр 59, хүрээ 60 (эх баавгайн хөлтэй ижил)


def knee_of(hip, ankle, straight=False):
    """2 ястай IK: өвдөг урагш (зүүн тийш) нугарна; хүрэхгүй бол шагайг ташаа руу татна."""
    d = np.subtract(ankle, hip, dtype=float); n = max(1e-6, np.hypot(*d))
    if n > THIGH + SHIN - .05:
        ankle = tuple(np.add(hip, d / n * (THIGH + SHIN - .05))); n = THIGH + SHIN - .05
    mid = np.add(hip, ankle) / 2
    if straight: return tuple(mid), ankle
    h = np.sqrt(max(0, THIGH ** 2 - (n / 2) ** 2))
    p = np.array([d[1], -d[0]]) / n
    if p[0] > 0: p = -p
    return tuple(mid + p * h), ankle


def leg(layer, hip, ankle, toe_dir=-1, far=False, sole=False, straight=False, z=-6):
    """Ташаа → өвдөг → шагай, тавхай нь `toe_dir` (−1 зүүн/урагш) тийш. `sole` = арагш өргөсөн тавхайн ул харагдана."""
    knee, ankle = knee_of(hip, ankle, straight)
    bias = -1.1 if far else -.3
    z0 = z - (3 if far else 0)
    pid = 50 if far else 40
    layer.capsule(hip, knee, 4.4, 3.8, FUR, z0, pid, bias)
    layer.capsule(knee, ankle, 3.8, 3.4, FUR, z0 + .5, pid, bias)
    foot = (ankle[0] + toe_dir * 1.6, ankle[1] + 1.4)
    pads = Pads(-toe_dir * .2, 1, .45) if not sole else Pads(-toe_dir, .3, .05)
    layer.ball(foot, 4.6, 2.9, FUR, z0 + 1.2, pid + 1, bias + .2, pads)


def glow(a, at, kind):
    b = a.copy(); x0, y0 = int(at[0]), int(at[1])
    pts = {'spark': [(0, 0, W_), (-1, -1, L_), (1, 1, L_), (1, -1, Y_)],
           'star': [(0, d, L_) for d in range(-3, 4)] + [(d, 0, L_) for d in range(-3, 4)]
                   + [(-1, -1, Y_), (1, -1, Y_), (-1, 1, Y_), (1, 1, Y_), (0, 0, W_)],
           'burst': [(d, 0, W_) for d in range(-4, 5)] + [(0, d, W_) for d in range(-4, 5)]
                    + [(-2, -2, L_), (2, -2, L_), (-2, 2, L_), (2, 2, L_), (-3, -3, Y_), (3, -3, Y_), (-3, 3, Y_), (3, 3, Y_)]}[kind]
    for dx, dy, col in pts:
        x, y = x0 + dx, y0 + dy
        if 0 <= x < b.shape[1] and 0 <= y < b.shape[0]: b[y, x, :3] = col; b[y, x, 3] = 255
    return b


def smear(a, path, col=W_, every=1):
    """Хурдан хөдөлгөөний ул мөр: сарвууны замаар 1px цагаан/шар нум."""
    b = a.copy()
    for i, (x, y) in enumerate(path):
        if i % every: continue
        x, y = int(round(x)), int(round(y))
        if 0 <= x < b.shape[1] and 0 <= y < b.shape[0] and b[y, x, 3] == 0:
            b[y, x, :3] = col if i < len(path) * .6 else L_; b[y, x, 3] = 255
    return b


# ---------- зогсох / тулалдах frame ----------
HIPS = ((BX + 11, 49), (BX + 23, 49))


def stand_legs(layer, bob=0, spread=0):
    (x1, y1), (x2, y2) = HIPS
    leg(layer, (x1, y1 + bob), (x1 - 1 - spread, ANKLE_Y), -1, straight=True)
    leg(layer, (x2, y2 + bob), (x2 + 1 + spread, ANKLE_Y), 1, far=True, straight=True)


IDLE_NEAR = ((BX + 3, 40), (BX + 3, 44))
IDLE_FAR = ((BX + 30, 40), (BX + 30, 44))


def figure(src, near, far=IDLE_FAR, lean_dx=0, bob=0, claws=False, palm=None, legs=stand_legs, legs_kw=None, ghosts=()):
    """Нэг frame: хол гар + хөл (биеийн ард) → их бие → smear → ойр гар. `near`/`far` = (тохой, сарвуу) frame-ийн
    координат (бөхийлт, `bob`-оос өмнөх); `lean_dx` бөхийлт; `bob` их бие ба гарыг доош (хөл газраа үлдэнэ).
    Ойр гар арагш савлахдаа биеийн ард. `ghosts` = хурдан хөдөлгөөний smear: гарын өмнөх байрлалууд нарийн, цайвар."""
    body = shift(torso(lean(centered(src), lean_dx)), bob)
    sx = int(lean_dx / 2)
    mv = lambda p: (p[0] + sx, p[1] + bob)
    near_sh, near, far = mv(NEAR_SH), tuple(map(mv, near)), tuple(map(mv, far))
    back = Layer()
    arm(back, mv(FAR_SH), *far, far=True)
    legs(back, bob=bob, **(legs_kw or {}))
    behind = near[1][0] > near_sh[0] + 2 and near[1][1] > near_sh[1]  # сарвуу мөрнөөс арагш доош: гар биеийн ард
    if behind: paw = arm(back, near_sh, *near, z=-10, claws=claws, palm=palm)
    img = over(back.rgba(), body)
    if ghosts:
        gl = Layer()
        for g in ghosts: arm(gl, near_sh, *map(mv, g), ghost=True)
        img = over(img, gl.rgba(out=FUR[1]))
    if not behind:
        front = Layer()
        paw = arm(front, near_sh, *near, claws=claws, palm=palm)
        img = over(img, front.rgba())
    return img, paw


def battle(base, blink):
    """bear_battle (BossArena.tsx-ийн F): 0 зогсох, 1 амьсгал, 2 ирмэх, 3–8 од шидэх (арагш татах, толгойн ард өргөх,
    цэнэглэх, шидэх ул мөр, гаргах, дагах), 9 цочих, 10 цагаан, 11–13 сарвуудах (хумсаа өргөх, ул мөр, цохих)."""
    f = []
    idle, _ = figure(base, IDLE_NEAR)
    f.append(idle)                                                                  # 0 зогсох
    br, _ = figure(breathe(base), ((BX + 3, 41), (BX + 3, 45)), ((BX + 30, 41), (BX + 30, 45)))
    f.append(br)                                                                    # 1 амьсгал (гар 1px доош)
    f.append(figure(blink, IDLE_NEAR)[0])                                           # 2 ирмэх
    # од шидэх: гараа хажуугаар толгойн хажууд өргөж (нүүрийг халхлахгүй) → цэнэглэх → урагш шидэх
    UP = ((BX - 1, 30), (BX - 3, 22))  # толгойн зүүн хажууд өргөсөн гар
    f.append(figure(base, ((BX + 1, 38), (BX + 0, 32)), lean_dx=1, palm=(-1, 0))[0])  # 3 гараа өргөж эхлэх
    a, p = figure(base, ((BX - 1, 31), (BX - 2, 24)), lean_dx=2, palm=(0, -1))
    f.append(glow(a, p, 'spark'))                                                   # 4 толгойн хажууд: оч
    a, p = figure(base, UP, lean_dx=2, palm=(0, -1))
    f.append(glow(a, p, 'star'))                                                    # 5 цэнэглэх: од томорно
    a, p = figure(base, ((BX - 1, 31), (BX - 5, 28)), lean_dx=-1, ghosts=[UP])
    f.append(smear(a, [(BX - 4 - i * .25, 19 + i * .9) for i in range(10)]))         # 6 шидэх (smear)
    a, p = figure(base, ((BX + 0, 33), (BX - 5, 32)), lean_dx=-2, palm=(-1, 0))
    f.append(glow(a, p, 'burst'))                                                   # 7 гаргах: од ниснэ
    f.append(figure(base, ((BX + 1, 38), (BX - 3, 41)), lean_dx=-1)[0])             # 8 дагах
    hurt, _ = figure(blink, ((BX + 1, 32), (BX - 1, 28)), ((BX + 32, 33), (BX + 35, 29)), lean_dx=2,
                     legs_kw={'spread': 1})
    f.append(hurt)                                                                  # 9 цочих: гараа дээш
    white = hurt.copy(); white[white[..., 3] > 0, :3] = 255
    f.append(white)                                                                 # 10 цагаан
    CLAW_UP = ((BX - 1, 29), (BX - 2, 21))
    f.append(figure(base, CLAW_UP, lean_dx=1, claws=True, palm=(-1, 0))[0])         # 11 хумсаа өргөх
    a, _ = figure(base, ((BX - 1, 32), (BX - 6, 33)), lean_dx=-2, claws=True, ghosts=[CLAW_UP])
    for k in range(3):  # гурван хумсны ул мөр: дээрээс урагш доош нум
        a = smear(a, [(BX - 3 - k * 1.3 + i * .1, 17 + k * 1.2 + i * 1.5) for i in range(9)])
    f.append(a)                                                                     # 12 сарвуудах (smear)
    f.append(figure(base, ((BX + 0, 37), (BX - 4, 42)), lean_dx=-2, claws=True, legs_kw={'spread': 1})[0])  # 13 цохих
    return f


# ---------- 2 хөлөөр гүйх ----------
# 8 frame-ийн цикл (зүүн тийш): 0 ойр хөл урагш газардах, 1 суух, 2 нөгөө хөл өвдгөө өргөж өнгөрөх, 3 түлхэж агаарт,
# 4–7 нөгөө хөлөөр давтана. Хөл: (шагай ташаанаас dx, газраас өргөх); гар эсрэг хөлтэйгөө савлана (мөрнөөс).
ARM = {'back': ((3, 5), (5, 8)), 'back2': ((2, 5), (4, 9)), 'mid': ((0, 5), (-1, 9)),
       'fwd': ((-4, 3), (-7, 0)), 'fwd2': ((-3, 4), (-6, 2))}
RUN = [
    # bob, ойр хөл, хол хөл, ойр гар, хол гар
    (0, (-5, 0), (6, 3), 'back', 'fwd'),
    (1, (-2, 0), (5, 5), 'back2', 'fwd2'),
    (0, (1, 0), (0, 6), 'mid', 'mid'),
    (-1, (5, 2), (-5, 3), 'fwd', 'back'),
]
RUN = RUN + [(b, fl, nl, fa, na) for b, nl, fl, na, fa in RUN]  # 4–7: хөл, гар солигдоно


def run_frame(base, k):
    bob, nl, fl, na, fa = RUN[k]

    def legs(layer, bob):
        for (hx_, hy), (dx, lift), far in ((HIPS[0], nl, False), (HIPS[1], fl, True)):
            leg(layer, (hx_, hy + bob), (hx_ + dx, ANKLE_Y - lift), -1, far=far, sole=lift > 0 and dx > 2)

    rel = lambda sh, name: tuple((sh[0] - 1 + d[0], sh[1] + d[1]) for d in ARM[name])  # бөхийлтөөр мөр 1px урагш
    img, _ = figure(base, rel(NEAR_SH, na), rel(FAR_SH, fa), lean_dx=-2, bob=bob, legs=legs,
                    palm=(1, 0) if na == 'fwd' else None)
    if k % 4 == 0:  # газардах агшинд өмнөх алхмын тоос арагш үлдэнэ
        ax = HIPS[1][0] + 8 if k == 0 else HIPS[0][0] + 8
        for x, y, c in ((ax, 59, 1), (ax + 2, 58, 2), (ax + 1, 57, 0), (ax + 4, 59, 0), (ax + 3, 56, 2), (ax + 5, 57, 1)):
            if 0 <= x < FW and img[y, x, 3] == 0: img[y, x, :3] = DUST[c]; img[y, x, 3] = 255
    return img


def front(src):
    """Эргэх агшин: урагшаа харсан эх баавгай (нүүр шилжүүлээгүй), гар, хөл нь зогсохтой ижил."""
    return figure(src, IDLE_NEAR)[0]


def preview(frames, path, k=8):
    bg = np.zeros((FH, FW * len(frames), 4), int)
    bg[...] = (*hx('#3b3f6b'), 255)
    for i, fr in enumerate(frames):
        cell = bg[:, i * FW:(i + 1) * FW]
        cell[(np.arange(FH)[:, None] + np.arange(FW)[None]) % 2 == 0, :3] = hx('#41467a')
        m = fr[..., 3] > 0; cell[m] = fr[m]
    Image.fromarray(bg.astype(np.uint8), 'RGBA').resize((FW * len(frames) * k, FH * k), Image.NEAREST).save(path)


def save(frames, name):
    Image.fromarray(np.concatenate(frames, axis=1).astype(np.uint8), 'RGBA').save(SPRITES / f'{name}.png')


if __name__ == '__main__':
    base, blink = bear_turn('map_bear'), bear_turn('map_bear_blink')
    straight = np.array(Image.open(SPRITES / 'map_bear.png').convert('RGBA')).astype(int)
    fight = battle(base, blink)
    run = [run_frame(base, k) for k in range(8)] + [front(straight)]
    if '--preview' in sys.argv:
        out = Path(sys.argv[sys.argv.index('--preview') + 1])
        preview(fight, out / 'bear_battle_preview.png')
        preview(run, out / 'bear_run_preview.png')
    else:
        save(fight, 'bear_battle')
        save(run, 'bear_run')
