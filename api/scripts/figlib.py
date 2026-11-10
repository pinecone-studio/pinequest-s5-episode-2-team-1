"""Асуултын зургийг өөрсдөө зурах туслах (номын скан биш): 800×600 цагаан дэвсгэр, ижил өнгө, фонт."""
import math

from PIL import Image, ImageDraw, ImageFont

FONT = '/System/Library/Fonts/Supplemental/Arial Unicode.ttf'  # ₁ ₂ σ π ⊗ тэмдэгтэй
W, H = 800, 600
INK, BLUE, RED, GREEN = (34, 34, 48), (70, 110, 220), (220, 60, 60), (60, 160, 90)
WATER, GRID, WOOD, GREY = (150, 200, 245), (215, 220, 230), (240, 200, 120), (160, 160, 170)
ORANGE, PINK, YELLOW = (240, 150, 50), (230, 80, 200), (245, 210, 60)


def font(size):
    return ImageFont.truetype(FONT, size)


def canvas():
    img = Image.new('RGB', (W, H), 'white')
    return img, ImageDraw.Draw(img)


def save(img, path):
    img.convert('P', palette=Image.ADAPTIVE, colors=64).save(path, optimize=True)


def text(d, xy, s, size=26, fill=INK, anchor='mm'):
    d.text(xy, s, font=font(size), fill=fill, anchor=anchor)


def arrow(d, a, b, fill=INK, width=3, head=14):
    """a → b сум."""
    (x1, y1), (x2, y2) = a, b
    ang = math.atan2(y2 - y1, x2 - x1)
    bx, by = x2 - head * 0.8 * math.cos(ang), y2 - head * 0.8 * math.sin(ang)
    d.line([x1, y1, bx, by], fill=fill, width=width)
    d.polygon([(x2, y2),
               (x2 - head * math.cos(ang - 0.4), y2 - head * math.sin(ang - 0.4)),
               (x2 - head * math.cos(ang + 0.4), y2 - head * math.sin(ang + 0.4))], fill=fill)


def dim(d, a, b, label, size=24, off=(0, -18), fill=INK):
    """Хоёр талдаа сумтай хэмжээсийн шугам."""
    arrow(d, ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2), a, fill, 2, 12)
    arrow(d, ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2), b, fill, 2, 12)
    text(d, ((a[0] + b[0]) / 2 + off[0], (a[1] + b[1]) / 2 + off[1]), label, size, fill)


def dashed(d, a, b, fill=INK, width=2, dash=10, gap=8):
    (x1, y1), (x2, y2) = a, b
    n = math.hypot(x2 - x1, y2 - y1)
    if not n:
        return
    ux, uy = (x2 - x1) / n, (y2 - y1) / n
    t = 0.0
    while t < n:
        e = min(t + dash, n)
        d.line([x1 + ux * t, y1 + uy * t, x1 + ux * e, y1 + uy * e], fill=fill, width=width)
        t += dash + gap


class Graph:
    """Тэнхлэг, тор, хуваарьтай график. Утгыг пиксел болгоно."""

    def __init__(self, d, box, xr, yr, xstep, ystep, xlabel='', ylabel='', grid=True, minor=None, size=22, fmt=None):
        self.d, (self.x0, self.y0, self.x1, self.y1) = d, box  # box: зүүн, дээд, баруун, доод
        self.xr, self.yr = xr, yr
        fmt = fmt or (lambda v: f'{v:g}')
        if minor:
            mx, my = minor
            v = xr[0]
            while v <= xr[1] + 1e-9:
                d.line([self.px(v), self.y0, self.px(v), self.y1], fill=(235, 238, 244), width=1)
                v += mx
            v = yr[0]
            while v <= yr[1] + 1e-9:
                d.line([self.x0, self.py(v), self.x1, self.py(v)], fill=(235, 238, 244), width=1)
                v += my
        v = xr[0]
        while v <= xr[1] + 1e-9:
            if grid:
                d.line([self.px(v), self.y0, self.px(v), self.y1], fill=GRID, width=1)
            d.line([self.px(v), self.y1, self.px(v), self.y1 + 7], fill=INK, width=2)
            text(d, (self.px(v), self.y1 + 22), fmt(v), size)
            v += xstep
        v = yr[0]
        while v <= yr[1] + 1e-9:
            if grid:
                d.line([self.x0, self.py(v), self.x1, self.py(v)], fill=GRID, width=1)
            d.line([self.x0 - 7, self.py(v), self.x0, self.py(v)], fill=INK, width=2)
            text(d, (self.x0 - 12, self.py(v)), fmt(v), size, anchor='rm')
            v += ystep
        zx = self.py(0) if yr[0] < 0 < yr[1] else self.y1
        arrow(d, (self.x0, zx), (self.x1 + 25, zx), INK, 3)
        arrow(d, (self.x0, self.y1 + 5), (self.x0, self.y0 - 25), INK, 3)
        text(d, (self.x1 + 25, zx + 52), xlabel, size + 2, anchor='rm')
        text(d, (self.x0 + 10, self.y0 - 30), ylabel, size + 2, anchor='lm')

    def px(self, x):
        return self.x0 + (x - self.xr[0]) / (self.xr[1] - self.xr[0]) * (self.x1 - self.x0)

    def py(self, y):
        return self.y1 - (y - self.yr[0]) / (self.yr[1] - self.yr[0]) * (self.y1 - self.y0)

    def p(self, x, y):
        return self.px(x), self.py(y)

    def line(self, pts, fill=BLUE, width=4, dots=False):
        xy = [self.p(x, y) for x, y in pts]
        self.d.line(xy, fill=fill, width=width, joint='curve')
        if dots:
            for x, y in xy:
                self.d.ellipse([x - 6, y - 6, x + 6, y + 6], fill=fill)

    def curve(self, f, a, b, fill=BLUE, width=4, n=200):
        self.line([(a + (b - a) * i / n, f(a + (b - a) * i / n)) for i in range(n + 1)], fill, width)

    def guide(self, x, y, fill=GREY):
        dashed(self.d, self.p(x, self.yr[0] if self.yr[0] >= 0 else 0), self.p(x, y), fill)
        dashed(self.d, self.p(self.xr[0], y), self.p(x, y), fill)


# ── Цахилгаан хэлхээний тэмдэг ──────────────────────────────────────────────

def wire(d, pts, width=3):
    d.line(pts, fill=INK, width=width, joint='curve')


def node(d, x, y):
    d.ellipse([x - 6, y - 6, x + 6, y + 6], fill=INK)


def lamp(d, x, y, r=18, label=None, lpos=(0, -34), vertical=False):
    d.ellipse([x - r, y - r, x + r, y + r], fill='white', outline=INK, width=3)
    k = r * 0.7
    d.line([x - k, y - k, x + k, y + k], fill=INK, width=3)
    d.line([x - k, y + k, x + k, y - k], fill=INK, width=3)
    if label:
        text(d, (x + lpos[0], y + lpos[1]), label, 24)


def resistor(d, x, y, w=70, h=24, label=None, lpos=(0, -30), vertical=False):
    if vertical:
        d.rectangle([x - h / 2, y - w / 2, x + h / 2, y + w / 2], fill='white', outline=INK, width=3)
    else:
        d.rectangle([x - w / 2, y - h / 2, x + w / 2, y + h / 2], fill='white', outline=INK, width=3)
    if label:
        text(d, (x + lpos[0], y + lpos[1]), label, 24)


def battery(d, x, y, label=None, lpos=(0, -40), cells=1, vertical=False):
    """Хэвтээ утсан дээрх батарей: урт нимгэн (+) ба богино зузаан (−) шугам."""
    for i in range(cells):
        cx = x + (i - (cells - 1) / 2) * 22
        if vertical:
            d.rectangle([x - 26, cx - 12, x + 26, cx + 12], fill='white')
            d.line([x - 24, cx - 6, x + 24, cx - 6], fill=INK, width=3)
            d.line([x - 12, cx + 6, x + 12, cx + 6], fill=INK, width=6)
        else:
            d.rectangle([cx - 12, y - 26, cx + 12, y + 26], fill='white')
            d.line([cx - 6, y - 24, cx - 6, y + 24], fill=INK, width=3)
            d.line([cx + 6, y - 12, cx + 6, y + 12], fill=INK, width=6)
    if label:
        text(d, (x + lpos[0], y + lpos[1]), label, 24)


def meter(d, x, y, letter, r=18):
    d.ellipse([x - r, y - r, x + r, y + r], fill='white', outline=INK, width=3)
    text(d, (x, y), letter, 22)


def terminal(d, x, y, sign=None):
    d.ellipse([x - 7, y - 7, x + 7, y + 7], fill='white', outline=INK, width=3)
    if sign:
        text(d, (x - 22, y), sign, 26)


def beaker(d, x0, y0, x1, y1, level=None, fill=WATER):
    if level is not None:
        d.rectangle([x0 + 3, level, x1 - 3, y1 - 3], fill=fill)
    d.line([(x0 - 8, y0), (x0, y0 + 10), (x0, y1), (x1, y1), (x1, y0)], fill=INK, width=4)


def tube(d, cx, top, bottom, w=44, level=None, fill=WATER):
    """Хуруу шил: доод тал нь дугуй."""
    if level is not None:
        d.rectangle([cx - w / 2 + 3, level, cx + w / 2 - 3, bottom - w / 2], fill=fill)
        d.pieslice([cx - w / 2 + 3, bottom - w + 3, cx + w / 2 - 3, bottom - 3], 0, 180, fill=fill)
    d.line([cx - w / 2, top, cx - w / 2, bottom - w / 2], fill=INK, width=3)
    d.line([cx + w / 2, top, cx + w / 2, bottom - w / 2], fill=INK, width=3)
    d.arc([cx - w / 2, bottom - w, cx + w / 2, bottom], 0, 180, fill=INK, width=3)


def ball(d, x, y, r, fill, outline=INK, label=None, size=24, tcol=INK):
    d.ellipse([x - r, y - r, x + r, y + r], fill=fill, outline=outline, width=2)
    if label:
        text(d, (x, y), label, size, tcol)
