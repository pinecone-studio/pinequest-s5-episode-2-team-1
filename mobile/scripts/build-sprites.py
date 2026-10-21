#!/usr/bin/env python3
"""Pixel Bear sprite-уудыг React Native-д crisp харагдахаар бэлдэнэ.

RN-ийн Image нь томруулахдаа bilinear шүүлтүүр хэрэглэдэг тул pixel art бүдгэрдэг. Үүнийг
тойрохын тулд sprite бүрийг ТОДОРХОЙ харагдах хэмжээ (dp)-ээр, 1x/2x/3x төхөөрөмжийн нягтралд
зориулж nearest-neighbor аргаар урьдчилан томруулж хадгална. Metro `name.png`, `name@2x.png`,
`name@3x.png`-ийг нэг asset болгож, төхөөрөмжийн нягтралаар сонгоно, тиймээс runtime дээр
дахин resample хийгдэхгүй.

Ажиллуулах:  python3 mobile/scripts/build-sprites.py     (Pillow хэрэгтэй)
Эх сурвалж:  docs/design/pixel-bear/sprites/*.png
Гаралт:      mobile/assets/sprites/<name>_<w>x<h>[@2x|@3x].png  +  mobile/src/sprites/index.ts
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'docs/design/pixel-bear/sprites'
OUT = ROOT / 'mobile/assets/sprites'
REG = ROOT / 'mobile/src/sprites/index.ts'

# name -> [(scale | (w, h)), ...]   scale = бүхэл тоо, (w, h) = тодорхой хэмжээ (dp)
ICONS = ['icon_coin', 'icon_flame', 'icon_star', 'icon_heart']
M = {}
for n in ICONS:
    M[n] = [1, 2, 3]
M['icon_mystery_box'] = [2, 4]
for n in ['bear_idle_scarf', 'bear_tired_scarf', 'bear_neglected_scarf', 'bear_sleep']:
    M[n] = [2]
M['bear_cheer_scarf'] = [2, 3]
for n in ['outfit_scarf', 'outfit_glasses', 'outfit_gradcap', 'outfit_headphones']:
    M[n] = [1, 2]
# толгойнууд: аватар (49x42, 44x38, 112x96), хуанлийн царай (өндөр 34), загварын 2x
M['head_idle'] = [(49, 42), (44, 38), (112, 96), (40, 34)]
M['head_happy'] = [(164, 108), (52, 34)]
M['head_tired'] = [(40, 34)]
M['head_neglected'] = [(40, 34)]
M['head_sleep'] = [(54, 34)]
# зам
for n in ['map_bear', 'map_bear_blink', 'map_cloud_a', 'map_cloud_b', 'map_gift', 'map_qblock', 'map_ring',
          'map_sapling', 'map_arrow', 'map_butterfly_sheet']:
    M[n] = [2]
for n in ['tile_stone_done', 'tile_stone_lock', 'tile_pedestal_cur', 'tile_pedestal_end', 'tile_pedestal_gift',
          'tile_pedestal_myst', 'tile_pedestal_sapling']:
    M[n] = [2]
M['map_base'] = [2]
# адал явдлын газрын зураг (docs/design/pixel-bear/tools/mapgen_world.py): доороос дээш хэсгүүд, boss, туг
for n in ['map_world_0', 'map_world_1', 'map_world_2', 'map_flag', 'fx_magic', 'lair_0', 'lair_1', 'lair_2', 'bear_battle', 'bear_gallop', 'fx_spark', 'fx_spark_magic', 'fx_slash']:
    M[n] = [2]
# boss: газрын зураг дээр 2×, тулаанд 4× (boss_pumpkin.py, mapgen_world.py)
for n in ['boss_pumpkin_sheet', 'map_boss_1', 'map_boss_2']:
    M[n] = [2, 4]
for n in ['map_boss_1', 'map_boss_2']:
    M[f'{n}_white'] = [4]
M['fx_scythe'] = [4]
# v2 (Charlie маягийн) nav icon ба Нүүрний товчнууд: 20px эх, 30dp-ээр (1.5×) — нарийн pixel
for n in ['home', 'tasks', 'path', 'shop', 'crew', 'bag']:
    M[f'nav2_{n}_on'] = [(30, 30)]
    M[f'nav2_{n}_off'] = [(30, 30)]
M['btn_calendar'] = [(30, 30)]
M['btn_honey'] = [(30, 30)]


def resize(img: Image.Image, w: int, h: int) -> Image.Image:
    return img.resize((w, h), Image.NEAREST)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for old in OUT.glob('*.png'):
        old.unlink()
    entries = []
    for name, variants in M.items():
        img = Image.open(SRC / f'{name}.png').convert('RGBA')
        for v in variants:
            w, h = (img.width * v, img.height * v) if isinstance(v, int) else v
            key = f'{name}_{w}x{h}'
            for d, suffix in ((1, ''), (2, '@2x'), (3, '@3x')):
                resize(img, w * d, h * d).save(OUT / f'{key}{suffix}.png', optimize=True)
            entries.append((key, name, w, h))
    lines = [
        '// Автоматаар үүсгэсэн: mobile/scripts/build-sprites.py. Гараар засахгүй.',
        "import type { ImageSourcePropType } from 'react-native';",
        '',
        'export interface SpriteAsset {',
        '  source: ImageSourcePropType;',
        '  width: number;',
        '  height: number;',
        '}',
        '',
        'export const sprites = {',
    ]
    for key, _name, w, h in entries:
        lines.append(f"  {key}: {{ source: require('../../assets/sprites/{key}.png'), width: {w}, height: {h} }},")
    lines += ['} as const satisfies Record<string, SpriteAsset>;', '', 'export type SpriteKey = keyof typeof sprites;', '']
    REG.write_text('\n'.join(lines))
    total = sum(p.stat().st_size for p in OUT.glob('*.png'))
    print(f'{len(entries)} sprite, {len(list(OUT.glob("*.png")))} файл, {total / 1024:.0f} KB')


if __name__ == '__main__':
    main()
