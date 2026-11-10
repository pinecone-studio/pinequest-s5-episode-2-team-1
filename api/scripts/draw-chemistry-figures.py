"""Хими 7–11-ийн зурагтай асуултын зургууд (өөрсдөө зурсан, номын скан биш).
python3 scripts/draw-chemistry-figures.py → seed/images/chemistry-<анги>-*.png (seed/chemistry-image-questions.json заана)."""
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from figlib import (BLUE, GREEN, GREY, GRID, INK, ORANGE, PINK, RED, WATER, WOOD, YELLOW, Graph, arrow, ball, beaker,
                    canvas, dashed, dim, save, text, tube)

OUT = Path(__file__).resolve().parent.parent / 'seed' / 'images'
FIG = {}
GLASS = (225, 240, 250)


def fig(name):
    def reg(f):
        FIG[name] = f
        return f
    return reg


def caption(d, s):
    text(d, (400, 555), s, 30)


# ── Хими 7 ──────────────────────────────────────────────────────────────────

@fig('chemistry-7-dew')
def dew():
    img, d = canvas()
    d.rectangle([0, 380, 800, 520], fill=(140, 110, 80))
    for i in range(22):
        x = 60 + i * 32
        tip = (x + (i % 3 - 1) * 30, 150 + (i * 37) % 120)
        d.polygon([(x - 8, 385), tip, (x + 8, 385)], fill=(90, 170, 80), outline=(60, 120, 60))
        ball(d, tip[0], tip[1] + 12, 7, (190, 225, 250), BLUE)
    text(d, (650, 80), 'Өглөө эрт', 28)
    caption(d, 'Шүүдэр буух')
    return img


@fig('chemistry-7-kettle')
def kettle():
    img, d = canvas()
    d.ellipse([250, 230, 550, 480], fill=(200, 205, 215), outline=INK, width=4)
    d.rectangle([250, 420, 550, 480], fill=(200, 205, 215))
    d.line([250, 480, 550, 480], fill=INK, width=4)
    d.arc([330, 150, 470, 290], 180, 360, fill=INK, width=8)
    d.polygon([(540, 330), (650, 250), (665, 265), (555, 370)], fill=(200, 205, 215), outline=INK)
    for k in range(3):
        pts = [(660 + 18 * math.sin(t / 6 + k), 240 - t * 2 - k * 25) for t in range(40)]
        d.line(pts, fill=(170, 180, 195), width=5)
    d.rectangle([220, 485, 580, 500], fill=GREY)
    caption(d, 'Ус буцлах')
    return img


@fig('chemistry-7-frost')
def frost():
    img, d = canvas()
    d.rectangle([250, 60, 550, 500], fill=(150, 100, 60), outline=INK, width=3)
    d.rectangle([275, 85, 525, 475], fill=(205, 230, 248))
    d.line([400, 85, 400, 475], fill=(150, 100, 60), width=10)
    for cx, cy, r in ((330, 160, 40), (460, 210, 48), (340, 330, 55), (470, 400, 42), (330, 440, 30)):
        for k in range(6):
            a = math.radians(k * 60)
            d.line([cx, cy, cx + r * math.cos(a), cy + r * math.sin(a)], fill='white', width=4)
            for t in (0.4, 0.7):
                bx, by = cx + r * t * math.cos(a), cy + r * t * math.sin(a)
                for s in (-1, 1):
                    d.line([bx, by, bx + 12 * math.cos(a + s * 0.8), by + 12 * math.sin(a + s * 0.8)], fill='white', width=3)
    text(d, (660, 120), 'Гадаа −20°C', 26)
    caption(d, 'Цонх цантах')
    return img


@fig('chemistry-7-snowmelt')
def snowmelt():
    img, d = canvas()
    d.ellipse([140, 400, 660, 500], fill=WATER)
    d.pieslice([220, 220, 580, 560], 180, 360, fill='white', outline=(170, 180, 200), width=3)
    for x in (300, 380, 470):
        d.line([x, 395, x - 6, 430], fill=BLUE, width=4)
    ball(d, 670, 110, 50, YELLOW, ORANGE)
    for k in range(8):
        a = math.radians(k * 45)
        d.line([670 + 62 * math.cos(a), 110 + 62 * math.sin(a), 670 + 85 * math.cos(a), 110 + 85 * math.sin(a)], fill=ORANGE, width=4)
    caption(d, 'Хавар цас ус болох')
    return img


@fig('chemistry-7-evaporation')
def evaporation():
    img, d = canvas()
    beaker(d, 70, 230, 230, 430, 290); text(d, (150, 470), 'Давсны уусмал', 22)
    arrow(d, (250, 330), (320, 330), RED, 4)
    d.chord([360, 200, 540, 320], 0, 180, fill=WATER, outline=INK, width=4)   # ууршуулах аяга
    d.line([380, 320, 380, 420], fill=INK, width=3); d.line([520, 320, 520, 420], fill=INK, width=3)
    d.polygon([(430, 400), (450, 350), (470, 400)], fill=ORANGE); d.polygon([(440, 400), (450, 370), (460, 400)], fill=YELLOW)
    d.rectangle([420, 400, 480, 440], fill=GREY, outline=INK)
    text(d, (450, 470), 'Халаах', 22)
    for k in range(3):
        d.line([(410 + k * 40 + 8 * math.sin(t / 5), 250 - t * 2) for t in range(30)], fill=(170, 180, 195), width=3)
    arrow(d, (560, 330), (630, 330), RED, 4)
    d.chord([620, 260, 780, 360], 0, 180, fill='white', outline=INK, width=4)
    for i in range(10):
        x, y = 650 + (i * 37) % 110, 318 + (i * 13) % 22
        d.rectangle([x, y, x + 10, y + 10], fill=(200, 220, 240), outline=BLUE)
    text(d, (700, 400), 'Талст', 22)
    return img


@fig('chemistry-7-particles')
def particles():
    img, d = canvas()
    for x0, lab in ((90, 'а.'), (440, 'б.')):
        d.rectangle([x0, 130, x0 + 270, 430], outline=INK, width=4)
        text(d, (x0 + 235, 165), lab, 32)
    for r, c in ((0, 4), (1, 3), (2, 4)):
        for k in range(c):
            ball(d, 130 + k * 62 + (31 if c == 3 else 0), 405 - r * 58 - 25, 30, (30, 110, 40), (20, 80, 30))
    for cx, cy, ang in ((510, 220, 90), (630, 310, 30), (520, 370, 0), (600, 200, 0)):
        ball(d, cx, cy, 30, RED, (180, 40, 40))
        for s in (-1, 1):
            a = math.radians(ang + (0 if s > 0 else 180))
            ball(d, cx + 40 * math.cos(a), cy - 40 * math.sin(a), 15, (60, 200, 60), (40, 150, 40))
    return img


@fig('chemistry-7-nails')
def nails():
    img, d = canvas()
    xs = (130, 310, 490, 670)
    for i, x in enumerate(xs):
        text(d, (x, 70), str(i + 1), 34, RED)
    tube(d, xs[0], 100, 470, 70, 330)                                  # 1: хагас ус, задгай
    tube(d, xs[1], 100, 470, 70)                                       # 2: CaCl₂, хөвөн, таглаатай
    d.rectangle([xs[1] - 32, 400, xs[1] + 32, 440], fill='white')
    for k in range(14):
        ball(d, xs[1] - 24 + (k * 11) % 50, 420 + (k * 7) % 25, 5, 'white', INK)
    d.rectangle([xs[1] - 30, 150, xs[1] + 30, 200], fill=(245, 245, 245), outline=GREY)
    d.rectangle([xs[1] - 38, 90, xs[1] + 38, 120], fill=(150, 100, 60))
    tube(d, xs[2], 100, 470, 70, 210)                                  # 3: буцалсан ус + тос
    d.rectangle([xs[2] - 32, 195, xs[2] + 32, 225], fill=(245, 210, 90))
    d.rectangle([xs[2] - 38, 90, xs[2] + 38, 120], fill=(150, 100, 60))
    tube(d, xs[3], 100, 470, 70, 150)                                  # 4: крантны ус, задгай
    for x, top, bot in ((xs[0], 220, 450), (xs[1], 240, 380), (xs[2], 240, 450), (xs[3], 240, 450)):
        d.line([x, top, x + 6, bot], fill=(110, 110, 120), width=6)
        d.line([x - 8, top, x + 8, top], fill=(110, 110, 120), width=6)
    for x, s in ((xs[0], 'Ус'), (xs[1], 'Кальцийн\nхлорид'), (xs[2], 'Буцалсан ус\n+ тос'), (xs[3], 'Крантны ус')):
        for j, line in enumerate(s.split('\n')):
            text(d, (x, 505 + j * 28), line, 22)
    return img


# ── Хими 8 ──────────────────────────────────────────────────────────────────

def eye(d, x, y, ok):
    d.ellipse([x - 26, y - 14, x + 26, y + 14], fill='white', outline=INK, width=3)
    ball(d, x + 10, y, 8, INK, INK)
    text(d, (x - 55, y), '✓' if ok else '✗', 34, GREEN if ok else RED)


@fig('chemistry-8-meniscus')
def meniscus():
    img, d = canvas()
    cx, w = 520, 140
    d.rectangle([cx - w / 2, 330, cx + w / 2, 560], fill=WATER)
    d.chord([cx - w / 2, 295, cx + w / 2, 365], 0, 180, fill='white')
    d.line([cx - w / 2, 120, cx - w / 2, 560], fill=INK, width=4); d.line([cx + w / 2, 120, cx + w / 2, 560], fill=INK, width=4)
    for k in range(11):
        y = 180 + k * 30
        d.line([cx + w / 2 - (40 if k % 5 == 0 else 22), y, cx + w / 2, y], fill=INK, width=2)
    for y, ok in ((220, False), (365, True), (500, False)):
        eye(d, 200, y, ok)
        dashed(d, (230, y), (cx - w / 2, 330 + 35 if ok else (330 + 35 + (y - 365) * 0.3)), GREEN if ok else RED, 2)
    text(d, (720, 330), 'Мениск', 24)
    arrow(d, (670, 335), (cx + 25, 352), INK, 2)
    return img


@fig('chemistry-8-cylinders-20')
def cylinders_20():
    img, d = canvas()
    for i, off in enumerate((12, 0, -14)):
        cx, w, top, bot = 160 + i * 240, 90, 90, 520
        px = (bot - top - 40) / 25
        y20 = bot - 10 - 20 * px
        lvl = y20 + off
        d.rectangle([cx - w / 2 + 2, lvl, cx + w / 2 - 2, bot], fill=(235, 235, 240))
        d.chord([cx - w / 2 + 2, lvl - 22, cx + w / 2 - 2, lvl + 10], 0, 180, fill=(235, 235, 240))
        d.rectangle([cx - w / 2 + 2, lvl - 10, cx + w / 2 - 2, lvl - 6 + 4], fill=(235, 235, 240))
        d.arc([cx - w / 2 + 2, lvl - 22, cx + w / 2 - 2, lvl + 10], 0, 180, fill=INK, width=2)
        d.line([cx - w / 2, top, cx - w / 2, bot], fill=INK, width=4); d.line([cx + w / 2, top, cx + w / 2, bot], fill=INK, width=4)
        d.line([cx - w / 2 - 20, bot, cx + w / 2 + 20, bot], fill=INK, width=6)
        for ml in range(0, 26):
            y = bot - 10 - ml * px
            long = ml % 5 == 0
            d.line([cx + w / 2 - (30 if long else 16), y, cx + w / 2, y], fill=INK, width=3 if long else 2)
            if long and ml:
                text(d, (cx + w / 2 - 36, y), str(ml), 22, anchor='rm')
        text(d, (cx, 560), f'{i + 1}', 30)
    return img


@fig('chemistry-8-glassware')
def glassware():
    img, d = canvas()
    # а) конус колба
    d.polygon([(120, 160), (150, 160), (150, 260), (220, 440), (50, 440), (120, 260)], fill=GLASS, outline=INK)
    # б) пипетк
    d.line([310, 110, 310, 250], fill=INK, width=3); d.line([322, 110, 322, 250], fill=INK, width=3)
    d.ellipse([290, 250, 342, 360], fill=GLASS, outline=INK, width=3)
    d.polygon([(310, 360), (322, 360), (318, 460), (314, 460)], fill=GLASS, outline=INK)
    d.line([300, 180, 332, 180], fill=RED, width=2)
    # в) хэмжээст цилиндр
    d.rectangle([470, 110, 520, 440], fill=GLASS, outline=INK, width=3); d.line([440, 440, 550, 440], fill=INK, width=6)
    for k in range(12):
        d.line([470, 140 + k * 25, 485 + (10 if k % 5 == 0 else 0), 140 + k * 25], fill=INK, width=2)
    # г) юүлүүр
    d.polygon([(630, 160), (760, 160), (705, 280), (685, 280)], fill=GLASS, outline=INK)
    d.rectangle([688, 280, 702, 440], fill=GLASS, outline=INK)
    for x, lab in ((135, 'а)'), (316, 'б)'), (495, 'в)'), (695, 'г)')):
        text(d, (x, 500), lab, 30)
    return img


@fig('chemistry-8-mg-steps')
def mg_steps():
    img, d = canvas()
    beaker(d, 60, 250, 230, 450, 370)
    d.rectangle([90, 425, 200, 447], fill='white', outline=GREY)
    text(d, (145, 490), 'Ус + MgO', 24)
    arrow(d, (260, 360), (360, 360), INK, 4); text(d, (310, 330), 'Халаах', 22)
    beaker(d, 400, 250, 580, 450, 300, (90, 120, 200))
    text(d, (490, 490), 'Mg(OH)₂ уусмал', 24)
    d.polygon([(640, 120), (680, 110), (720, 190), (690, 205)], fill=GLASS, outline=INK)
    ball(d, 705, 195, 12, (90, 120, 200))
    arrow(d, (640, 150), (570, 230), INK, 3)
    text(d, (690, 80), 'Универсал индикатор', 22)
    return img


@fig('chemistry-8-plant')
def plant():
    img, d = canvas()
    d.rectangle([0, 0, 800, 600], fill=(250, 245, 235))
    d.rectangle([0, 430, 800, 600], fill=(150, 110, 80))
    ball(d, 110, 100, 60, YELLOW, ORANGE)
    d.line([430, 430, 430, 200], fill=(60, 150, 60), width=10)
    for sx, sy, ex, ey in ((430, 330, 330, 290), (430, 300, 530, 260), (430, 380, 520, 360)):
        d.polygon([(sx, sy), ((sx + ex) / 2, sy - 40), (ex, ey), ((sx + ex) / 2, sy + 10)], fill=(90, 190, 80), outline=(60, 140, 60))
    for k in range(8):
        a = math.radians(k * 45)
        ball(d, 430 + 40 * math.cos(a), 180 + 40 * math.sin(a), 22, YELLOW, ORANGE)
    ball(d, 430, 180, 26, ORANGE, (200, 100, 40))
    for k in range(6):
        d.line([430, 430, 380 + k * 20, 520 + (k % 2) * 30], fill=(230, 210, 170), width=4)
    for y in (230, 270):
        arrow(d, (190, y), (320, y + 30), RED, 4)
    d.rectangle([150, 200, 240, 240], outline=INK, width=2); text(d, (195, 182), 'CO₂', 22)
    for y in (220, 260):
        arrow(d, (540, y + 10), (660, y - 50), BLUE, 4)
    d.rectangle([660, 150, 750, 190], outline=INK, width=2)
    arrow(d, (250, 500), (370, 480), BLUE, 4)
    d.rectangle([150, 480, 240, 520], fill='white', outline=INK, width=2)
    return img


@fig('chemistry-8-gas-graph')
def gas_graph():
    img, d = canvas()
    g = Graph(d, (130, 90, 700, 480), (0, 300), (0, 70), 30, 10, 'Хугацаа, с', 'Ялгарсан хий, см³', minor=(15, 5))
    pts = [(0, 0), (30, 10), (60, 20), (90, 26), (120, 40), (150, 48), (180, 54), (210, 60), (240, 64), (270, 66), (300, 66)]
    g.line(pts, BLUE, 5, dots=True)
    return img


@fig('chemistry-8-gas-apparatus')
def gas_apparatus():
    img, d = canvas()
    d.polygon([(250, 260), (290, 260), (290, 330), (380, 500), (160, 500), (250, 330)], fill=GLASS, outline=INK)
    d.polygon([(185, 470), (365, 470), (380, 500), (160, 500)], fill=WATER)
    for k in range(6):
        d.rectangle([200 + k * 25, 478, 214 + k * 25, 490], fill='white', outline=GREY)
    d.rectangle([240, 230, 300, 265], fill=(220, 120, 80), outline=INK)
    d.line([270, 230, 270, 150, 420, 150], fill=INK, width=4)
    d.rectangle([420, 130, 680, 170], fill='white', outline=INK, width=3)
    for k in range(10):
        d.line([440 + k * 22, 130, 440 + k * 22, 145], fill=INK, width=2)
    d.rectangle([600, 135, 610, 165], fill=INK); d.line([610, 150, 720, 150], fill=INK, width=4)
    d.rectangle([720, 130, 735, 170], fill=INK)
    text(d, (550, 100), 'Ялгарсан хий', 24)
    text(d, (470, 420), 'Давсны хүчил', 24, anchor='lm'); text(d, (470, 470), 'Шохой', 24, anchor='lm')
    arrow(d, (465, 420), (340, 470), GREY, 2)
    return img


# ── Хими 9 ──────────────────────────────────────────────────────────────────

@fig('chemistry-9-x-cooling')
def x_cooling():
    img, d = canvas()
    g = Graph(d, (140, 80, 700, 480), (0, 30), (-40, 140), 5, 20, 'Хугацаа, мин', 't, °C', minor=(1, 10))
    g.line([(0, 120), (3, 100), (17, 100), (22, 0), (26, 0), (30, -20)], (40, 160, 150), 4, dots=True)
    return img


def shells(d, x, y, sym, z, mass, conf, val):
    d.rectangle([x - 110, y - 70, x + 110, y + 70], fill=(225, 245, 245), outline=INK, width=2)
    text(d, (x - 95, y - 48), sym, 34, anchor='lm'); text(d, (x + 95, y - 48), str(z), 24, anchor='rm')
    text(d, (x - 95, y - 15), mass, 20, RED, 'lm'); text(d, (x + 95, y - 15), val, 20, BLUE, 'rm')
    text(d, (x, y + 25), f'+{z}  ' + '  '.join(')' for _ in conf), 22)
    text(d, (x + 20, y + 52), '  '.join(str(c) for c in conf), 20)


@fig('chemistry-9-elements')
def elements():
    img, d = canvas()
    text(d, (400, 40), 'VIA', 30)
    shells(d, 400, 140, 'O', 8, '15.999', [2, 6], 'II')
    shells(d, 400, 300, 'S', 16, '32.065', [2, 8, 6], 'II, IV, VI')
    shells(d, 400, 460, 'Se', 34, '78.963', [2, 8, 18, 6], 'VI')
    for y, n in ((140, 'Хүчилтөрөгч'), (300, 'Хүхэр'), (460, 'Селен')):
        text(d, (540, y), n, 26, anchor='lm')
    return img


@fig('chemistry-9-alloy')
def alloy():
    img, d = canvas()
    for x0, lab, mix in ((60, 'а.', False), (430, 'б.', True)):
        text(d, (x0 + 10, 130), lab, 32, anchor='lm')
        for r in range(6):
            for c in range(8):
                ball(d, x0 + 30 + c * 38 + (19 if r % 2 else 0), 190 + r * 34, 17, (245, 160, 210), (210, 110, 170))
        if mix:
            for c, r in ((1, 1), (5, 0), (3, 2), (6, 3), (0, 4), (4, 5), (7, 1)):
                ball(d, x0 + 30 + c * 38 + (19 if r % 2 else 0), 190 + r * 34, 25, RED, (180, 30, 30))
    return img


@fig('chemistry-9-energy-chain')
def energy_chain():
    img, d = canvas()
    d.rectangle([40, 300, 140, 360], fill=(240, 220, 120), outline=INK, width=2)
    d.line([110, 300, 160, 210], fill=WOOD, width=8); ball(d, 165, 200, 12, RED)
    d.polygon([(160, 190), (170, 140), (185, 185)], fill=ORANGE)
    arrow(d, (210, 280), (260, 280), INK, 4)
    ball(d, 340, 280, 55, YELLOW, ORANGE)
    for k in range(8):
        a = math.radians(k * 45)
        d.line([340 + 65 * math.cos(a), 280 + 65 * math.sin(a), 340 + 85 * math.cos(a), 280 + 85 * math.sin(a)], fill=ORANGE, width=4)
    arrow(d, (440, 280), (490, 280), INK, 4)
    d.polygon([(510, 290), (580, 220), (650, 290)], fill=(200, 80, 70), outline=INK)
    d.rectangle([525, 290, 635, 370], fill=(240, 220, 170), outline=INK, width=2)
    d.polygon([(545, 265), (580, 232), (615, 265)], fill=(60, 80, 160))
    arrow(d, (660, 280), (700, 280), INK, 4)
    ball(d, 740, 260, 30, (255, 245, 180), INK)
    d.rectangle([728, 290, 752, 315], fill=GREY, outline=INK)
    for x, s in ((120, 'Шүдэнз'), (340, 'Нар'), (580, 'Нарны зай хураагуур'), (740, 'Чийдэн')):
        text(d, (x, 420), s, 22)
    return img


MONO = '/System/Library/Fonts/Menlo.ttc'


def formula(d, x, y, rows, size=30):
    from PIL import ImageFont
    f = ImageFont.truetype(MONO, size)
    for j, row in enumerate(rows):
        d.text((x, y + j * 40), row, font=f, fill=INK, anchor='lm')


@fig('chemistry-9-formulas')
def formulas():
    img, d = canvas()
    items = [('а.', ['  H H', '  | |', 'H-C=C-OH']),
             ('б.', ['  H O', '  | ||', 'H-C-C-OH', '  |', '  H']),
             ('в.', ['  H H', '  | |', 'H-C-C-OH', '  | |', '  H H']),
             ('г.', ['  H', '  |', 'H-C-C≡C-H', '  |', '  H'])]
    for i, (lab, rows) in enumerate(items):
        x, y = 40 + (i % 2) * 400, 70 + (i // 2) * 270
        text(d, (x, y), lab, 30, anchor='lm')
        formula(d, x + 50, y + 30, rows, 34)
    return img


@fig('chemistry-9-functional')
def functional():
    img, d = canvas()
    text(d, (60, 120), 'а.', 30, anchor='lm')
    formula(d, 100, 150, ['H     H O', ' \\    | ||', '  N - C-C', ' /    |  \\', 'H     R  OH'], 30)
    text(d, (470, 120), 'б.', 30, anchor='lm')
    formula(d, 510, 150, ['  H O', '  | ||', 'H-C-C', '  |  \\', '  H  OH'], 30)
    return img


@fig('chemistry-9-acetic-model')
def acetic_model():
    img, d = canvas()
    C1, C2 = (330, 330), (470, 290)
    O1, O2 = (520, 180), (600, 360)
    for a, b in ((C1, C2), (C2, O1), (C2, O2)):
        d.line([*a, *b], fill=GREY, width=14)
    for h in ((250, 260), (280, 420), (360, 430)):
        d.line([*C1, *h], fill=GREY, width=10); ball(d, *h, 26, (240, 240, 240), INK)
    d.line([*O2, 690, 330], fill=GREY, width=10); ball(d, 690, 330, 26, (240, 240, 240), INK)
    ball(d, *C1, 44, (40, 40, 45), INK); ball(d, *C2, 44, (40, 40, 45), INK)
    ball(d, *O1, 40, RED, INK); ball(d, *O2, 40, RED, INK)
    text(d, (400, 540), 'хар — C,  улаан — O,  цагаан — H', 24)
    return img


# ── Хими 10 ─────────────────────────────────────────────────────────────────

def chroma(d, cols, spots, x0=160, x1=640):
    d.rectangle([x0, 70, x1, 500], fill='white', outline=INK, width=3)
    d.line([x0, 440, x1, 440], fill=INK, width=3)
    step = (x1 - x0) / (len(cols) + 1)
    for i, c in enumerate(cols):
        x = x0 + step * (i + 1)
        ball(d, x, 440, 7, GREY, GREY)
        text(d, (x, 475), c, 30)
        for h, col in spots.get(c, []):
            ball(d, x, 440 - h * 330, 12, col, col)


@fig('chemistry-10-chromatogram-m')
def chromatogram_m():
    img, d = canvas()
    chroma(d, ['M', 'A', 'B', 'C'], {'M': [(0.85, INK), (0.55, INK), (0.3, INK)], 'A': [(0.3, INK)], 'B': [(0.15, INK)], 'C': [(0.55, INK)]})
    return img


@fig('chemistry-10-co2-limewater')
def co2_limewater():
    img, d = canvas()
    tube(d, 300, 120, 500, 80, 220, (240, 240, 245))
    d.line([290, 60, 290, 470], fill=INK, width=4)
    d.line([290, 60, 150, 60], fill=INK, width=4)
    for k in range(9):
        ball(d, 285 + (k * 13) % 25, 460 - k * 25, 6, 'white', INK)
    text(d, (130, 60), 'CO₂', 30, anchor='rm')
    text(d, (370, 380), 'Ca(OH)₂', 28, anchor='lm')
    arrow(d, (365, 380), (330, 380), INK, 2)
    return img


@fig('chemistry-10-chromatogram-xy')
def chromatogram_xy():
    img, d = canvas()
    chroma(d, ['X', 'Y', 'R', 'S', 'T'], {'X': [(0.65, ORANGE), (0.25, (80, 190, 220))], 'Y': [(0.85, PINK), (0.45, (140, 200, 60))],
                                          'R': [(0.25, (80, 190, 220))], 'S': [(0.45, (140, 200, 60))], 'T': [(0.85, PINK)]}, 140, 660)
    return img


# ── Хими 11 ─────────────────────────────────────────────────────────────────

@fig('chemistry-11-molecule')
def molecule():
    img, d = canvas()
    y = 300
    xs = [130, 260, 390, 520, 650]
    for i in range(4):
        x1, x2 = xs[i] + 22, xs[i + 1] - 22
        if i in (0, 3):
            d.line([x1, y - 6, x2, y - 6], fill=INK, width=4); d.line([x1, y + 6, x2, y + 6], fill=INK, width=4)
        else:
            d.line([x1, y, x2, y], fill=INK, width=4)
    for x in xs:
        text(d, (x, y), 'C', 34)
    def h(x, y):
        text(d, (x, y), 'H', 30, BLUE)
    for dx, dy in ((-70, -60), (-70, 60)):
        d.line([xs[0] - 18, y + dy / 4, xs[0] + dx + 18, y + dy - dy / 5], fill=INK, width=3); h(xs[0] + dx, y + dy)
    for dx, dy in ((70, -60), (70, 60)):
        d.line([xs[4] + 18, y + dy / 4, xs[4] + dx - 18, y + dy - dy / 5], fill=INK, width=3); h(xs[4] + dx, y + dy)
    d.line([xs[3], y - 22, xs[3], y - 80], fill=INK, width=3); h(xs[3], y - 100)
    d.line([xs[2], y - 22, xs[2], y - 80], fill=INK, width=3); h(xs[2], y - 100)
    for x, up in ((xs[1], -1), (xs[2], 1)):
        cy = y + up * 120
        d.line([x, y + up * 22, x, cy - up * 22], fill=INK, width=3); text(d, (x, cy), 'C', 34)
        for dx, dy in ((-60, 0), (60, 0), (0, up * 60)):
            d.line([x + dx * 0.35, cy + dy * 0.35, x + dx * 0.7, cy + dy * 0.7], fill=INK, width=3); h(x + dx, cy + dy)
    return img


@fig('chemistry-11-water-hbond')
def water_hbond():
    img, d = canvas()
    def water(ox, oy, h1, h2):
        for hx, hy in (h1, h2):
            d.line([ox, oy, hx, hy], fill=INK, width=5); ball(d, hx, hy, 18, 'white', INK, 'H', 22)
        ball(d, ox, oy, 28, (240, 120, 120), INK, 'O', 26)
    water(400, 200, (330, 150), (470, 150))
    water(250, 400, (190, 450), (310, 450))
    water(560, 400, (500, 450), (620, 450))
    dashed(d, (400, 228), (310, 400 - 40), RED, 3, 8, 6)
    dashed(d, (470, 150), (560, 372), RED, 3, 8, 6)
    text(d, (180, 280), 'Устөрөгчийн холбоо', 24, RED)
    text(d, (640, 200), 'Ковалент холбоо', 24)
    arrow(d, (590, 210), (450, 175), GREY, 2)
    return img


def boltz(g, T, scale):
    return lambda e: scale * (e / T) ** 0.5 * math.exp(-e / T)


@fig('chemistry-11-boltzmann-four')
def boltzmann_four():
    img, d = canvas()
    g = Graph(d, (120, 80, 720, 480), (0, 10), (0, 1), 20, 20, 'Энерги', 'Жижиг хэсгийн тоо', grid=False, fmt=lambda v: '')
    for T, col, lab, peak in ((0.35, (60, 190, 170), 'A', 0.95), (1.0, BLUE, '300 K', 0.62), (1.8, (160, 60, 200), 'B', 0.48), (3.0, RED, '1000 K', 0.38)):
        shape = lambda e, T=T: (e / T) ** 0.5 * math.exp(-e / T)
        top = shape(T / 2)
        f = lambda e, shape=shape, top=top, peak=peak: peak * shape(e) / top
        g.curve(f, 0.01, 10, col, 4)
        text(d, (g.px(T / 2) + 18, g.py(peak) - 18), lab, 26, col, 'lm')
    return img


@fig('chemistry-11-galvanic')
def galvanic():
    img, d = canvas()
    beaker(d, 90, 230, 330, 500, 300, (150, 210, 235))
    beaker(d, 470, 230, 710, 500, 300, (245, 235, 160))
    d.rectangle([180, 130, 210, 440], fill=(160, 165, 175), outline=INK, width=2)
    d.rectangle([590, 130, 620, 440], fill=(200, 205, 215), outline=INK, width=2)
    d.line([195, 130, 195, 80, 605, 80, 605, 130], fill=INK, width=3)
    d.rectangle([370, 65, 430, 95], fill='white', outline=INK, width=2)
    d.line([260, 380, 260, 200, 540, 200, 540, 380], fill=(80, 80, 90), width=26)
    text(d, (160, 170), 'Zn', 26, anchor='rm')
    for n, (x, y) in (('1', (130, 460)), ('2', (400, 200)), ('3', (670, 460)), ('4', (650, 160))):
        ball(d, x, y, 20, 'white', INK, n, 24)
    return img


@fig('chemistry-11-boltzmann-one')
def boltzmann_one():
    img, d = canvas()
    g = Graph(d, (140, 90, 700, 470), (0, 10), (0, 1), 20, 20, 'Энерги', 'Жижиг хэсгийн тоо', grid=False, fmt=lambda v: '')
    f = lambda e: 1.65 * (e / 1.6) ** 0.5 * math.exp(-e / 1.6)
    g.curve(f, 0.01, 10, PINK, 4)
    for e, lab in ((0.8, 'E_маг'), (5.5, 'E_ид')):
        dashed(d, g.p(e, 0), g.p(e, f(e)), PINK)
        text(d, (g.px(e), g.y1 + 26), lab, 24)
    return img


if __name__ == '__main__':
    OUT.mkdir(parents=True, exist_ok=True)
    only = sys.argv[1:]
    for name, draw in FIG.items():
        if only and not any(name.startswith(o) for o in only):
            continue
        save(draw(), OUT / f'{name}.png')
    print(len(FIG), 'зураг')
