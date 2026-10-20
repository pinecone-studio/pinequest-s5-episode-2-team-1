#!/usr/bin/env python3
"""Charlie маягийн нарийн pixel icon-ууд (v2): 20×20, 1px outline, цагаан дүүргэлт.

Гаралт (../sprites/):
  nav2_{home,tasks,path,shop,crew,bag}_{on,off}.png  — доод цэс (on = өнгөт, off = саарал outline)
  btn_calendar.png, btn_honey.png                     — Нүүрний доод буланд байрлах товчны icon
Ажиллуулах:  python3 icons_v2.py   (Pillow)
"""
from pathlib import Path
from PIL import Image

OUT = Path(__file__).resolve().parent.parent / 'sprites'
N = 20
INK = '#231C38'
OFF_LINE = '#77737F'


def hx(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)) + (255,)


class Icon:
    def __init__(self):
        self.px = {}

    def part(self, cells, role, outline=True):
        cells = set(cells)
        for c in cells:
            self.px[c] = role
        if outline:
            for (x, y) in cells:
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    k = (x + dx, y + dy)
                    if k not in cells and 0 <= k[0] < N and 0 <= k[1] < N:
                        self.px[k] = 'O'

    def render(self, pal, line):
        im = Image.new('RGBA', (N, N), (0, 0, 0, 0))
        for (x, y), role in self.px.items():
            col = line if role == 'O' else pal[role]
            im.putpixel((x, y), hx(col))
        return im


def rect(x0, y0, x1, y1):
    return [(x, y) for y in range(y0, y1 + 1) for x in range(x0, x1 + 1)]


def rows(spec):
    """{y: (x0, x1)} → cells"""
    return [(x, y) for y, (a, b) in spec.items() for x in range(a, b + 1)]


# ---------------------------------------------------------------- icons
def home():
    i = Icon()
    i.part(rows({3: (7, 12), 4: (5, 14), 5: (3, 16), 6: (2, 17)}), 'W')
    i.part(rect(9, 1, 10, 2), 'B')
    i.part(rect(3, 8, 16, 16), 'W')
    i.part([(x, 9) for x in range(3, 17)], 'A', outline=False)
    i.part([(x, 10) for x in range(3, 17) if x % 2 == 0], 'A', outline=False)
    i.part(rect(9, 12, 10, 16), 'B')
    i.part([(8, 4), (11, 4), (6, 5), (13, 5)], 'L', outline=False)
    return i, {'A': ('#3D7BE0', '#E6E4EC'), 'B': ('#F08A3E', '#E6E4EC'), 'W': ('#FFFFFF', '#FFFFFF'), 'L': ('#D9D6E3', '#E6E4EC')}


def tasks():
    i = Icon()
    i.part(rect(3, 3, 16, 18), 'A')
    i.part(rect(5, 5, 14, 17), 'W', outline=False)
    for x in range(5, 15):
        i.px[(x, 4)] = 'A'
    i.part(rect(7, 1, 12, 4), 'C')
    i.part([(8, 2), (9, 2), (10, 2), (11, 2)], 'H', outline=False)
    for y0 in (7, 11):
        i.part([(6, y0 + 1), (7, y0 + 2), (8, y0 + 1), (9, y0)], 'G', outline=False)
        i.part([(x, y0 + 1) for x in range(11, 14)], 'L', outline=False)
    i.part([(6, 14), (7, 14), (8, 14), (6, 15), (8, 15), (6, 16), (7, 16), (8, 16)], 'D', outline=False)
    i.part([(x, 15) for x in range(11, 14)], 'L', outline=False)
    return i, {
        'A': ('#C98A4B', '#E6E4EC'),
        'W': ('#FFFFFF', '#FFFFFF'),
        'C': ('#6E6A7C', '#D3D0DC'),
        'H': ('#A9A5B6', '#E6E4EC'),
        'G': ('#36A05A', '#BDB9C8'),
        'L': ('#BDB9C8', '#DCDAE2'),
        'D': ('#8D899A', '#BDB9C8'),
    }


def path():
    i = Icon()
    i.part(rect(9, 1, 10, 17), 'P')
    i.part(rect(5, 17, 14, 18), 'G')
    i.part(rows({3: (3, 15), 4: (3, 16), 5: (3, 16), 6: (3, 15)}), 'A')
    i.part(rows({9: (4, 16), 10: (3, 16), 11: (3, 16), 12: (4, 16)}), 'A')
    i.part([(5, 4), (6, 4), (12, 5), (13, 5), (7, 11), (8, 11), (13, 10), (14, 10)], 'L', outline=False)
    return i, {'P': ('#8A5A3A', '#FFFFFF'), 'A': ('#E8A65E', '#FFFFFF'), 'G': ('#6BBF59', '#E6E4EC'), 'L': ('#B9773F', '#DCDAE2')}


def shop():
    i = Icon()
    i.part(rows({5: (4, 17), 6: (4, 17), 7: (5, 16), 8: (5, 16), 9: (6, 16), 10: (6, 15), 11: (6, 15)}), 'A')
    for x in (9, 13):
        for y in range(6, 12):
            if (x, y) in i.px and i.px[(x, y)] == 'A':
                i.px[(x, y)] = 'L'
    for x in range(5, 17):
        if i.px.get((x, 8)) == 'A':
            i.px[(x, 8)] = 'L'
    for c in [(1, 3), (2, 3), (3, 3), (3, 4), (4, 5), (6, 13), (7, 13), (8, 13), (9, 13), (10, 13), (11, 13), (12, 13), (13, 13), (14, 13), (15, 13), (16, 13)]:
        i.px[c] = 'O'
    i.part(rect(7, 15, 8, 16), 'D')
    i.part(rect(13, 15, 14, 16), 'D')
    return i, {'A': ('#4F8DEB', '#FFFFFF'), 'L': ('#CFE2FB', '#E6E4EC'), 'D': ('#4A4658', '#BDB9C8')}


def crew():
    i = Icon()
    i.part(rect(4, 2, 5, 17), 'P')
    i.part(rect(4, 1, 5, 1), 'B')
    flag = []
    ends = {3: 16, 4: 16, 5: 16, 6: 15, 7: 14, 8: 15, 9: 16, 10: 16, 11: 16}
    for y, e in ends.items():
        flag += [(x, y) for x in range(6, e + 1)]
    i.part(flag, 'A')
    i.part([(10, 5), (9, 6), (10, 6), (11, 6), (10, 7), (9, 8), (11, 8)], 'B', outline=False)
    i.part(rows({17: (2, 8), 18: (1, 9)}), 'G')
    return i, {'P': ('#A9A5B6', '#FFFFFF'), 'A': ('#7A5CF5', '#FFFFFF'), 'B': ('#F3F66C', '#E6E4EC'), 'G': ('#6BBF59', '#E6E4EC')}


def bag():
    i = Icon()
    for c in [(8, 1), (9, 1), (10, 1), (11, 1), (7, 2), (12, 2), (7, 3), (12, 3)]:
        i.px[c] = 'O'
    body = [c for c in rect(4, 4, 15, 18) if c not in {(4, 4), (15, 4), (4, 18), (15, 18)}]
    i.part(body, 'A')
    flap = [c for c in rect(4, 4, 15, 8) if c not in {(4, 4), (15, 4)}]
    i.part(flap, 'B')
    i.part(rect(6, 12, 13, 16), 'C')
    i.part(rect(9, 8, 10, 10), 'Y')
    return i, {'A': ('#E8A65E', '#FFFFFF'), 'B': ('#6BBF59', '#E6E4EC'), 'C': ('#C98A4B', '#E6E4EC'), 'Y': ('#F3F66C', '#FFFFFF')}


def calendar():
    i = Icon()
    i.part(rect(3, 4, 16, 17), 'W')
    i.part(rect(3, 4, 16, 7), 'A')
    for x in (6, 13):
        for y in range(2, 6):
            i.px[(x, y)] = 'O'
    for y0 in (10, 13):
        for x0 in (5, 8, 11, 14):
            role = 'Y' if (x0, y0) == (11, 13) else 'L'
            i.part(rect(x0, y0, x0 + 1, y0 + 1), role, outline=False)
    i.part(rect(5, 16, 6, 16), 'L', outline=False)
    return i, {'W': ('#FFFFFF', '#FFFFFF'), 'A': ('#EF6B5B', '#E6E4EC'), 'L': ('#D9D6E3', '#E6E4EC'), 'Y': ('#F3C93D', '#E6E4EC')}


def honey():
    i = Icon()
    jar = [c for c in rect(4, 7, 15, 18) if c not in {(4, 18), (15, 18), (4, 7), (15, 7)}]
    i.part(jar, 'A')
    i.part(rect(4, 3, 15, 5), 'C')
    for x in range(4, 16):
        if x % 2 == 0:
            i.px[(x, 3)] = 'W'
        else:
            i.px[(x, 4)] = 'W'
    i.part([(x, 6) for x in range(5, 15)], 'D', outline=False)
    i.part([(6, y) for y in range(9, 15)] + [(7, 9), (7, 10)], 'H', outline=False)
    i.part(rect(9, 11, 13, 14), 'W')
    heart = [(10, 11), (12, 11)] + [(x, 12) for x in range(9, 14)] + [(10, 13), (11, 13), (12, 13), (11, 14)]
    i.part(heart, 'K', outline=False)
    i.part([(8, 7), (8, 8)], 'A', outline=False)
    return i, {
        'A': ('#F2B33D', '#E6E4EC'),
        'C': ('#EF6B5B', '#E6E4EC'),
        'W': ('#FFFFFF', '#FFFFFF'),
        'D': ('#8A5A3A', '#BDB9C8'),
        'H': ('#FFE08A', '#FFFFFF'),
        'K': ('#EF6B8A', '#DCDAE2'),
    }


NAV = {'home': home, 'tasks': tasks, 'path': path, 'shop': shop, 'crew': crew, 'bag': bag}
BTN = {'calendar': calendar, 'honey': honey}


def main():
    OUT.mkdir(exist_ok=True)
    for name, fn in NAV.items():
        icon, pal = fn()
        on = {k: v[0] for k, v in pal.items()}
        off = {k: v[1] for k, v in pal.items()}
        icon.render(on, INK).save(OUT / f'nav2_{name}_on.png')
        icon.render(off, OFF_LINE).save(OUT / f'nav2_{name}_off.png')
    for name, fn in BTN.items():
        icon, pal = fn()
        icon.render({k: v[0] for k, v in pal.items()}, INK).save(OUT / f'btn_{name}.png')
    print('ok')


if __name__ == '__main__':
    main()
