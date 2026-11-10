"""Физик 8–11-ийн зурагтай асуултын зургууд (өөрсдөө зурсан, номын скан биш).
python3 scripts/draw-physics-8-11.py → seed/images/physics-<анги>-*.png (seed/physics-image-questions.json заана)."""
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from figlib import (BLUE, GREEN, GREY, GRID, INK, ORANGE, PINK, RED, WATER, WOOD, YELLOW, Graph, arrow, ball,
                    battery, canvas, dashed, dim, lamp, meter, node, resistor, save, terminal, text, wire)

OUT = Path(__file__).resolve().parent.parent / 'seed' / 'images'
FIG = {}


def fig(name):
    def reg(f):
        FIG[name] = f
        return f
    return reg


# ── Физик 8 ─────────────────────────────────────────────────────────────────

@fig('physics-8-vessels')
def vessels():
    img, d = canvas()
    TOP, BOT, LVL, BASE = 150, 440, 210, 90
    def vessel(outline, water):
        d.polygon(water, fill=WATER)
        d.line(outline, fill=INK, width=4, joint='curve')
    x = 80
    vessel([(x, TOP), (x, BOT), (x + BASE, BOT), (x + BASE, TOP)], [(x, LVL), (x, BOT), (x + BASE, BOT), (x + BASE, LVL)])
    x, t = 260, 55
    k = (BOT - LVL) / (BOT - TOP)
    vessel([(x - t, TOP), (x, BOT), (x + BASE, BOT), (x + BASE + t, TOP)],
           [(x - t * k, LVL), (x, BOT), (x + BASE, BOT), (x + BASE + t * k, LVL)])
    x, n, neck = 440, 14, 330
    c = x + BASE / 2
    shape = [(c - n, neck), (x, neck + 40), (x, BOT), (x + BASE, BOT), (x + BASE, neck + 40), (c + n, neck)]
    vessel([(c - n, TOP)] + shape + [(c + n, TOP)], [(c - n, LVL)] + shape + [(c + n, LVL)])
    x, sh = 630, 70
    xl = lambda y: x + sh * (BOT - y) / (BOT - TOP)
    xr = lambda y: x + BASE + (sh + 40 - BASE) * (BOT - y) / (BOT - TOP)
    d.polygon([(xl(LVL), LVL), (x, BOT), (x + BASE, BOT), (xr(LVL), LVL)], fill=WATER)
    d.line([(x + sh, TOP), (x, BOT)], fill=INK, width=4)
    d.line([(x + BASE, BOT), (x + sh + 40, TOP)], fill=INK, width=4)
    for x0 in (80, 260, 440, 630):
        d.rectangle([x0, BOT, x0 + BASE, BOT + 12], fill=INK)
        arrow(d, (x0 + BASE / 2, LVL + 20), (x0 + BASE / 2, BOT - 4), RED, 3, 18)
    dashed(d, (40, LVL), (780, LVL), RED, 2, 12, 10)
    d.line([30, LVL, 30, BOT], fill=INK, width=2)
    for y in (LVL, BOT):
        d.line([22, y, 38, y], fill=INK, width=2)
    text(d, (52, (LVL + BOT) / 2), 'h', 30, anchor='lm')
    return img


@fig('physics-8-pool')
def pool():
    img, d = canvas()
    d.polygon([(130, 170), (230, 450), (570, 450), (670, 170)], fill=WATER)
    for y in range(200, 450, 30):
        dashed(d, (150 + (y - 170) * 0.36, y), (650 - (y - 170) * 0.36, y), (110, 160, 220), 2, 18, 12)
    d.line([(110, 170), (130, 170), (230, 450), (570, 450), (670, 170), (690, 170)], fill=INK, width=5)
    dim(d, (720, 170), (720, 450), 'h', 30, (24, 0))
    text(d, (400, 140), 'Усны мандал', 26)
    text(d, (400, 490), 'Ёроол', 26)
    return img


@fig('physics-8-hydraulic')
def hydraulic():
    img, d = canvas()
    y_top, y_bot = 250, 470
    d.rectangle([170, 300, 240, y_bot], fill=WATER)          # жижиг цилиндр
    d.rectangle([470, 300, 690, y_bot], fill=WATER)          # том цилиндр
    d.rectangle([170, 430, 690, y_bot], fill=WATER)          # холбох хоолой
    d.line([(170, y_top), (170, y_bot), (690, y_bot), (690, y_top)], fill=INK, width=4)
    d.line([(240, y_top), (240, 430), (470, 430), (470, y_top)], fill=INK, width=4)
    d.rectangle([172, 285, 238, 300], fill=GREY, outline=INK)  # бүлүүр
    d.rectangle([472, 285, 688, 300], fill=GREY, outline=INK)
    d.rectangle([185, 245, 225, 285], fill=INK); text(d, (205, 265), '?', 22, 'white')
    d.rectangle([540, 225, 620, 285], fill=INK); text(d, (580, 255), '?', 26, 'white')
    text(d, (205, 215), 'm₁', 28); text(d, (580, 195), 'm₂', 28)
    text(d, (135, 330), 'S₁', 28); text(d, (725, 360), 'S₂', 28)
    return img


@fig('physics-8-spring-graph')
def spring_graph():
    img, d = canvas()
    g = Graph(d, (180, 110, 620, 500), (0, 5), (0, 10), 1, 2, 'Δx, см', 'F, Н')
    g.line([(0, 0), (5, 10)], INK, 5)
    g.guide(2, 4, BLUE); g.guide(4, 8, BLUE)
    return img


@fig('physics-8-pulley')
def pulley():
    img, d = canvas()
    d.rectangle([200, 80, 600, 100], fill=GREY, outline=INK, width=2)
    d.line([300, 100, 300, 230], fill=INK, width=6)
    cx, cy, r = 300, 260, 50
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(200, 205, 215), outline=INK, width=4)
    d.ellipse([cx - 8, cy - 8, cx + 8, cy + 8], fill=INK)
    d.line([cx - r, cy, cx - r, 430], fill=INK, width=3)                 # ачааны утас
    d.rectangle([cx - r - 35, 430, cx - r + 35, 510], fill=(150, 150, 160), outline=INK, width=3)
    text(d, (cx - r, 470), 'P', 30, 'white')
    d.line([cx, cy - r, 560, cy - r], fill=INK, width=3)                 # В: хэвтээ
    d.rectangle([560, cy - r - 18, 680, cy - r + 18], fill='white', outline=RED, width=3)
    text(d, (620, cy - r - 45), 'B', 30)
    a = math.radians(45)
    sx, sy = cx + r * math.cos(a), cy + r * math.sin(a)
    ex, ey = sx + 200 * math.cos(-a + math.pi / 2), sy + 200 * math.sin(a)
    d.line([sx, sy, sx + 150, sy + 150], fill=INK, width=3)             # А: налуу
    d.polygon([(sx + 150, sy + 150), (sx + 235, sy + 235), (sx + 210, sy + 260), (sx + 125, sy + 175)], fill='white', outline=RED)
    text(d, (sx + 255, sy + 200), 'A', 30)
    return img


@fig('physics-8-lever-forces')
def lever_forces():
    img, d = canvas()
    y, px, m = 330, 470, 260          # тулах цэг, 1 м = 260 px
    d.line([px - 0.9 * m, y, px + 1.1 * m, y], fill=INK, width=6)
    d.polygon([(px, y + 4), (px - 28, y + 54), (px + 28, y + 54)], fill=INK)
    arrow(d, (px - 0.5 * m, y), (px - 0.5 * m, y - 120), BLUE, 4, 18); text(d, (px - 0.5 * m, y - 145), '20 Н', 28)
    arrow(d, (px - 0.8 * m, y), (px - 0.8 * m, y + 120), RED, 4, 18); text(d, (px - 0.8 * m, y + 145), 'F', 30)
    arrow(d, (px + 1.0 * m, y), (px + 1.0 * m, y + 120), RED, 4, 18); text(d, (px + 1.0 * m, y + 145), '10 Н', 28)
    dim(d, (px - 0.5 * m, y - 40), (px, y - 40), '0.5 м', 24)
    dim(d, (px - 0.8 * m, y + 80), (px, y + 80), '0.8 м', 24, (0, 24))
    dim(d, (px, y - 40), (px + 1.0 * m, y - 40), '1.0 м', 24)
    return img


@fig('physics-8-forearm')
def forearm():
    img, d = canvas()
    ey, ex = 360, 150            # тохой
    d.rounded_rectangle([ex - 20, 110, ex + 30, ey + 20], 20, fill=(245, 215, 190), outline=INK, width=3)   # мөр
    d.rounded_rectangle([ex - 20, ey - 22, 640, ey + 22], 20, fill=(245, 215, 190), outline=INK, width=3)  # шуу
    d.ellipse([ex - 22, ey - 22, ex + 22, ey + 22], fill=GREY, outline=INK, width=3)
    k = 13                                                        # 1 см
    mx = ex + 4 * k * 2
    d.polygon([(ex + 5, 150), (ex + 45, 170), (mx + 10, ey - 22), (mx - 10, ey - 22)], fill=(225, 120, 120), outline=INK)
    text(d, (ex + 120, 200), 'Булчин', 26, anchor='lm')
    ball(d, ex + 35 * k + 40, ey - 70, 50, (150, 220, 90))
    dim(d, (ex, ey + 70), (mx, ey + 70), '4 см', 22, (0, 24))
    dim(d, (ex, ey + 130), (ex + 35 * k + 40, ey + 130), '35 см', 24, (0, 24))
    for x in (ex, mx, ex + 35 * k + 40):
        dashed(d, (x, ey + 25), (x, ey + 135), GREY)
    return img


@fig('physics-8-orbit')
def orbit():
    img, d = canvas()
    cx, cy, a, b = 400, 300, 320, 180
    d.ellipse([cx - a, cy - b, cx + a, cy + b], outline=BLUE, width=4)
    fx = cx + math.sqrt(a * a - b * b)
    ball(d, fx, cy, 60, (70, 140, 210)); text(d, (fx, cy), 'Дэлхий', 22, 'white')
    for name, t in (('A', -0.55), ('B', 0.55), ('C', 2.3), ('D', -2.3)):
        x, y = cx + a * math.cos(t), cy - b * math.sin(t)
        ball(d, x, y, 9, PINK, PINK)
        text(d, (x + (28 if math.cos(t) > 0 else -28), y + (-28 if math.sin(t) > 0 else 28)), name, 30)
    return img


@fig('physics-8-vt-steps')
def vt_steps():
    img, d = canvas()
    g = Graph(d, (150, 100, 680, 480), (0, 6), (0, 20), 1, 5, 'Хугацаа, ц', 'Хурд, км/ц')
    g.line([(0, 10), (2, 10), (2, 15), (4, 15), (4, 5), (6, 5)], BLUE, 5)
    return img


@fig('physics-8-vt-ramp')
def vt_ramp():
    img, d = canvas()
    g = Graph(d, (130, 90, 700, 470), (0, 35), (0, 40), 5, 10, 'Хугацаа, с', 'Хурд, м/с', minor=(1, 2))
    g.line([(0, 0), (15, 30), (35, 30)], BLUE, 5)
    return img


@fig('physics-8-st-bike')
def st_bike():
    img, d = canvas()
    g = Graph(d, (150, 90, 650, 470), (0, 15), (0, 60), 5, 20, 'Хугацаа, с', 'Зам, м')
    g.line([(0, 0), (5, 20), (10, 20), (15, 60)], BLUE, 5)
    return img


@fig('physics-8-dots')
def dots():
    img, d = canvas()
    rows = {'А': [0, 1, 2, 3, 4], 'Б': [0, 0.4, 1.0, 1.9, 3.1, 4.6], 'В': [0, 1.5, 2.2, 2.6, 3.4, 4.9]}
    for i, (name, xs) in enumerate(rows.items()):
        y = 170 + i * 130
        d.rounded_rectangle([90, y - 35, 660, y + 35], 8, fill=(205, 235, 250), outline=INK, width=2)
        for x in xs:
            ball(d, 130 + x * 100, y, 13, BLUE, INK)
        text(d, (700, y), name, 34)
    text(d, (400, 70), 'Машины тэнцүү хугацааны дараах байрлал', 26)
    return img


@fig('physics-8-vt-four')
def vt_four():
    img, d = canvas()
    g = Graph(d, (130, 90, 660, 480), (0, 10), (0, 30), 1, 5, 'Хугацаа, с', 'Хурд, м/с')
    g.line([(0, 5), (10, 30)], BLUE, 4); g.line([(0, 30), (10, 22.5)], RED, 4)
    g.line([(0, 20), (10, 20)], GREEN, 4); g.line([(0, 5), (5, 10), (8, 15), (10, 15)], ORANGE, 4)
    for n, y, c in (('A', 30, BLUE), ('B', 22.5, RED), ('C', 20, GREEN), ('D', 15, ORANGE)):
        text(d, (g.px(10) + 30, g.py(y)), n, 28, c)
    return img


@fig('physics-8-vt-ab')
def vt_ab():
    img, d = canvas()
    g = Graph(d, (150, 100, 640, 480), (0, 40), (0, 50), 10, 10, 'Хугацаа, с', 'Хурд, м/с')
    g.line([(0, 40), (40, 40)], BLUE, 4); g.line([(0, 25), (20, 50), (40, 50)], RED, 4)
    text(d, (g.px(40) + 30, g.py(40)), 'A', 30, BLUE); text(d, (g.px(40) + 30, g.py(50)), 'B', 30, RED)
    return img


@fig('physics-8-vt-three')
def vt_three():
    img, d = canvas()
    g = Graph(d, (150, 100, 650, 480), (0, 12), (0, 30), 2, 5, 'Хугацаа, с', 'Хурд, м/с')
    g.line([(0, 0), (5, 20)], BLUE, 5)
    g.curve(lambda t: 20 + 5 * math.sin((t - 5) / 2.5 * math.pi / 2), 5, 7.5, BLUE, 5)
    g.line([(7.5, 25), (12, 25)], BLUE, 5)
    g.guide(5, 20)
    for n, x in (('I', 2.5), ('II', 6.2), ('III', 10)):
        text(d, (g.px(x), g.py(28)), n, 26)
    return img


@fig('physics-8-crane')
def crane():
    img, d = canvas()
    gy, ty = 470, 210                 # газар, 4 м өндөр
    d.line([60, gy, 740, gy], fill=INK, width=4)
    d.line([60, ty, 740, ty], fill=GREY, width=2)
    for x in (160, 330, 520, 700):
        pass
    arrow(d, (150, gy - 10), (150, ty + 10), INK, 4); text(d, (180, (gy + ty) / 2), '4 м', 28, anchor='lm')
    arrow(d, (300, gy - 10), (300, 340), INK, 4); text(d, (325, 405), '2 м', 26, anchor='lm')
    arrow(d, (300, 340), (470, 340), INK, 4); text(d, (385, 315), '3 м', 26)
    arrow(d, (470, 340), (470, ty + 10), INK, 4); text(d, (495, 275), '2 м', 26, anchor='lm')
    arrow(d, (560, gy - 10), (710, ty + 10), INK, 4); text(d, (660, 360), '6 м', 28, anchor='lm')
    for x in (150, 300, 560):
        d.rectangle([x - 25, gy - 20, x + 25, gy], fill=WOOD, outline=INK)
    for x in (150, 470, 710):
        d.rectangle([x - 25, ty - 20, x + 25, ty], fill=WOOD, outline=INK)
    text(d, (400, 120), 'Ижил 0.5 т ачааг 4 м өндөрт гурван замаар', 26)
    return img


@fig('physics-8-dynamometer')
def dynamometer():
    img, d = canvas()
    y = 300
    d.rectangle([520, y - 40, 740, y + 40], fill=(180, 120, 110), outline=INK, width=3)
    d.line([360, y, 520, y], fill=INK, width=3)
    d.rounded_rectangle([200, y - 25, 360, y + 25], 10, fill=(225, 228, 235), outline=INK, width=3)
    text(d, (280, y - 55), '2 Н', 30)
    d.line([120, y, 200, y], fill=INK, width=3)
    arrow(d, (110, y), (40, y), BLUE, 8, 26)
    dim(d, (200, y + 110), (520, y + 110), '0.5 м', 28, (0, 28))
    return img


@fig('physics-8-balls')
def balls():
    img, d = canvas()
    for x0, lab, near in ((80, 'а', -1), (440, 'б', 1)):
        d.line([x0, 120, x0 + 280, 120], fill=INK, width=5)
        if near < 0:   # таталцана: бөмбөлгүүд ойртоно
            p1, p2 = (x0 + 125, 430), (x0 + 165, 430)
        else:          # түлхэлцэнэ: холдоно
            p1, p2 = (x0 + 50, 430), (x0 + 240, 430)
        d.line([x0 + 100, 120, *p1], fill=INK, width=2); d.line([x0 + 180, 120, *p2], fill=INK, width=2)
        ball(d, *p1, 20, 'white', INK, '?', 22)
        ball(d, *p2, 20, 'white', INK, '−' if near < 0 else '+', 30)
        text(d, (x0 + 140, 520), lab, 32)
    return img


@fig('physics-8-electroscopes')
def electroscopes():
    img, d = canvas()
    for cx, spread, lab in ((230, 12, 'а'), (570, 45, 'б')):
        d.ellipse([cx - 120, 160, cx + 120, 400], outline=INK, width=5)
        d.line([cx, 120, cx, 300], fill=INK, width=4)
        ball(d, cx, 105, 22, GREY)
        for s in (-1, 1):
            a = math.radians(spread)
            d.line([cx, 300, cx + s * 90 * math.sin(a), 300 + 90 * math.cos(a)], fill=INK, width=4)
        d.polygon([(cx - 90, 470), (cx - 60, 395), (cx + 60, 395), (cx + 90, 470)], fill=(90, 90, 100))
        text(d, (cx, 520), lab, 32)
    return img


def loop(d, x0, y0, x1, y1):
    wire(d, [(x0, y0), (x1, y0), (x1, y1), (x0, y1), (x0, y0)])


@fig('physics-8-circuit-1')
def circuit_1():
    img, d = canvas()
    wire(d, [(60, 300), (240, 300)])
    lamp(d, 140, 300, 22, 'Г', (0, 40))
    wire(d, [(240, 180), (240, 420)]); wire(d, [(560, 180), (560, 420)]); wire(d, [(560, 300), (740, 300)])
    wire(d, [(240, 180), (560, 180)]); wire(d, [(240, 420), (560, 420)])
    lamp(d, 340, 180, 22, 'А', (0, 42)); lamp(d, 470, 180, 22, 'Б', (0, 42)); lamp(d, 400, 420, 22, 'В', (0, 42))
    node(d, 240, 300); node(d, 560, 300)
    arrow(d, (265, 150), (320, 150), RED, 3); text(d, (270, 125), '2 А', 26, RED)
    arrow(d, (265, 450), (320, 450), RED, 3); text(d, (270, 480), '1 А', 26, RED)
    return img


@fig('physics-8-circuit-2')
def circuit_2():
    img, d = canvas()
    wire(d, [(60, 300), (220, 300)]); wire(d, [(580, 300), (740, 300)])
    lamp(d, 130, 300, 22)
    wire(d, [(220, 180), (220, 420)]); wire(d, [(580, 180), (580, 420)])
    wire(d, [(220, 180), (580, 180)]); wire(d, [(220, 420), (580, 420)])
    wire(d, [(400, 180), (400, 420)])
    node(d, 400, 180); node(d, 400, 420); node(d, 220, 300); node(d, 580, 300)
    lamp(d, 310, 180, 22, 'А', (0, 42)); lamp(d, 490, 180, 22, 'В', (0, 42))
    lamp(d, 310, 420, 22, 'Б', (0, -42)); lamp(d, 490, 420, 22, 'Г', (0, -42))
    text(d, (310, 130), '2 А', 26, RED); text(d, (490, 130), '3 А', 26, RED); text(d, (310, 470), '3 А', 26, RED)
    return img


@fig('physics-8-iu')
def iu():
    img, d = canvas()
    g = Graph(d, (150, 100, 640, 480), (0, 60), (0, 0.8), 10, 0.2, 'U, В', 'I, А', minor=(5, 0.1))
    g.line([(0, 0), (53.3, 0.8)], BLUE, 5)
    return img


@fig('physics-8-cylinder-stone')
def cylinder_stone():
    img, d = canvas()
    cx, w, top, bottom = 400, 120, 60, 560
    px = (bottom - top - 40) / 1000
    base = bottom - 10
    d.rectangle([cx - w / 2, base - 800 * px, cx + w / 2, base], fill=WATER)
    d.polygon([(cx - 40, base), (cx - 48, base - 40), (cx - 10, base - 70), (cx + 34, base - 50), (cx + 42, base)], fill=(130, 120, 110), outline=INK)
    d.line([cx - w / 2, top, cx - w / 2, bottom], fill=INK, width=4); d.line([cx + w / 2, top, cx + w / 2, bottom], fill=INK, width=4)
    d.line([cx - w / 2 - 30, bottom, cx + w / 2 + 30, bottom], fill=INK, width=6)
    for ml in range(0, 1001, 50):
        y = base - ml * px
        long = ml % 100 == 0
        d.line([cx - w / 2, y, cx - w / 2 + (34 if long else 18), y], fill=INK, width=3 if long else 2)
        if long and ml:
            text(d, (cx - w / 2 - 12, y), str(ml), 22, anchor='rm')
    text(d, (cx + w / 2 + 10, top + 10), 'см³', 22, anchor='lm')
    for ml, lab in ((500, 'Дүрэхээс өмнө'), (800, 'Дүрсний дараа')):
        y = base - ml * px
        dashed(d, (cx + w / 2, y), (cx + w / 2 + 90, y), RED, 3)
        text(d, (cx + w / 2 + 100, y), lab, 24, RED, 'lm')
    return img


def tick_lever(d, ticks, pivot, y, unit):
    x0 = pivot - ticks[0] * unit
    d.line([x0, y, pivot + ticks[1] * unit, y], fill=INK, width=6)
    for i in range(-ticks[0], ticks[1] + 1):
        d.line([pivot + i * unit, y - 14, pivot + i * unit, y + 14], fill=INK, width=3)
    d.polygon([(pivot, y + 4), (pivot - 26, y + 50), (pivot + 26, y + 50)], fill=INK)
    text(d, (pivot, y - 40), 'O', 28)


@fig('physics-8-lever-3n')
def lever_3n():
    img, d = canvas()
    y, p, u = 240, 330, 90
    tick_lever(d, (2, 3), p, y, u)
    d.line([p - u, y, p - u, 360], fill=INK, width=3)
    d.rectangle([p - u - 45, 360, p - u + 45, 420], fill=INK); text(d, (p - u, 390), '3 Н', 28, 'white')
    arrow(d, (p + 3 * u, y), (p + 3 * u, y + 150), RED, 4, 18)
    text(d, (p + 3 * u, y - 40), 'A', 30); text(d, (p + 3 * u + 30, y + 130), 'F', 30, RED)
    return img


@fig('physics-8-lever-5kg')
def lever_5kg():
    img, d = canvas()
    y, p, u = 240, 470, 130
    tick_lever(d, (2, 1), p, y, u)
    d.line([p - 2 * u, y, p - 2 * u, 360], fill=INK, width=3)
    d.rectangle([p - 2 * u - 55, 360, p - 2 * u + 55, 425], fill=INK); text(d, (p - 2 * u, 392), '5 кг', 28, 'white')
    arrow(d, (p + u, y), (p + u, y + 150), RED, 4, 18)
    text(d, (p + u, y - 40), 'A', 30); text(d, (p - 2 * u, y - 40), 'B', 30); text(d, (p + u + 30, y + 130), 'F', 30, RED)
    return img


@fig('physics-8-vessels-mm')
def vessels_mm():
    img, d = canvas()
    BOT, LVL, MID, TOP = 470, 170, 300, 120   # ус 500 мм: доод хэсэг 300, дээд 200 мм
    def vessel(outline, water):
        d.polygon(water, fill=WATER)
        d.line(outline, fill=INK, width=4, joint='curve')
    # 1. Нарийн хүзүүтэй
    neck = [(205, MID), (150, MID), (150, BOT), (330, BOT), (330, MID), (275, MID)]
    vessel([(205, TOP)] + neck + [(275, TOP)], [(205, LVL)] + neck + [(275, LVL)])
    # 2. Энгийн сав
    vessel([(400, TOP), (400, BOT), (560, BOT), (560, TOP)], [(400, LVL), (400, BOT), (560, BOT), (560, LVL)])
    # 3. Налуу хоолойтой
    vessel([(630, TOP), (630, BOT), (740, BOT), (740, BOT - 40), (675, BOT - 40), (760, TOP)],
           [(630, LVL), (630, BOT), (740, BOT), (740, BOT - 40), (675, BOT - 40),
            (675 + 85 * (BOT - 40 - LVL) / (BOT - 40 - TOP), LVL)])
    dashed(d, (60, LVL), (780, LVL), GREY)
    dashed(d, (60, MID), (150, MID), GREY)
    dim(d, (80, MID), (80, BOT), '300', 24, (-34, 0))
    dim(d, (80, LVL), (80, MID), '200', 24, (-34, 0))
    text(d, (400, 540), 'Хэмжээ мм-ээр', 24)
    return img


# ── Физик 9 ─────────────────────────────────────────────────────────────────

@fig('physics-9-ice-steam')
def ice_steam():
    img, d = canvas()
    g = Graph(d, (120, 80, 700, 500), (0, 10), (-30, 130), 10, 200, 'Хугацаа', 't, °C', grid=False, fmt=lambda v: '')
    pts = [(0, -20), (1, 0), (3, 0), (5, 100), (7.5, 100), (9.5, 125)]
    g.line(pts, BLUE, 5)
    for (x, y), n, off in zip(pts, ['А', 'О', 'Б', 'В', 'Г', 'Д'], [(-22, 10), (-22, -22), (16, 24), (-20, -24), (16, -24), (20, -10)]):
        ball(d, *g.p(x, y), 6, RED, RED)
        text(d, (g.px(x) + off[0], g.py(y) + off[1]), n, 28)
    for y, lab in ((0, '0'), (100, '100')):
        dashed(d, g.p(0, y), g.p(10, y), RED, 2)
        text(d, (g.x0 - 12, g.py(y)), lab, 22, anchor='rm')
    return img


@fig('physics-9-melting')
def melting():
    img, d = canvas()
    g = Graph(d, (130, 90, 700, 480), (0, 22), (50, 100), 2, 10, 'Хугацаа, мин', 't, °C', minor=(1, 2))
    pts = [(0, 55), (2, 65), (4, 75), (5, 80), (6, 80), (7, 80), (8, 82), (9, 85), (10, 87), (11, 85), (12, 82),
           (13, 80), (14, 80), (16, 80), (18, 80), (20, 77), (22, 75)]
    g.line(pts, BLUE, 4, dots=True)
    return img


@fig('physics-9-boiling-map')
def boiling_map():
    img, d = canvas()
    d.rectangle([0, 0, 800, 600], fill=(225, 240, 252))
    d.polygon([(0, 560), (180, 520), (330, 420), (470, 300), (600, 150), (680, 90), (760, 200), (800, 260), (800, 600), (0, 600)], fill=(150, 200, 130))
    pts = [(110, 540, 'Далайн түвшин', '100°C', '1 атм'), (330, 420, 'Бурхан Халдун', '93°C', ''),
           (470, 300, 'Лхас, Төвд', '90°C', ''), (600, 150, 'Отгонтэнгэр', '85°C', '0.63 атм'), (680, 90, 'Эверест', '70°C', '0.34 атм')]
    for x, y, name, t, p in pts:
        ball(d, x, y, 9, RED, INK)
        text(d, (x - 14, y - 26), name, 20, anchor='rm' if x > 600 else 'mm')
        text(d, (x + 16, y + 6), t, 22, RED, 'lm')
        if p:
            text(d, (x - 14, y - 50), p, 20, BLUE, 'rm' if x > 600 else 'mm')
    text(d, (400, 40), 'Усны буцлах температур ба агаарын даралт', 24)
    return img


def src5(d, x, y0, y1):
    terminal(d, x, y0, '+'); terminal(d, x, y1, '−')
    text(d, (x - 10, (y0 + y1) / 2), '5 В', 26, anchor='rm')


@fig('physics-9-circuit-a')
def circuit_a():
    img, d = canvas()
    src5(d, 150, 200, 420)
    wire(d, [(157, 200), (640, 200), (640, 420), (157, 420)])
    wire(d, [(400, 200), (400, 420)])
    lamp(d, 280, 200, 26, '1', (0, -44)); lamp(d, 520, 200, 26, '2', (0, -44))
    lamp(d, 400, 310, 26, '3', (44, 0)); lamp(d, 640, 310, 26, '4', (44, 0))
    node(d, 400, 200); node(d, 400, 420)
    return img


@fig('physics-9-circuit-b')
def circuit_b():
    img, d = canvas()
    src5(d, 150, 200, 420)
    wire(d, [(157, 200), (660, 200), (660, 420), (157, 420)])
    for x in (260, 460, 660):
        wire(d, [(x, 200), (x, 420)])
    lamp(d, 360, 200, 26, '1', (0, -44))
    lamp(d, 260, 310, 26, '2', (44, 0)); lamp(d, 460, 310, 26, '3', (44, 0)); lamp(d, 660, 310, 26, '4', (44, 0))
    for x in (260, 460):
        node(d, x, 200); node(d, x, 420)
    return img


@fig('physics-9-circuit-v')
def circuit_v():
    img, d = canvas()
    src5(d, 150, 160, 460)
    wire(d, [(157, 160), (560, 160)]); wire(d, [(157, 460), (560, 460)])
    for x in (360, 560):
        wire(d, [(x, 160), (x, 460)])
    wire(d, [(360, 310), (560, 310)])
    lamp(d, 360, 235, 26, '1', (44, 0)); lamp(d, 560, 235, 26, '2', (44, 0))
    lamp(d, 360, 385, 26, '3', (44, 0)); lamp(d, 560, 385, 26, '4', (44, 0))
    for p in ((360, 160), (360, 310), (560, 310), (360, 460)):
        node(d, *p)
    return img


@fig('physics-9-circuit-10ohm')
def circuit_10ohm():
    img, d = canvas()
    loop(d, 200, 180, 600, 420)
    battery(d, 400, 180)
    resistor(d, 400, 420, 120, 34, '10 Ом', (0, 0))
    return img


@fig('physics-9-circuit-6v')
def circuit_6v():
    img, d = canvas()
    loop(d, 200, 180, 600, 420)
    battery(d, 400, 180, '6.0 В', (0, -48))
    resistor(d, 400, 420, 120, 34)
    arrow(d, (560, 380), (480, 380), RED, 3); text(d, (540, 350), '300 мА', 26, RED)
    return img


@fig('physics-9-iu-two')
def iu_two():
    img, d = canvas()
    g = Graph(d, (140, 90, 680, 480), (0, 6), (0, 3.5), 1, 0.5, 'U, В', 'I, А', minor=(0.5, 0.25))
    g.line([(v, v / 2) for v in range(7)], RED, 4, dots=True)
    g.line([(v, v / 4) for v in range(7)], GREEN, 4, dots=True)
    text(d, (g.px(5.4), g.py(3.0)), 'A', 32, RED); text(d, (g.px(6.3), g.py(1.6)), 'Б', 32, GREEN)
    return img


@fig('physics-9-two-lamps-3v')
def two_lamps_3v():
    img, d = canvas()
    wire(d, [(200, 300), (200, 140), (600, 140), (600, 300)])
    battery(d, 400, 140, '3 В', (-60, -40))
    arrow(d, (450, 110), (520, 110), RED, 3); text(d, (485, 85), '1 А', 26, RED)
    wire(d, [(200, 300), (300, 300), (300, 220), (500, 220), (500, 300), (600, 300)])
    wire(d, [(300, 300), (300, 380), (500, 380), (500, 300)])
    lamp(d, 400, 220, 26, 'Ч1', (55, -22)); lamp(d, 400, 380, 26, 'Ч2', (55, 24))
    node(d, 300, 300); node(d, 500, 300)
    return img


@fig('physics-9-abc-18v')
def abc_18v():
    img, d = canvas()
    wire(d, [(120, 380), (120, 140), (680, 140), (680, 380)])
    battery(d, 400, 140, '18 В', (0, -44))
    wire(d, [(120, 380), (420, 380)])
    resistor(d, 250, 380, 110, 34, 'A', (0, 0)); text(d, (250, 425), '2 Ом', 24)
    arrow(d, (290, 340), (220, 340), RED, 3); text(d, (255, 315), '3 А', 24, RED)
    wire(d, [(420, 300), (420, 460)]); wire(d, [(680, 300), (680, 460)])
    wire(d, [(420, 300), (680, 300)]); wire(d, [(420, 460), (680, 460)])
    resistor(d, 550, 300, 110, 34, 'B', (0, 0)); resistor(d, 550, 460, 110, 34, 'C', (0, 0))
    arrow(d, (590, 265), (520, 265), RED, 3); text(d, (555, 240), '2 А', 24, RED)
    node(d, 420, 380); node(d, 680, 380)
    return img


@fig('physics-9-lamp-12v')
def lamp_12v():
    img, d = canvas()
    loop(d, 200, 180, 600, 420)
    battery(d, 400, 180, '12 В', (0, -48))
    lamp(d, 400, 420, 30)
    arrow(d, (200, 260), (200, 340), RED, 3); text(d, (185, 300), '0.50 А', 26, RED, 'rm')
    return img


@fig('physics-9-slider')
def slider():
    img, d = canvas()
    terminal(d, 150, 160); terminal(d, 250, 160); text(d, (200, 125), '12.0 В', 26)
    wire(d, [(257, 160), (650, 160), (650, 400)])
    lamp(d, 450, 160, 30)
    wire(d, [(143, 160), (100, 160), (100, 300), (300, 300)])
    arrow(d, (300, 300), (300, 392), INK, 3); text(d, (325, 340), 'C', 28)
    d.line([300, 400, 520, 400], fill=(120, 80, 60), width=6)
    node(d, 300, 400); node(d, 520, 400)
    text(d, (300, 435), 'A', 28); text(d, (520, 435), 'B', 28)
    resistor(d, 590, 400, 90, 30, 'R', (0, -40)); text(d, (590, 445), '4.0 Ом', 24)
    wire(d, [(520, 400), (545, 400)]); wire(d, [(635, 400), (650, 400)])
    return img


@fig('physics-9-two-lamps-par')
def two_lamps_par():
    img, d = canvas()
    wire(d, [(160, 300), (160, 160), (640, 160), (640, 300)])
    battery(d, 400, 160)
    wire(d, [(160, 300), (640, 300)]); wire(d, [(160, 300), (160, 440), (640, 440), (640, 300)])
    lamp(d, 400, 300, 28, 'Ч1', (60, -20)); lamp(d, 400, 440, 28, 'Ч2', (60, -20))
    node(d, 160, 300); node(d, 640, 300)
    return img


@fig('physics-9-household')
def household():
    img, d = canvas()
    wire(d, [(120, 160), (700, 160)]); wire(d, [(120, 440), (700, 440)])
    terminal(d, 120, 160); terminal(d, 120, 440); text(d, (100, 300), '220 В ~', 26, anchor='rm')
    for x, lab, val in ((260, 'Сэнс', '1.2 кВт'), (420, 'Хөргөгч', '200 Вт')):
        wire(d, [(x, 160), (x, 440)])
        d.rectangle([x - 55, 270, x + 55, 330], fill='white', outline=INK, width=3)
        text(d, (x, 300), lab, 22); text(d, (x, 365), val, 22)
        node(d, x, 160); node(d, x, 440)
    for x in (570, 680):
        wire(d, [(x, 160), (x, 440)])
        lamp(d, x, 300, 26); text(d, (x, 360), '60 Вт', 22)
    node(d, 570, 160); node(d, 570, 440)
    return img


@fig('physics-9-lens-image')
def lens_image():
    img, d = canvas()
    y = 300
    d.line([80, y, 720, y], fill=INK, width=2)
    arrow(d, (160, y), (160, y - 140), BLUE, 5, 20); text(d, (185, y - 140), 'O', 30, anchor='lm')
    arrow(d, (640, y), (640, y + 110), RED, 5, 20); text(d, (665, y + 110), 'O₁', 30, anchor='lm')
    dim(d, (160, y + 190), (640, y + 190), 'd', 30, (0, 26))
    dashed(d, (160, y), (160, y + 200), GREY); dashed(d, (640, y + 110), (640, y + 200), GREY)
    return img


# ── Физик 10 ────────────────────────────────────────────────────────────────

@fig('physics-10-two-blocks')
def two_blocks():
    img, d = canvas()
    y = 330
    d.rectangle([80, y, 720, y + 18], fill=GREY)
    d.rectangle([250, y - 90, 370, y], fill=(200, 110, 210), outline=INK, width=2); text(d, (310, y - 45), 'm₁', 32)
    d.rectangle([440, y - 90, 560, y], fill=(245, 180, 60), outline=INK, width=2); text(d, (500, y - 45), 'm₂', 32)
    d.line([370, y - 45, 440, y - 45], fill=INK, width=3)
    arrow(d, (250, y - 45), (110, y - 45), BLUE, 5, 20); text(d, (130, y - 80), 'F₁', 30)
    arrow(d, (560, y - 45), (700, y - 45), BLUE, 5, 20); text(d, (680, y - 80), 'F₂', 30)
    return img


@fig('physics-10-table-pulley')
def table_pulley():
    img, d = canvas()
    d.rectangle([120, 260, 520, 520], fill=GREY, outline=INK, width=2)
    d.rectangle([220, 170, 360, 260], fill=(200, 110, 210), outline=INK, width=2); text(d, (290, 215), 'm₁', 32)
    ball(d, 545, 240, 26, (120, 200, 90)); d.ellipse([539, 234, 551, 246], fill=INK)
    d.line([360, 215, 545, 215], fill=INK, width=3); d.line([571, 240, 571, 360], fill=INK, width=3)
    d.rectangle([521, 360, 621, 450], fill=(245, 180, 60), outline=INK, width=2); text(d, (571, 405), 'm₂', 32)
    return img


@fig('physics-10-wave-abcd')
def wave_abcd():
    img, d = canvas()
    x0, y0, lam, amp = 100, 320, 280, 100
    d.line([x0, y0 - 180, x0, y0 + 180], fill=INK, width=2); d.line([x0, y0, 760, y0], fill=INK, width=2)
    pts = [(x0 + t, y0 - amp * math.sin(2 * math.pi * t / lam)) for t in range(0, 600)]
    d.line(pts, fill=INK, width=5)
    c1, c2 = x0 + lam / 4, x0 + 5 * lam / 4
    dim(d, (c1, y0 - amp - 50), (c2, y0 - amp - 50), 'A', 32, (0, -24))
    tr = x0 + 3 * lam / 4
    dim(d, (tr - 30, y0), (tr - 30, y0 + amp), 'B', 30, (-26, 0))
    dim(d, (c2, y0 - amp), (c2, y0 + amp), 'C', 30, (26, 0))
    dim(d, (x0 + 1.75 * lam, y0 - 60), (x0 + 2.12 * lam, y0 - 60), 'D', 30, (0, -24))
    return img


@fig('physics-10-scopes')
def scopes():
    img, d = canvas()
    for i, (lab, n, a) in enumerate((('A', 3, 45), ('B', 3, 90), ('C', 5, 45))):
        x0 = 30 + i * 255
        d.rounded_rectangle([x0, 170, x0 + 230, 430], 22, fill='white', outline=INK, width=4)
        for k in range(1, 6):
            d.line([x0 + k * 38, 175, x0 + k * 38, 425], fill=GRID, width=1)
        for k in range(1, 6):
            d.line([x0 + 5, 170 + k * 43, x0 + 225, 170 + k * 43], fill=GRID, width=1)
        d.line([(x0 + 15 + t, 300 - a * math.sin(2 * math.pi * n * t / 200)) for t in range(201)], fill=INK, width=3)
        text(d, (x0 + 20, 140), lab + '.', 32, anchor='lm')
    return img


def grid_wave(lam_cells, amp_cells, phase, arrow_x):
    img, d = canvas()
    c = 40
    x0, x1, y0, y1 = 40, 760, 170, 450
    d.rectangle([x0, y0, x1, y1], fill=(235, 248, 240))
    for x in range(x0, x1 + 1, c):
        d.line([x, y0, x, y1], fill=GRID, width=1)
    for y in range(y0, y1 + 1, c):
        d.line([x0, y, x1, y], fill=GRID, width=1)
    mid = (y0 + y1) / 2
    lam = lam_cells * c
    pts = [(x, mid - amp_cells * c * math.cos(2 * math.pi * (x - x0 - phase * c) / lam)) for x in range(x0, x1 + 1)]
    d.polygon(pts + [(x1, y1), (x0, y1)], fill=(160, 220, 180))
    d.line(pts, fill=(40, 140, 100), width=4)
    fx = x0 + 6 * c
    d.line([fx, y0 - 40, fx, y1], fill=INK, width=3)
    d.polygon([(fx, y0 - 40), (fx + 50, y0 - 30), (fx, y0 - 15)], fill=YELLOW, outline=INK)
    arrow(d, (arrow_x, y0 + 15), (arrow_x + 100, y0 + 15), INK, 3)
    dim(d, (arrow_x + 2 * c, y1 - 25), (arrow_x + 4 * c, y1 - 25), '1 м', 24, (0, 22))
    return img


@fig('physics-10-wave-a')
def wave_a():
    return grid_wave(4, 1.4, 1, 480)


@fig('physics-10-wave-b')
def wave_b():
    return grid_wave(8, 1.0, 2, 480)


@fig('physics-10-lead')
def lead():
    img, d = canvas()
    g = Graph(d, (130, 90, 680, 470), (0, 45), (0, 2000), 10, 2000, 't, мин', 't, °C', grid=False, fmt=lambda v: f'{v:g}' if v else '0')
    pts = [(10, 327), (20, 327), (30, 1740), (40, 1740), (43, 1900)]
    g.line([(0, 150), (10, 327)], GREY, 3)
    g.line(pts[:2], (40, 180, 200), 6); dashed(d, g.p(20, 327), g.p(30, 1740), INK, 3); g.line(pts[2:4], (40, 180, 200), 6)
    dashed(d, g.p(40, 1740), g.p(43, 1900), INK, 3)
    for x, y, n in ((10, 327, 'A'), (20, 327, 'B'), (30, 1740, 'C'), (40, 1740, 'D')):
        text(d, (g.px(x), g.py(y) - 26), n, 28)
        g.guide(x, y)
    for y in (327, 1740):
        text(d, (g.x0 - 12, g.py(y)), str(y), 24, anchor='rm')
    return img


@fig('physics-10-cooling')
def cooling():
    img, d = canvas()
    g = Graph(d, (140, 90, 700, 480), (0, 8), (0, 100), 1, 10, 'Хугацаа, мин', 't, °C', minor=(0.5, 5))
    g.line([(0, 90), (2, 60), (4, 40), (5, 35), (6, 35), (7, 35)], RED, 4, dots=True)
    g.line([(0, 10), (2, 22), (4, 30), (5, 35)], BLUE, 4, dots=True)
    text(d, (g.px(0.6), g.py(92)), 'Халуун ус', 22, RED, 'lm'); text(d, (g.px(0.4), g.py(4)), 'Сав', 22, BLUE, 'lm')
    return img


@fig('physics-10-series-r')
def series_r():
    img, d = canvas()
    y = 300
    terminal(d, 100, y); terminal(d, 700, y); text(d, (100, y - 40), 'A', 30); text(d, (700, y - 40), 'B', 30)
    wire(d, [(107, y), (693, y)])
    for x, lab in ((250, '2 Ω'), (400, '4 Ω'), (550, 'R')):
        resistor(d, x, y, 100, 34, lab, (0, -44))
    arrow(d, (430, y + 50), (520, y + 50), RED, 3); text(d, (540, y + 50), 'I = 0.5 А', 26, RED, 'lm')
    return img


@fig('physics-10-series-kohm')
def series_kohm():
    img, d = canvas()
    y = 300
    terminal(d, 100, y); terminal(d, 700, y); text(d, (100, y - 40), 'A', 30); text(d, (700, y - 40), 'B', 30)
    wire(d, [(107, y), (693, y)])
    for x, lab in ((250, '100'), (400, '500'), (550, '500')):
        resistor(d, x, y, 100, 34, lab, (0, -44))
    text(d, (400, y + 80), 'Эсэргүүцэл кОм-оор', 24)
    return img


@fig('physics-10-lamp-iv')
def lamp_iv():
    img, d = canvas()
    g = Graph(d, (130, 90, 710, 480), (0, 1000), (0, 25), 100, 5, 'Хүчдэл, мВ', 'Гүйдэл, мА', minor=(50, 1))
    f = lambda u: 25 * (1 - math.exp(-u / 330)) ** 0.85 * 1.07 if u else 0
    pts = [(20, 2), (40, 3.5), (60, 5), (90, 7), (110, 8.4), (180, 11.8), (220, 13), (440, 17.8), (600, 20), (860, 23.2), (960, 24.5)]
    g.line(pts, BLUE, 4, dots=True)
    return img


@fig('physics-10-isobars')
def isobars():
    img, d = canvas()
    o = (140, 480)
    arrow(d, o, (720, 480), INK, 3); arrow(d, o, (140, 70), INK, 3)
    text(d, (720, 510), 'T', 30, anchor='rm'); text(d, (165, 80), 'V', 30, anchor='lm')
    for k, n in ((0.3, 'P₁'), (0.6, 'P₂'), (1.1, 'P₃')):
        ex = min(680, o[0] + 380 / k)
        ey = o[1] - k * (ex - o[0])
        d.line([*o, ex, ey], fill=INK, width=4)
        text(d, (ex + 12, ey - 10), n, 30, anchor='lm')
    return img


@fig('physics-10-two-bodies')
def two_bodies():
    img, d = canvas()
    g = Graph(d, (140, 90, 680, 470), (0, 8), (0, 6), 1, 1, 'Q', 't', fmt=lambda v: '')
    g.line([(0, 1), (1, 4), (3, 4), (6, 6)], BLUE, 5)
    g.line([(0, 1), (1.5, 2.2), (3.5, 2.2), (8, 4.2)], GREEN, 5)
    text(d, (g.px(6.1), g.py(6.2)), '1', 30, BLUE); text(d, (g.px(8.0) + 20, g.py(4.3)), '2', 30, GREEN)
    text(d, (g.x0 - 12, g.y1 + 22), '0', 24, anchor='rm')
    return img


# ── Физик 11 ────────────────────────────────────────────────────────────────

@fig('physics-11-xt-sine')
def xt_sine():
    img, d = canvas()
    g = Graph(d, (140, 100, 720, 480), (0, 0.9), (-0.2, 0.2), 0.1, 0.05, 'хугацаа, с', 'шилжилт, м', size=20,
              fmt=lambda v: f'{v:.2f}'.rstrip('0').rstrip('.') if abs(v) > 1e-9 else '0')
    f = lambda t: 0.2 * math.sin(2 * math.pi * t / 0.4)
    g.curve(f, 0, 0.9, (40, 180, 200), 4)
    for t, n, off in ((0.24, 'A', (-22, 10)), (0.3, 'B', (26, 10)), (0.4, 'C', (0, -26))):
        ball(d, *g.p(t, f(t)), 6, INK, INK)
        text(d, (g.px(t) + off[0], g.py(f(t)) + off[1]), n, 26)
    return img


@fig('physics-11-two-waves')
def two_waves():
    img, d = canvas()
    g = Graph(d, (120, 90, 720, 480), (0, 38), (-6, 6), 5, 2, 'координат', 'шилжилт')
    g.curve(lambda x: 4 * math.cos(2 * math.pi * x / 15), 0, 38, BLUE, 4)
    g.curve(lambda x: 2 * math.sin(2 * math.pi * x / 20), 0, 38, ORANGE, 4)
    text(d, (g.px(16), g.py(4.8)), 'a', 30, BLUE); text(d, (g.px(25), g.py(2.9)), 'b', 30, ORANGE)
    return img


@fig('physics-11-vt-cos')
def vt_cos():
    img, d = canvas()
    g = Graph(d, (140, 90, 700, 490), (0, 1.4), (-0.4, 0.4), 0.2, 0.1, 't, с', 'v, м/с', size=20,
              fmt=lambda v: f'{v:.1f}' if abs(v) > 1e-9 else '0')
    g.curve(lambda t: 0.36 * math.cos(2 * math.pi * t / 1.28), 0, 1.4, (40, 180, 200), 4)
    return img


@fig('physics-11-charges')
def charges():
    img, d = canvas()
    c, x0, y0 = 110, 180, 60
    for i in range(5):
        d.line([x0 + i * c, y0, x0 + i * c, y0 + 4 * c], fill=GRID, width=2)
        d.line([x0, y0 + i * c, x0 + 4 * c, y0 + i * c], fill=GRID, width=2)
    Q = (x0 + 2 * c, y0 + 2 * c)
    ball(d, *Q, 26, RED, INK, '+', 34, 'white'); text(d, (Q[0] - 10, Q[1] - 50), '+Q', 28)
    pos = {'A': (1, 0), 'B': (0, 1), 'C': (-2, 0), 'D': (2, 0), 'E': (2, -2)}
    for n, (i, j) in pos.items():
        x, y = Q[0] + i * c, Q[1] + j * c
        ball(d, x, y, 9, INK, INK)
        text(d, (x + 24, y + 24), n, 28)
    ball(d, Q[0] + c, Q[1], 13, RED, INK); text(d, (Q[0] + c + 18, Q[1] - 26), '+q', 26)
    dim(d, (x0, y0 + 4 * c + 30), (x0 + c, y0 + 4 * c + 30), 'R', 26, (0, 22))
    return img


@fig('physics-11-electron')
def electron():
    img, d = canvas()
    d.rectangle([180, 80, 620, 520], fill=(240, 242, 246), outline=INK, width=2)
    cx, cy, r = 400, 320, 160
    for k in range(0, 360, 12):
        a1, a2 = math.radians(k), math.radians(k + 7)
        d.line([cx + r * math.cos(a1), cy + r * math.sin(a1), cx + r * math.cos(a2), cy + r * math.sin(a2)], fill=INK, width=3)
    ex, ey = cx + r * math.cos(math.radians(225)), cy + r * math.sin(math.radians(225))
    ball(d, ex, ey, 16, (70, 200, 220), INK, '−', 28)
    text(d, (ex - 30, ey - 10), 'e', 28, anchor='rm')
    arrow(d, (ex, ey), (ex + 110, ey - 110), INK, 4, 18); text(d, (ex + 125, ey - 125), 'v', 30)
    text(d, (560, 120), '⊗ B', 30)
    return img


@fig('physics-11-cube')
def cube():
    img, d = canvas()
    s, o, dx, dy = 230, (220, 470), 130, -110
    f = [(o[0], o[1]), (o[0] + s, o[1]), (o[0] + s, o[1] - s), (o[0], o[1] - s)]
    b = [(x + dx, y + dy) for x, y in f]
    for p, q in list(zip(f, f[1:] + f[:1])) + list(zip(b, b[1:] + b[:1])) + list(zip(f, b)):
        d.line([*p, *q], fill=(140, 30, 40), width=5)
    for p in f + b:
        ball(d, *p, 10, (140, 30, 40), (140, 30, 40))
    text(d, (f[0][0] - 28, f[0][1] + 10), 'A', 32); text(d, (b[2][0] + 28, b[2][1] - 10), 'B', 32)
    return img


@fig('physics-11-throws')
def throws():
    img, d = canvas()
    gy, x0, y0 = 520, 200, 200
    d.rectangle([60, gy, 760, gy + 12], fill=GREY)
    dim(d, (140, y0), (140, gy), 'h', 30, (-26, 0))
    ball(d, x0, y0, 10, INK, INK)
    for a in (90, 45, 0, -45, -90):
        r = math.radians(a)
        arrow(d, (x0, y0), (x0 + 75 * math.cos(r), y0 - 75 * math.sin(r)), BLUE, 3, 14)
        text(d, (x0 + 100 * math.cos(r), y0 - 100 * math.sin(r)), 'v₀', 22, BLUE)
    pts = []
    for i in range(80):
        t = i * 0.05
        x, y = x0 + 120 * t, y0 - (150 * t - 60 * t * t)
        if y > gy:
            break
        pts.append((x, y))
    d.line(pts, fill=PINK, width=3)
    return img


@fig('physics-11-three-paths')
def three_paths():
    img, d = canvas()
    A, B = (200, 120), (600, 480)
    d.line([*A, *B], fill=INK, width=4)
    for bend, n, lp in ((-0.35, '1', (300, 400)), (0.35, '3', (520, 210))):
        pts = []
        for i in range(41):
            t = i / 40
            x = A[0] + (B[0] - A[0]) * t + bend * 360 * math.sin(math.pi * t) * -0.6
            y = A[1] + (B[1] - A[1]) * t + bend * 360 * math.sin(math.pi * t) * 0.6
            pts.append((x, y))
        d.line(pts, fill=(60, 190, 200), width=4)
        text(d, lp, n, 30)
    text(d, (420, 290), '2', 30)
    text(d, (A[0] - 20, A[1] - 20), 'A', 32); text(d, (B[0] + 22, B[1] + 10), 'B', 32)
    return img


@fig('physics-11-pendulum')
def pendulum():
    img, d = canvas()
    O, l = (300, 150), 300
    d.line([O[0] - 40, O[1], O[0] + 20, O[1]], fill=INK, width=6)
    d.line([*O, O[0] + l, O[1]], fill=INK, width=3); text(d, (O[0] + l / 2, O[1] - 26), 'l', 30)
    dashed(d, O, (O[0], O[1] + l), GREY); text(d, (O[0] - 24, O[1] + l / 2), 'l', 30)
    d.arc([O[0] - l, O[1] - l, O[0] + l, O[1] + l], 0, 90, fill=INK, width=4)
    ball(d, O[0] + l, O[1], 16, (230, 210, 150)); text(d, (O[0] + l + 28, O[1] + 26), 'A', 30); text(d, (O[0] + l + 26, O[1] - 26), 'm', 28)
    ball(d, O[0], O[1] + l, 16, (230, 230, 230)); text(d, (O[0] + 26, O[1] + l + 30), 'B', 30)
    arrow(d, (O[0] - 20, O[1] + l), (O[0] - 110, O[1] + l), INK, 3); text(d, (O[0] - 130, O[1] + l), 'v', 28, anchor='rm')
    return img


if __name__ == '__main__':
    OUT.mkdir(parents=True, exist_ok=True)
    only = sys.argv[1:]
    for name, draw in FIG.items():
        if only and not any(name.startswith(o) for o in only):
            continue
        save(draw(), OUT / f'{name}.png')
    print(len(FIG), 'зураг')
