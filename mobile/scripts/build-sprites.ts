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
for (const n of ['thriving', 'happy', 'tired', 'neglected', 'sleep', 'ouch']) M[`bear_deel_base_${n}`] = [2];
M.bear_deel_base_welcome = [3];
// өмсөх item-ийн давхарга (home-sprites.ts): амьд баавгайн frame бүрийн толгойд тааруулж зурна
for (const n of ['glasses', 'gradcap', 'headphones']) M[`item_${n}`] = [2];
M.item_warrior_helmet = [2];
M.outfit_warrior_helmet = [1];
for (const n of ['batman_mask', 'batman_suit', 'ny_cap', 'hiphop_chain', 'mickey_mask', 'hard_hat', 'snorkel', 'ribbon', 'headband', 'mongol_hat', 'mongol_deel', 'puss_hat', 'puss_belt', 'puss_cape']) {
  M[`item_${n}`] = [2];
  M[`outfit_${n}`] = [1];
}
M.outfit_batman = [1];
M.outfit_mongol = [1];
M.outfit_puss = [1];
// sports wear (home-sprites.ts sportPixels): fitted overlays per state, like the boots
for (const id of ['sport_hoodie', 'sport_shorts', 'sport_sneakers']) {
  M[`item_${id}`] = [2];
  M[`outfit_${id}`] = [1];
  for (const state of ['thriving', 'happy', 'tired', 'neglected', 'sleep', 'ouch', 'welcome']) M[`fitted_${id}_${state}`] = [state === 'welcome' ? 3 : 2];
}
M.outfit_sport = [1];
for (const id of ['pirate_shirt', 'pirate_boots']) {
  M[`item_${id}`] = [2];
  M[`outfit_${id}`] = [1];
  for (const state of ['thriving', 'happy', 'tired', 'neglected', 'sleep', 'ouch', 'welcome']) M[`fitted_${id}_${state}`] = [state === 'welcome' ? 3 : 2];
}
M.outfit_pirate = [1];
M.item_wizard_robe = [2];
M.outfit_wizard_robe = [1];
for (const state of ['thriving', 'happy', 'tired', 'neglected', 'sleep', 'ouch', 'welcome']) M[`fitted_wizard_robe_${state}`] = [state === 'welcome' ? 3 : 2];
for (const id of ['demon_cape', 'demon_boots', 'ninja_jacket', 'ninja_pants', 'ninja_sandals', 'ninja_headband', 'straw_shirt', 'straw_shorts', 'straw_sandals']) {
  M[`item_${id}`] = [2];
  M[`outfit_${id}`] = [1];
  for (const state of ['thriving', 'happy', 'tired', 'neglected', 'sleep', 'ouch', 'welcome']) M[`fitted_${id}_${state}`] = [state === 'welcome' ? 3 : 2];
}
for (const state of ['thriving', 'happy', 'tired', 'neglected', 'sleep', 'ouch', 'welcome']) M[`fitted_headband_${state}`] = [state === 'welcome' ? 3 : 2];
M.item_demon_horns = [2];
M.outfit_demon_horns = [1];
M.outfit_demon = [1];
M.outfit_hero = [1];
for (const id of ['doctor_coat', 'officer_coat', 'officer_cap']) {
  M[`item_${id}`] = [2]; M[`outfit_${id}`] = [1];
  for (const state of ['thriving','happy','tired','neglected','sleep','ouch','welcome']) M[`fitted_${id}_${state}`] = [state === 'welcome' ? 3 : 2];
}
M.outfit_officer = [1];
for (const state of ['thriving','happy','tired','neglected','sleep','ouch','welcome']) M[`bear_professional_base_${state}`] = [state === 'welcome' ? 3 : 2];
M.item_straw_hat = [2];
M.outfit_straw_hat = [1];
M.outfit_ninja = [1];
M.outfit_strawhat = [1];
M.outfit_wizard = [1];
// the witch: PixelLab's own motions replace the bear's when worn (scripts/costume-motions.ts), its fur colours made there
for (const id of ['witch', 'cyborg']) {
  for (const state of ['thriving', 'happy', 'tired', 'neglected', 'sleep', 'ouch', 'welcome']) M[`costume_${id}_${state}`] = [state === 'welcome' ? 3 : 2];
  M[`outfit_${id}`] = [1];
}
// PixelLab costumes worn on every frame (home-sprites.ts costumePixels)
for (const id of ['vampire', 'cyborg']) {
  M[`item_${id}`] = [2];
  M[`outfit_${id}`] = [1];
  for (const state of ['thriving', 'happy', 'tired', 'neglected', 'sleep', 'ouch', 'welcome']) M[`fitted_${id}_${state}`] = [state === 'welcome' ? 3 : 2];
}
// Mongolian boots: fitted per state, and cut at the hem for wearing under the deel
M.item_mongol_boots = [2];
M.outfit_mongol_boots = [1];
for (const state of ['thriving', 'happy', 'tired', 'neglected', 'sleep', 'ouch', 'welcome'])
  for (const v of ['', '_deel']) M[`fitted_mongol_boots${v}_${state}`] = [state === 'welcome' ? 3 : 2];
for (const id of ['pirate_hat', 'cowboy_hat', 'white_headscarf', 'brown_boots']) {
  M[`item_${id}`] = [2];
  M[`outfit_${id}`] = [1];
}
for (const id of ['staff00', 'staff03', 'staff04', 'staff05', 'holly_staff', 'pestilence_staff', 'w_staff_256', 'black_sword', 'bronze_shield', 'wizard_wand', 'pirate_sword']) {
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
// 4-р бүлэг «Мөнх цаст оргил» (scripts/snow-sprites.ts)
for (const n of ['map_world_snow', 'lair_snow', 'lair_snow_leopard', 'lair_snow_owl', 'lair_snow_yak']) M[n] = [2];
for (const n of ['map_chest', 'map_chest_open', 'item_amber', 'item_honey', 'item_bell']) M[n] = [1, 4];
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
for (const n of ['golem_left_sheet', 'golem_right_sheet', 'golem_scarab_sheet', 'golem_captain_sheet', 'golem_leopard_sheet', 'golem_owl_sheet']) M[n] = [1, 2];
for (const n of ['golem_boss_sheet', 'golem_lion_sheet', 'golem_yak_sheet', 'golem_santa_sheet']) M[n] = [1, 2.5];
// ялагдах анимаци (scripts/defeat-sprites.ts): тулааны frame-тэй ижил томрол
for (const n of ['left', 'right', 'scarab', 'captain', 'leopard', 'owl']) M[`defeat_${n}`] = [2];
for (const n of ['boss', 'lion', 'yak', 'santa']) M[`defeat_${n}`] = [2.5];
M.defeat_pumpkin = [4];
for (const n of ['fx_crystal_bolt', 'fx_golem_orb', 'fx_moon_crescent', 'fx_golem_impact']) M[n] = [1];
for (const n of ['sun_fireball', 'sun_blast', 'sun_disc', 'gold_hit', 'sand_ball', 'sand_dust', 'ghost_flame', 'ghost_hit', 'moon_hit', 'crystal_strike', 'crystal_blast']) M[`fx_${n}`] = [1];
for (const n of ['ice_shard', 'ice_hit', 'frost_orb', 'frost_strike', 'glacier_orb', 'glacier_blast', 'santa_orb', 'santa_boom']) M[`fx_${n}`] = [1];
M.fx_santa_ice_burst = [1];
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
M.btn_honey = [[12, 12], [24, 24], [30, 30], [36, 36]];
M.btn_honey_jar = [[12, 12], [24, 24], [30, 30]];

// баавгайтай sprite-ууд: сонгосон үсний өнгөөр (хар, цагаан) хувилбар `<нэр>_<өнгө>_<w>x<h>` үүснэ, components/pixel/Sprite
// нь FurContext-оор сонгоно. Хөрөг (avatar_*) нь өнгө бүрээрээ тусдаа, item_* давхарга өнгөгүй.
// the hoodie's and pirate shirt's fitted sheets carry a little fur too (the neck above the lowered collar)
const FUR_SPRITES = new Set(
  Object.keys(M).filter(
    (n) => /^(bear_|head_|outfit_|costume_|map_bear_small|fitted_sport_hoodie_|fitted_pirate_shirt_|fitted_demon_cape_|fitted_ninja_jacket_|fitted_straw_shirt_|fitted_vampire_)/.test(n) || (n.startsWith('held_') && !n.startsWith('held_bronze_shield_')),
  ),
);

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

/** Deel navy/gold palette (scripts/home-sprites.ts DEEL_BLUE, DEEL_GOLD) keeps its colour in fur variants */
const DEEL_COLORS = new Set(['12,16,44', '22,32,84', '34,50,122', '50,70,156', '150,104,30', '206,156,48', '240,200,92']);
function keepDeel(base: Img, furred: Img): Img {
  for (let i = 0; i < base.d.length; i += 4)
    if (base.d[i + 3] && DEEL_COLORS.has(`${base.d[i]},${base.d[i + 1]},${base.d[i + 2]}`)) furred.d.set(base.d.subarray(i, i + 4), i);
  return furred;
}

/** Only the bear changes fur: an outfit card's item (staff, hat, shield) keeps its colours wherever it differs from the plain bear */
const REF = readPng(new URL('bear_idle_scarf.png', SRC));
/** the plain bear's scarf (green, gold pattern): cards without the scarf show fur here, which must take the new fur colour */
const scarfAt = (i: number) =>
  REF.d[i + 3] > 0 && ((REF.d[i + 1] > REF.d[i] && REF.d[i + 1] > REF.d[i + 2]) || (REF.d[i] > 170 && REF.d[i + 1] > 140 && REF.d[i + 2] < 0.45 * REF.d[i + 1]));
// with its dark outline and fringe: one pixel around the scarf
const onScarf = (i: number) => [-1, 0, 1].some((dy) => [-1, 0, 1].some((dx) => scarfAt(i + (dy * REF.w + dx) * 4)));
function keepItem(base: Img, furred: Img): Img {
  if (base.w !== REF.w || base.h !== REF.h) return furred;
  for (let i = 0; i < base.d.length; i += 4)
    if (base.d[i + 3] && !onScarf(i) && [0, 1, 2, 3].some((k) => base.d[i + k] !== REF.d[i + k])) furred.d.set(base.d.subarray(i, i + 4), i);
  return furred;
}
/** A held sheet recolours just its paw (scripts/home-sprites.ts held_paw_*), never the staff or sword */
function keepHeld(name: string, base: Img, furred: Img): Img {
  const paw = readPng(new URL(`held_paw_${name.slice(name.lastIndexOf('_') + 1)}.png`, SRC));
  for (let i = 0; i < base.d.length; i += 4) if (!paw.d[i + 3]) furred.d.set(base.d.subarray(i, i + 4), i);
  return furred;
}
/** Sports and pirate wear palettes (scripts/home-sprites.ts SPORT_*, PIRATE_*): the collar lies on the scarf, where keepItem would recolour it */
const CLOTH_COLORS = new Set([
  ...['12,12,16', '24,25,30', '38,40,46', '54,56,64', '22,150,110', '44,214,156', '34,52,168', '64,96,240', '150,60,170', '206,96,220', '176,178,188', '236,238,244'],
  ...['120,100,78', '196,180,148', '226,214,186', '244,236,214', '38,24,18', '70,46,32', '96,64,44', '120,84,58', '12,12,16', '36,36,44', '50,50,60', '68,68,80', '6,6,8', '16,15,19', '26,25,31', '44,42,50', '150,108,30', '214,170,60', '246,214,120'],
  ...['8,8,12', '24,24,32', '38,38,48', '54,54,66', '110,18,24', '156,30,36', '190,48,48', '170,120,30', '226,172,44', '246,206,96', '70,72,82', '104,106,116', '128,130,142'],
  ...['8,8,12', '26,26,32', '44,44,54', '70,70,84', '44,46,54', '120,126,140', '196,202,214', '16,70,72', '34,150,146', '96,214,200', '196,58,20', '242,142,34', '255,216,92'],
  ...['10,8,10', '22,18,20', '40,34,36', '110,22,20', '158,34,30', '196,58,44', '86,48,26', '122,70,38', '160,98,52', '222,140,52', '246,232,200', '250,248,240'],
  ...['10,10,14', '28,28,36', '44,44,56', '62,62,76', '150,60,10', '220,100,24', '246,134,40', '255,170,80', '52,56,66', '120,126,140', '170,176,188', '222,226,234', '22,26,44', '36,42,70', '56,64,100'],
  ...['110,16,20', '178,30,34', '214,48,48', '236,84,76', '176,120,10', '242,196,34', '255,230,110', '24,44,110', '46,84,170', '66,110,200', '96,140,220', '176,182,196', '214,220,232', '244,246,250', '70,40,20', '138,92,50', '190,146,90'],
]);
/** The plain bear's own colours: a PixelLab costume never uses them (home-sprites.ts), so its fur is exactly these pixels */
const PLAIN = readPng(new URL('bear_idle.png', SRC));
const PLAIN_COLORS = new Set(Array.from({ length: PLAIN.w * PLAIN.h }, (_, p) => PLAIN.d.slice(p * 4, p * 4 + 3).join()));
function keepCostume(base: Img, furred: Img): Img {
  for (let i = 0; i < base.d.length; i += 4)
    if (base.d[i + 3] && !PLAIN_COLORS.has(`${base.d[i]},${base.d[i + 1]},${base.d[i + 2]}`)) furred.d.set(base.d.subarray(i, i + 4), i);
  return furred;
}
function furred(name: string, base: Img, f: 'black' | 'white'): Img {
  // a fur colour its generator already made (the witch's own recolouring)
  if (existsSync(new URL(`${name}_${f}.png`, SRC))) return readPng(new URL(`${name}_${f}.png`, SRC));
  const img = recolorFur(base, f);
  if (/^(fitted|outfit)_vampire/.test(name)) return keepCostume(base, img);
  if (name.startsWith('fitted_')) {
    for (let i = 0; i < base.d.length; i += 4)
      if (base.d[i + 3] && CLOTH_COLORS.has(`${base.d[i]},${base.d[i + 1]},${base.d[i + 2]}`)) img.d.set(base.d.subarray(i, i + 4), i);
    return img;
  }
  if (/^outfit_(sport|pirate|wizard|demon|headband|ninja|straw|doctor|officer)/.test(name)) {
    keepItem(base, img);
    for (let i = 0; i < base.d.length; i += 4)
      if (base.d[i + 3] && CLOTH_COLORS.has(`${base.d[i]},${base.d[i + 1]},${base.d[i + 2]}`)) img.d.set(base.d.subarray(i, i + 4), i);
    return img;
  }
  if (name.startsWith('bear_batman_base_')) return keepSuit(base, img);
  if (/^(bear_deel_base_|outfit_mongol)/.test(name)) return name.startsWith('outfit_') ? keepItem(base, keepDeel(base, img)) : keepDeel(base, img);
  if (name.startsWith('held_')) return keepHeld(name, base, img);
  if (name.startsWith('outfit_')) return keepItem(base, img);
  return img;
}

const keep = new Set<string>();
const entries: [string, number, number][] = [];
for (const [name, variants] of Object.entries(M)) {
  const base = readPng(new URL(`${name}.png`, SRC));
  const furs = FUR_SPRITES.has(name) ? (['black', 'white'] as const) : [];
  const images: [string, Img][] = [[name, base], ...furs.map((f): [string, Img] => [`${name}_${f}`, furred(name, base, f)])];
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
