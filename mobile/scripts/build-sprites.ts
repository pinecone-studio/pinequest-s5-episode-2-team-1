/**
 * Pixel Bear sprite-уудыг React Native-д crisp харагдахаар бэлдэнэ.
 *
 * RN-ийн Image нь томруулахдаа bilinear шүүлтүүр хэрэглэдэг тул pixel art бүдгэрдэг. Үүнийг тойрохын тулд sprite
 * бүрийг ТОДОРХОЙ харагдах хэмжээ (dp)-ээр, 1x/2x/3x төхөөрөмжийн нягтралд зориулж nearest-neighbor аргаар урьдчилан
 * томруулж хадгална. Metro `name.png`, `name@2x.png`, `name@3x.png`-ийг нэг asset болгож, төхөөрөмжийн нягтралаар
 * сонгоно, тиймээс runtime дээр дахин resample хийгдэхгүй. Pixel нь өөрчлөгдөөгүй файлыг дахин бичихгүй (git-д
 * шахалтын "өөрчлөлт" гарахгүй).
 *
 * Ажиллуулах:  npm run sprites   (mobile/)
 * Эх сурвалж:  docs/design/pixel-bear/sprites/*.png
 * Гаралт:      mobile/assets/sprites/<name>_<w>x<h>[@2x|@3x].png  +  mobile/src/sprites/index.ts
 */
import { existsSync, readdirSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { blank, type Img, readPng, samePixels, writePng } from './png.ts';

const SRC = new URL('../../docs/design/pixel-bear/sprites/', import.meta.url);
const OUT = new URL('../assets/sprites/', import.meta.url);
const REG = new URL('../src/sprites/index.ts', import.meta.url);

// name -> [scale | [w, h]]   scale = бүхэл тоо, [w, h] = тодорхой хэмжээ (dp)
const M: Record<string, (number | [number, number])[]> = {};
for (const n of ['icon_coin', 'icon_flame', 'icon_star', 'icon_heart']) M[n] = [1, 2, 3];
M.icon_mystery_box = [2, 4];
for (const n of ['bear_idle_scarf', 'bear_tired_scarf', 'bear_neglected_scarf', 'bear_sleep']) M[n] = [2];
// нүүрний баавгайн амьд хөдөлгөөн (scripts/home-sprites.ts, PixelLab)
for (const n of ['thriving', 'happy', 'tired', 'neglected', 'sleep']) M[`bear_home_${n}`] = [2];
M.bear_cheer_scarf = [2, 3];
for (const n of ['outfit_scarf', 'outfit_glasses', 'outfit_gradcap', 'outfit_headphones']) M[n] = [1, 2];
// толгойнууд: аватар (49x42, 44x38, 112x96), хуанлийн царай (өндөр 34), загварын 2x
M.head_idle = [[49, 42], [44, 38], [112, 96], [40, 34]];
M.head_happy = [[164, 108], [52, 34]];
M.head_tired = [[40, 34]];
M.head_neglected = [[40, 34]];
M.head_sleep = [[54, 34]];
// зам
for (const n of ['map_bear', 'map_bear_blink', 'map_cloud_a', 'map_cloud_b', 'map_gift', 'map_qblock', 'map_ring', 'map_sapling', 'map_arrow', 'map_butterfly_sheet']) M[n] = [2];
for (const n of ['tile_stone_done', 'tile_stone_lock', 'tile_pedestal_cur', 'tile_pedestal_end', 'tile_pedestal_gift', 'tile_pedestal_myst', 'tile_pedestal_sapling']) M[n] = [2];
// адал явдлын газрын зураг (docs/design/pixel-bear/tools/mapgen_world.py), тулааны баавгай (scripts/bear-sprites.ts)
for (const n of ['map_world_0', 'map_world_1', 'map_world_2', 'map_flag', 'fx_magic', 'lair_0', 'lair_1', 'lair_2', 'bear_battle', 'fx_honey_shatter', 'fx_spark', 'fx_spark_magic', 'fx_slash']) M[n] = [2];
// boss: газрын зураг дээр 2×, тулаанд 4× (boss_pumpkin.py, mapgen_world.py)
for (const n of ['boss_pumpkin_sheet', 'map_boss_1', 'map_boss_2']) M[n] = [2, 4];
for (const n of ['map_boss_1', 'map_boss_2']) M[`${n}_white`] = [4];
M.fx_scythe = [4];
// хичээлийн дэлгэц (scripts/lesson-sprites.ts): дэвсгэр ба баавгай 3×
for (const n of ['bear_lesson', 'lesson_bg', 'lesson_shadow']) M[n] = [3];
// баавгайтай ярилцах дэлгэц (scripts/tutor-sprites.ts, classroom-sprites.ts): анги, баавгай, амны хэлбэр, хөшигний мөчир 3×
for (const n of ['bear_tutor_0', 'bear_mouth', 'classroom']) M[n] = [3];
for (const k of ['leaf', 'blossom', 'pine']) M[`branch_${k}`] = M[`branch_${k}_v`] = [3];
// v2 (Charlie маягийн) nav icon ба Нүүрний товчнууд: 20px эх, 30dp-ээр (1.5×) — нарийн pixel
for (const n of ['home', 'tasks', 'path', 'shop', 'crew', 'bag']) {
  M[`nav2_${n}_on`] = [[30, 30]];
  M[`nav2_${n}_off`] = [[30, 30]];
}
M.btn_calendar = [[30, 30]];
M.btn_honey = [[30, 30]];

/** Nearest-neighbor: Pillow-ийн `resize(NEAREST)`-тэй яг ижил (pixel төв, давхардсан алхмаар нэмэгдэх координат). */
function resize(img: Img, w: number, h: number): Img {
  const out = blank(w, h);
  const xs: number[] = [];
  for (let x = 0, sx = (img.w / w) * 0.5; x < w; x++, sx += img.w / w) xs.push(Math.trunc(sx));
  for (let y = 0, sy = (img.h / h) * 0.5; y < h; y++, sy += img.h / h) {
    const row = Math.trunc(sy) * img.w;
    for (let x = 0; x < w; x++) out.d.set(img.d.subarray((row + xs[x]) * 4, (row + xs[x]) * 4 + 4), (y * w + x) * 4);
  }
  return out;
}

const keep = new Set<string>();
const entries: [string, number, number][] = [];
for (const [name, variants] of Object.entries(M)) {
  const img = readPng(new URL(`${name}.png`, SRC));
  for (const v of variants) {
    const [w, h] = typeof v === 'number' ? [img.w * v, img.h * v] : v;
    const key = `${name}_${w}x${h}`;
    for (const [d, suffix] of [[1, ''], [2, '@2x'], [3, '@3x']] as const) {
      const file = new URL(`${key}${suffix}.png`, OUT);
      const out = resize(img, w * d, h * d);
      if (!existsSync(file) || !samePixels(readPng(file), out)) writePng(file, out);
      keep.add(`${key}${suffix}.png`);
    }
    entries.push([key, w, h]);
  }
}
for (const f of readdirSync(OUT)) if (f.endsWith('.png') && !keep.has(f)) unlinkSync(new URL(f, OUT));

const lines = [
  '// Автоматаар үүсгэсэн: mobile/scripts/build-sprites.ts. Гараар засахгүй.',
  "import type { ImageSourcePropType } from 'react-native';",
  '',
  'export interface SpriteAsset {',
  '  source: ImageSourcePropType;',
  '  width: number;',
  '  height: number;',
  '}',
  '',
  'export const sprites = {',
  ...entries.map(([key, w, h]) => `  ${key}: { source: require('../../assets/sprites/${key}.png'), width: ${w}, height: ${h} },`),
  '} as const satisfies Record<string, SpriteAsset>;',
  '',
  'export type SpriteKey = keyof typeof sprites;',
  '',
];
writeFileSync(REG, lines.join('\n'));
const total = [...keep].reduce((s, f) => s + statSync(new URL(f, OUT)).size, 0);
console.log(`${entries.length} sprite, ${keep.size} файл, ${Math.round(total / 1024)} KB`);
