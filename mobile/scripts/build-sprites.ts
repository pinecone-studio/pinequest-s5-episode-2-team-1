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
import { BEAR_FACES, BEAR_FURS } from '../../shared/bear.ts';
import { recolorFur } from './fur.ts';
import { blank, type Img, readPng, samePixels, writePng } from './png.ts';

const SRC = new URL('../../docs/design/pixel-bear/sprites/', import.meta.url);
const OUT = new URL('../assets/sprites/', import.meta.url);
const REG = new URL('../src/sprites/index.ts', import.meta.url);

// name -> [scale | [w, h]]   scale = бүхэл тоо, [w, h] = тодорхой хэмжээ (dp)
const M: Record<string, (number | [number, number])[]> = {};
for (const n of ['icon_coin', 'icon_flame', 'icon_star', 'icon_heart']) M[n] = [1, 2, 3];
// нууц хайрцгаас гарсан зоос (app/chest.tsx)
M.icon_coin.push(8);
M.icon_mystery_box = [2, 4];
for (const n of ['bear_idle_scarf', 'bear_tired_scarf', 'bear_neglected_scarf', 'bear_sleep']) M[n] = [2];
// нүүрний баавгайн амьд хөдөлгөөн (scripts/home-sprites.ts, PixelLab)
for (const n of ['thriving', 'happy', 'tired', 'neglected', 'sleep', 'ouch']) M[`bear_home_${n}`] = [2];
M.bear_home_welcome = [3];
for (const n of ['thriving', 'happy', 'tired', 'neglected', 'sleep', 'ouch']) M[`bear_helmet_base_${n}`] = [2];
M.bear_helmet_base_welcome = [3];
for (const n of ['thriving', 'happy', 'tired', 'neglected', 'sleep', 'ouch']) M[`bear_headscarf_base_${n}`] = [2];
M.bear_headscarf_base_welcome = [3];
for (const n of ['thriving', 'happy', 'tired', 'neglected', 'sleep', 'ouch']) M[`bear_boot_base_${n}`] = [2];
M.bear_boot_base_welcome = [3];
for (const n of ['thriving', 'happy', 'tired', 'neglected', 'sleep', 'ouch']) M[`bear_batman_base_${n}`] = [2];
M.bear_batman_base_welcome = [3];
// өмсөх item-ийн давхарга (home-sprites.ts): амьд баавгайн frame бүрийн толгойд тааруулж зурна
for (const n of ['glasses', 'gradcap', 'headphones']) M[`item_${n}`] = [2];
M.item_warrior_helmet = [2];
M.outfit_warrior_helmet = [1];
for (const n of ['batman_mask', 'batman_suit', 'ny_cap', 'hiphop_chain', 'mickey_mask']) {
  M[`item_${n}`] = [2];
  M[`outfit_${n}`] = [1];
}
M.outfit_batman = [1];
for (const id of ['pirate_hat', 'cowboy_hat', 'white_headscarf', 'brown_boots']) {
  M[`item_${id}`] = [2];
  M[`outfit_${id}`] = [1];
}
for (const id of ['staff00', 'staff03', 'staff04', 'staff05', 'holly_staff', 'pestilence_staff', 'w_staff_256', 'black_sword', 'bronze_shield']) {
  M[`item_${id}`] = [2];
  M[`outfit_${id}`] = [1];
  for (const state of ['thriving', 'happy', 'tired', 'neglected', 'sleep', 'ouch', 'welcome'])
    M[`held_${id}_${state}`] = [state === 'welcome' ? 3 : 2];
}
for (const state of ['thriving', 'happy', 'tired', 'neglected', 'sleep', 'ouch', 'welcome'])
  M[`fitted_brown_boots_${state}`] = [state === 'welcome' ? 3 : 2];
for (const state of ['thriving', 'happy', 'tired', 'neglected', 'sleep', 'ouch', 'welcome'])
M.bear_cheer_scarf = [2];
// хувцасны карт (1×); дэлгүүрийн баавгай нь амьд баавгай + item давхарга (components/LiveBear)
for (const n of ['outfit_scarf', 'outfit_glasses', 'outfit_gradcap', 'outfit_headphones']) M[n] = [1];
// толгойнууд: аватар (49x42, 44x38, 112x96), хуанлийн царай (өндөр 34), загварын 2x
M.head_idle = [[49, 42], [44, 38], [112, 96], [40, 34]];
M.head_happy = [[164, 108], [52, 34]];
M.head_tired = [[40, 34]];
M.head_neglected = [[40, 34]];
M.head_sleep = [[54, 34]];
// профайлын баавгай (scripts/avatar-sprites.ts): аватар 48, сонгох дэлгэцийн том хөрөг 160
for (const fur of BEAR_FURS)
  for (const face of BEAR_FACES) for (const chest of ['patch', 'plain']) M[`avatar_${fur}_${face}_${chest}`] = [[48, 48], [160, 160]];
// зам
for (const n of ['map_cloud_a', 'map_cloud_b', 'map_ring', 'map_butterfly_sheet']) M[n] = [2];
// замын зангилааны хажуугийн жижиг тэмдэг (PathMap)
for (const n of ['map_gift', 'map_qblock', 'map_sapling']) M[n] = [1];
for (const n of ['tile_stone_done', 'tile_pedestal_end', 'tile_pedestal_sapling']) M[n] = [2];
// замын алхмууд ба жижиг баавгай (scripts/map-sprites.ts): баавгай 3/4 хэмжээтэй эх зургаас 1× → 46 dp өндөр
for (const n of ['tile_step_lock', 'tile_step_cur']) M[n] = [2];
for (const n of ['map_bear_small', 'map_bear_small_blink']) M[n] = [1];
// адал явдлын газрын зураг (docs/design/pixel-bear/tools/mapgen_world.py), тулааны баавгай (scripts/bear-sprites.ts)
// 3-р бүлэг «Нарны элсэн хаант улс» (scripts/sunsands-sprites.ts): газрын зураг, тулааны дэвсгэр 2×; хайрцаг, хэрэглэгдэхүүн
// газрын зураг ба цүнхэнд 1×, нээх дэлгэцэнд 4×
for (const n of ['map_world_sun', 'map_world_sun_foot', 'lair_sun', 'lair_sun_scarab', 'lair_sun_captain']) M[n] = [2];
for (const n of ['map_chest', 'map_chest_open', 'item_amber', 'item_honey']) M[n] = [1, 4];
for (const n of ['map_world_0', 'map_world_1', 'map_world_2', 'map_flag', 'fx_magic', 'lair_0', 'lair_1', 'lair_1_left', 'lair_1_right', 'lair_2', 'bear_battle', 'fx_honey_shatter', 'fx_spark', 'fx_spark_magic', 'fx_slash']) M[n] = [2];
// boss: тулаанд 4× (boss_pumpkin.py, mapgen_world.py); газрын зураг дээр ~70 dp өндөр (хулуу 1.5×, бусад 2.5×)
M.boss_pumpkin_sheet = [[376, 71], 4];
M.map_boss_2 = [[75, 70], 4];
M.map_boss_2_white = [4];
M.fx_scythe = [4];
// тулааны амийн зурвас ба манарах эргүүлэг (scripts/hud-sprites.ts)
for (const n of ['hud_cap', 'hud_skull', 'fx_dizzy_sheet', 'fx_soul_sheet']) M[n] = [2];
// 2-р бүлгийн дайснууд (scripts/golem-sprites.ts, PixelLab): газрын зураг дээр 1×, тулаанд гарууд 2×, boss 2.5× (frame тэгш
// хэмжээтэй тул бүхэл dp); довтолгооны эффект 1×
for (const n of ['golem_left_sheet', 'golem_right_sheet', 'golem_scarab_sheet', 'golem_captain_sheet']) M[n] = [1, 2];
for (const n of ['golem_boss_sheet', 'golem_lion_sheet']) M[n] = [1, 2.5];
// ялагдах анимаци (scripts/defeat-sprites.ts): тулааны frame-тэй ижил томрол
for (const n of ['left', 'right', 'scarab', 'captain']) M[`defeat_${n}`] = [2];
for (const n of ['boss', 'lion']) M[`defeat_${n}`] = [2.5];
M.defeat_pumpkin = [4];
for (const n of ['fx_crystal_bolt', 'fx_golem_orb', 'fx_moon_crescent', 'fx_golem_impact']) M[n] = [1];
for (const n of ['sun_fireball', 'sun_blast', 'sun_disc', 'gold_hit', 'sand_ball', 'sand_dust', 'ghost_flame', 'ghost_hit', 'moon_hit', 'crystal_strike', 'crystal_blast']) M[`fx_${n}`] = [1];
// эцсийн цохилтын KO: 2× (тулаанд томруулсан дайснаас жижиг харагдахгүй)
M.fx_ko_burst = [2];
for (const n of ['claw', 'cross', 'boom', 'cracks', 'dust', 'aura']) M[`fx_bear_${n}`] = [1];
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
// баавгай бэлдэж байхад эргэх номын хуудас (scripts/book-sprites.ts), 8 frame 28×18 → 2×
M.fx_book_flip_sheet = [2];
M.btn_honey = [[30, 30]];

// баавгайтай sprite-ууд: сонгосон үсний өнгөөр (хар, цагаан) хувилбар `<нэр>_<өнгө>_<w>x<h>` үүснэ, components/pixel/Sprite
// нь FurContext-оор сонгоно. Хөрөг (avatar_*) нь өнгө бүрээрээ тусдаа, item_* давхарга өнгөгүй.
const FUR_SPRITES = new Set(Object.keys(M).filter((n) => /^(bear_|head_|outfit_|map_bear_small)/.test(n)));

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

/** Batman хувцасны саарал/хар pixel-ийг (бараг өнгөгүй) үсний өнгөөр будахгүй: зөвхөн толгой, чих өнгөө солино */
function keepSuit(base: Img, furred: Img): Img {
  for (let i = 0; i < base.d.length; i += 4) {
    const [r, g, b] = [base.d[i], base.d[i + 1], base.d[i + 2]];
    const [hi, lo] = [Math.max(r, g, b), Math.min(r, g, b)];
    if (base.d[i + 3] && hi < 130 && hi - lo <= 0.25 * (hi + lo)) furred.d.set(base.d.subarray(i, i + 4), i);
  }
  return furred;
}

const keep = new Set<string>();
const entries: [string, number, number][] = [];
for (const [name, variants] of Object.entries(M)) {
  const base = readPng(new URL(`${name}.png`, SRC));
  const furs = FUR_SPRITES.has(name) ? (['black', 'white'] as const) : [];
  const images: [string, Img][] = [[name, base], ...furs.map((f): [string, Img] => [`${name}_${f}`, name.startsWith('bear_batman_base_') ? keepSuit(base, recolorFur(base, f)) : recolorFur(base, f)])];
  for (const [id, img] of images) {
    for (const v of variants) {
      const [w, h] = typeof v === 'number' ? [img.w * v, img.h * v] : v;
      // бутархай томруулалт (2.5×) нь бүхэл хэмжээ өгөх ёстой: үгүй бол frame-ийн шилжилт хагас pixel-ээр гулсана
      if (!Number.isInteger(w) || !Number.isInteger(h)) throw new Error(`${id}: ${img.w}×${img.h} ×${v} бүхэл биш`);
      const key = `${id}_${w}x${h}`;
      for (const [d, suffix] of [[1, ''], [2, '@2x'], [3, '@3x']] as const) {
        const file = new URL(`${key}${suffix}.png`, OUT);
        const out = resize(img, w * d, h * d);
        if (!existsSync(file) || !samePixels(readPng(file), out)) writePng(file, out);
        keep.add(`${key}${suffix}.png`);
      }
      entries.push([key, w, h]);
    }
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
