"""Эхний бүлгийн boss (Хулуун шидтэн): sprite, тулааны frame sheet, ид шидийн бөмбөг.

Эх зураг reference/boss_pumpkin_ref.png нь 7.64px-ийн pixel блоктой, хөх саарал дэвсгэртэй, доороо тусгалтай.
Дэвсгэр ба тусгалыг хасаж, блок бүрийн төвийн өнгөөр 25×45 цэвэр sprite болгоно.

Ажиллуулах:  python3 docs/design/pixel-bear/tools/boss_pumpkin.py && python3 mobile/scripts/build-sprites.py
"""
from pathlib import Path

import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent
REF = HERE.parent / 'reference/boss_pumpkin_ref.png'
OUT = HERE.parent / 'sprites'

BG = np.array([154, 166, 188])
BLOCK, X0, Y0 = 7.64, 77.0, 70.5  # блокийн хэмжээ ба торын эхлэл (өнгөний хэлбэлзэл хамгийн бага байх цэг)
BOTTOM = 414  # үүнээс доош нь тусгал

im = np.array(Image.open(REF).convert('RGB')).astype(int)
gw, gh = round((268 - X0) / BLOCK), round((BOTTOM - Y0) / BLOCK)
boss = np.zeros((gh, gw, 4), np.uint8)
for j in range(gh):
    for i in range(gw):
        y0, y1 = int(Y0 + j * BLOCK + 2), int(Y0 + (j + 1) * BLOCK - 2)
        x0, x1 = int(X0 + i * BLOCK + 2), int(X0 + (i + 1) * BLOCK - 2)
        c = im[y0:y1, x0:x1].reshape(-1, 3)
        fg = np.abs(c - BG).sum(1) > 45
        if fg.mean() >= 0.5:
            boss[j, i, :3] = np.median(c[fg], 0); boss[j, i, 3] = 255
assert (gw, gh) == (25, 45), (gw, gh)
Image.fromarray(boss).save(OUT / 'boss_pumpkin.png')

# Тулааны frame-ууд (зүүнээс баруун): 0–2 хөвөх (pixel алхмаар 0/1/2px дээш, нөмрөгийн зах ээлжлэн намирна),
# 3 ид шид (толгой баавгай руу 1px, зах 2px дэлбэрч, нүд гэрэлтэнэ), 4 цочих (толгой хойш, нүд аньсан), 5 цагаан,
# 6 давхих (толгой урагш 2px, нөмрөг араас намирна), 7 цохих (толгой 3px түлхэж, нөмрөгөө урагш ташуурдана).
HEAD, HEM = range(0, 23), range(39, 45)
EYES = [(13, 12), (13, 13), (20, 12), (20, 13)]


def frame(up=0, head_dx=0, hem_dx=0, eyes=None):
    b = boss.copy()
    if eyes == 'glow':
        for x, y in EYES:
            b[y, x] = (246, 255, 176, 255)
            for nx, ny in ((x - 1, y), (x + 1, y)):
                if b[ny, nx, 0] < 45: b[ny, nx] = (156, 240, 106, 255)
    elif eyes == 'shut':
        for x, y in EYES: b[y, x] = (29, 29, 29, 255)
        for x in list(range(10, 14)) + list(range(18, 22)): b[12, x] = (203, 125, 69, 255)
    c = np.zeros((gh + 2, gw + 6, 4), np.uint8)  # хажуу бүрт 3px: толгой/зах шилжихэд тайрагдахгүй
    for y in range(gh):
        dx = head_dx if y in HEAD else hem_dx if y in HEM else 0
        c[2 - up + y, 3 + dx:3 + dx + gw] = np.where(b[y, :, 3:] > 0, b[y], c[2 - up + y, 3 + dx:3 + dx + gw])
    return c


hurt = frame(head_dx=-1, hem_dx=-1, eyes='shut')
white = hurt.copy(); white[white[..., 3] > 0, :3] = 255
sheet = [frame(), frame(up=1, hem_dx=1), frame(up=2, hem_dx=-1), frame(up=1, head_dx=1, hem_dx=2, eyes='glow'), hurt, white,
         frame(up=1, head_dx=2, hem_dx=-2, eyes='glow'), frame(head_dx=3, hem_dx=2, eyes='glow')]
Image.fromarray(np.concatenate(sheet, axis=1)).save(OUT / 'boss_pumpkin_sheet.png')

# Хадуур (давхиж цохих үед барина): 3 frame (өргөсөн → дүүжлэх → цохих), 48×60, барьж буй цэг (20, 32).
# Иш дээш, ир нь урагш (баавгай руу) муруйсан загварыг эргүүлнэ; дүүжлэх, цохих frame-д ирний ул мөр (smear).
SC_W, SC_H, PIV = 48, 60, (20, 32)


def rot(x, y, deg):
    t = np.radians(deg)
    return x * np.cos(t) - y * np.sin(t), x * np.sin(t) + y * np.cos(t)


def bezier(t): return ((1 - t) ** 2 * 0 + 2 * (1 - t) * t * 9 + t * t * 15, (1 - t) ** 2 * -27 + 2 * (1 - t) * t * -32 + t * t * -20)


def scythe(deg, smear_from=None):
    c = np.zeros((SC_H, SC_W, 4), np.uint8)

    def dot(x, y, r, col):
        cx, cy = PIV[0] + x, PIV[1] + y
        for yy in range(int(cy - r) - 1, int(cy + r) + 2):
            for xx in range(int(cx - r) - 1, int(cx + r) + 2):
                if 0 <= xx < SC_W and 0 <= yy < SC_H and (xx + .5 - cx) ** 2 + (yy + .5 - cy) ** 2 <= r * r: c[yy, xx] = col

    if smear_from is not None:  # ирний үзүүрийн өнгөрсөн зам: тунгалаг цагаан нум
        for a in np.linspace(smear_from, deg, 14):
            for t in (0.75, 0.9, 1.0):
                dot(*rot(*bezier(t), a), 1.4, (255, 255, 255, 110))
    for k in range(32):  # иш
        dot(*rot(0, 4 - k * 31 / 31, deg), 1.1, (107, 74, 46, 255))
    for k in range(30):  # ир: үзүүр рүүгээ нарийсна
        t = k / 29
        dot(*rot(*bezier(t), deg), 2.3 * (1 - t) + 0.7, (201, 211, 220, 255))
    for k in range(30):  # ирний дотор талын хурц ирмэг
        t = k / 29
        bx, by = bezier(t)
        dot(*rot(bx - 0.8, by + 1.6 * (1 - t) + 0.6, deg), 0.6, (255, 255, 255, 255))
    o = np.zeros((SC_H + 2, SC_W + 2, 4), np.uint8); o[1:-1, 1:-1] = c
    solid = o[..., 3] == 255
    edge = np.zeros_like(solid)
    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        edge |= np.roll(np.roll(solid, dy, 0), dx, 1)
    o[edge & ~solid & (o[..., 3] < 255)] = (29, 29, 29, 255)
    return o[1:-1, 1:-1]


Image.fromarray(np.concatenate([scythe(-40), scythe(50, smear_from=-40), scythe(110, smear_from=40)], axis=1)).save(OUT / 'fx_scythe.png')

# Ид шидийн бөмбөг: нүдний ногоон өнгөөр гэрэлтэнэ
orb = np.zeros((11, 11, 4), np.uint8)
for y in range(11):
    for x in range(11):
        r = ((x - 5) ** 2 + (y - 5) ** 2) ** 0.5
        col = '#D9FF7A' if r < 2.2 else '#7EDB5A' if r < 3.8 else '#2F7A3A' if r < 5.2 else None
        if col: orb[y, x] = (*bytes.fromhex(col[1:]), 255)
orb[3, 3] = orb[3, 4] = (255, 255, 255, 255)
Image.fromarray(orb).save(OUT / 'fx_magic.png')
print('boss_pumpkin.png 25x45, boss_pumpkin_sheet.png 8x(31x47), fx_scythe.png 3x(48x60), fx_magic.png 11x11')
