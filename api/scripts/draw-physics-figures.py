"""Физик 7-ийн зурагтай асуултын зургууд (өөрсдөө зурсан, номын скан биш): python3 scripts/draw-physics-figures.py
→ seed/images/physics-7-*.png (seed/physics-image-questions.json эдгээрийг заана)."""
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

OUT = Path(__file__).resolve().parent.parent / 'seed' / 'images'
FONT = '/System/Library/Fonts/Supplemental/Arial.ttf'
W, H = 800, 600
INK, BLUE, WOOD, WATER = (34, 34, 48), (70, 110, 220), (240, 200, 120), (150, 200, 245)


def font(size):
    return ImageFont.truetype(FONT, size)


def canvas():
    img = Image.new('RGB', (W, H), 'white')
    return img, ImageDraw.Draw(img)


def ruler():
    img, d = canvas()
    x0, mm, y = 60, 9, 330  # 0 см-ийн байрлал, 1 мм = 9 px
    d.rectangle([x0 - 20, y, x0 + 75 * mm, y + 110], fill=(250, 235, 180), outline=INK, width=3)
    for i in range(0, 76):
        h = 50 if i % 10 == 0 else 32 if i % 5 == 0 else 20
        d.line([x0 + i * mm, y, x0 + i * mm, y + h], fill=INK, width=2)
        if i % 10 == 0:
            d.text((x0 + i * mm, y + 75), str(i // 10), font=font(28), fill=INK, anchor='mm')
    d.text((x0 + 75 * mm - 10, y + 95), 'см', font=font(22), fill=INK, anchor='rm')
    # Харандаа 2.0 см-ээс 7.5 см хүртэл
    left, right = x0 + 20 * mm, x0 + 20 * mm + 55 * mm
    d.rectangle([left, 250, right - 50, 310], fill=(255, 190, 60), outline=INK, width=3)
    d.polygon([(right - 50, 250), (right, 280), (right - 50, 310)], fill=WOOD, outline=INK)
    d.polygon([(right - 14, 273), (right, 280), (right - 14, 287)], fill=INK)
    d.rectangle([left - 30, 250, left, 310], fill=(240, 140, 160), outline=INK, width=3)
    for x in (left, right):
        d.line([x, 240, x, y], fill=BLUE, width=2)
    return img


def caliper():
    img, d = canvas()
    x0, mm, y = 40, 22, 260  # үндсэн хуваарийн 0, 1 мм = 22 px
    reading = 21.4
    d.rectangle([20, y - 70, W - 20, y], fill=(225, 228, 235), outline=INK, width=3)
    first = 18
    for i in range(first, first + 31):
        x = x0 + (i - first) * mm
        h = 40 if i % 10 == 0 else 28 if i % 5 == 0 else 18
        d.line([x, y - h, x, y], fill=INK, width=2)
        if i % 10 == 0:
            d.text((x, y - 55), str(i // 10), font=font(26), fill=INK, anchor='mm')
    d.text((W - 30, y - 55), 'см', font=font(22), fill=INK, anchor='rm')
    vz = x0 + (reading - first) * mm  # нониусын 0
    d.rectangle([vz - 40, y, vz + 9 * mm + 40, y + 90], fill=(200, 215, 240), outline=INK, width=3)
    for k in range(11):
        x = vz + k * 0.9 * mm
        h = 34 if k % 5 == 0 else 22
        d.line([x, y, x, y + h], fill=INK, width=2)
        if k % 5 == 0:
            d.text((x, y + 55), str(k), font=font(24), fill=INK, anchor='mm')
    d.text((W / 2, 70), 'Штангенциркуль (нониусын нарийвчлал 0.1 мм)', font=font(28), fill=INK, anchor='mm')
    return img


def clock(d, cx, cy, r, hour, minute, label):
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill='white', outline=INK, width=5)
    for i in range(60):
        a = math.radians(i * 6 - 90)
        inner = r - (22 if i % 5 == 0 else 10)
        d.line([cx + inner * math.cos(a), cy + inner * math.sin(a), cx + (r - 4) * math.cos(a), cy + (r - 4) * math.sin(a)],
               fill=INK, width=4 if i % 5 == 0 else 2)
    for h in range(1, 13):
        a = math.radians(h * 30 - 90)
        d.text((cx + (r - 45) * math.cos(a), cy + (r - 45) * math.sin(a)), str(h), font=font(26), fill=INK, anchor='mm')
    for angle, length, width, color in (((hour % 12 + minute / 60) * 30, r * 0.5, 9, INK), (minute * 6, r * 0.78, 5, BLUE)):
        a = math.radians(angle - 90)
        d.line([cx, cy, cx + length * math.cos(a), cy + length * math.sin(a)], fill=color, width=width)
    d.ellipse([cx - 8, cy - 8, cx + 8, cy + 8], fill=INK)
    d.text((cx, cy + r + 40), label, font=font(30), fill=INK, anchor='mm')


def clocks():
    img, d = canvas()
    clock(d, 210, 270, 170, 10, 15, 'Эхэлсэн')
    clock(d, 590, 270, 170, 10, 50, 'Дууссан')
    return img


def cylinder(d, cx, level, top=100, bottom=520, maxml=100, rock=False):
    w = 110
    px = (bottom - top - 20) / maxml  # 1 мл
    base = bottom - 10
    d.rectangle([cx - w / 2, base - level * px, cx + w / 2, base], fill=WATER)
    if rock:
        d.polygon([(cx - 30, base), (cx - 38, base - 30), (cx - 10, base - 52), (cx + 28, base - 40), (cx + 35, base)], fill=(130, 120, 110), outline=INK)
    d.line([cx - w / 2, top, cx - w / 2, bottom], fill=INK, width=4)
    d.line([cx + w / 2, top, cx + w / 2, bottom], fill=INK, width=4)
    d.line([cx - w / 2 - 25, bottom, cx + w / 2 + 25, bottom], fill=INK, width=6)
    for ml in range(0, maxml + 1, 2):
        y = base - ml * px
        long = ml % 10 == 0
        d.line([cx - w / 2, y, cx - w / 2 + (34 if long else 18), y], fill=INK, width=3 if long else 2)
        if long and ml:
            d.text((cx - w / 2 - 12, y), str(ml), font=font(22), fill=INK, anchor='rm')
    d.text((cx + w / 2 + 10, top + 10), 'мл', font=font(22), fill=INK, anchor='lm')


def cylinder_one():
    img, d = canvas()
    cylinder(d, 400, 36)
    return img


def cylinder_rock():
    img, d = canvas()
    cylinder(d, 230, 50)
    cylinder(d, 570, 65, rock=True)
    d.text((230, 565), 'Чулуугүй', font=font(28), fill=INK, anchor='mm')
    d.text((570, 565), 'Чулуутай', font=font(28), fill=INK, anchor='mm')
    return img


if __name__ == '__main__':
    OUT.mkdir(parents=True, exist_ok=True)
    for name, draw in {'ruler': ruler, 'caliper': caliper, 'clocks': clocks, 'cylinder': cylinder_one, 'cylinder-rock': cylinder_rock}.items():
        path = OUT / f'physics-7-{name}.png'
        draw().convert('P', palette=Image.ADAPTIVE, colors=64).save(path, optimize=True)
        print(path.name, path.stat().st_size, 'bytes')
