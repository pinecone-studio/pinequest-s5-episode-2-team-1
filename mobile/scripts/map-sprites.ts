/**
 * Сурах замын (roadmap) шинэ pixel эх зургууд + Хулуун шидтэний бүсийн дэвсгэрүүд.
 *
 *   tile_step_lock / tile_step_cur — tile_stone_lock-оос ("+10"-гүй): бүдэг саарал + цоож,
 *                                                     зөөлөн шар хүрээтэй одоогийн чулуу
 *   map_bear_small(_blink)  — map_bear-ийг 3/4 болгосон (26×46): замын баавгай
 *   map_world_1             — reference/river_map_bg.png (2-р бүлэг, Хадан аваргын бүс); дээд зах нь map_world_2 руу ууссан
 *   map_world_0             — reference/pumpkin_map_bg.png (1-р бүлэг, Хулуун шидтэний бүс); дээд зах нь map_world_1 руу dither-ээр ууссан
 *   lair_0                  — reference/pumpkin_battle_bg.png (тулааны дэвсгэр)
 *   lair_1                  — pixellab/golem-lair.png (2-р бүлгийн тулааны дэвсгэр, PixelLab)
 *
 * Ажиллуулах:  npm run sprites:map && npm run sprites   (mobile/) — mapgen_world.py-г дахин ажиллуулсны дараа ч (map_world_0/1, lair_0/1-г дарж бичдэг)
 */
import { blank, type Img, readPng, writePng } from './png.ts';
import { at, BAYER, clone, has, hex, put, type RGB, source, SPRITES } from './sprite-kit.ts';

const REF = new URL('../../docs/design/pixel-bear/reference/', import.meta.url);
const save = (name: string, img: Img) => writePng(new URL(`${name}.png`, SPRITES), img);
const rgb = (img: Img, x: number, y: number): RGB => [img.d[at(img, x, y)], img.d[at(img, x, y) + 1], img.d[at(img, x, y) + 2]];

/** AI-ээр томруулсан pixel зургийг жинхэнэ pixel хэмжээ рүү: нүд бүрийн голын хагасыг дундажилна (холилдсон ирмэгийг алгасна). */
function depixelize(img: Img, w: number, h: number, top = 0): Img {
  const ch = img.h - top;
  const cw = (ch * w) / h;
  const x0 = (img.w - cw) / 2;
  const o = blank(w, h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const sx = x0 + (x / w) * cw;
      const sy = top + (y / h) * ch;
      const sum = [0, 0, 0];
      let n = 0;
      for (let yy = Math.round(sy + (ch / h) * 0.25); yy < Math.round(sy + (ch / h) * 0.75); yy++)
        for (let xx = Math.round(sx + (cw / w) * 0.25); xx < Math.round(sx + (cw / w) * 0.75); xx++) {
          for (let c = 0; c < 3; c++) sum[c] += img.d[at(img, xx, yy) + c];
          n++;
        }
      put(o, x, y, [Math.round(sum[0] / n), Math.round(sum[1] / n), Math.round(sum[2] / n)]);
    }
  return o;
}

/** 3/4 болгох: 4×4 блок бүрээс 3×3; нүд бүрд хамгийн их давхцсан эх pixel-ийн өнгө (нүд, хамар зэрэг 1 pixel-ийн нарийн зүйл үлдэнэ). */
function threeQuarter(img: Img): Img {
  const w = Math.round((img.w * 3) / 4);
  const h = Math.round((img.h * 3) / 4);
  const o = blank(w, h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      // нүд (x, y) нь эхийн [x*4/3, (x+1)*4/3) мужийг хамарна; давхцалаар жигнэж тунгалаг бус, хамгийн бараан pixel-ийг (тойм) түрүүлнэ
      const votes = new Map<number, number>();
      for (let sy = Math.floor((y * 4) / 3); sy < Math.ceil(((y + 1) * 4) / 3) && sy < img.h; sy++)
        for (let sx = Math.floor((x * 4) / 3); sx < Math.ceil(((x + 1) * 4) / 3) && sx < img.w; sx++) {
          const ox = Math.min(sx + 1, ((x + 1) * 4) / 3) - Math.max(sx, (x * 4) / 3);
          const oy = Math.min(sy + 1, ((y + 1) * 4) / 3) - Math.max(sy, (y * 4) / 3);
          const i = at(img, sx, sy);
          const dark = img.d[i + 3] ? 1 + (765 - img.d[i] - img.d[i + 1] - img.d[i + 2]) / 1530 : 1;
          votes.set(i, (votes.get(i) ?? 0) + ox * oy * dark);
        }
      const best = [...votes].sort((a, b) => b[1] - a[1])[0][0];
      o.d.set(img.d.subarray(best, best + 4), at(o, x, y));
    }
  return o;
}

// ---------- Замын чулуунууд ----------
const stone = source('tile_stone_lock');
// "+10" бичиг ба зоос нь дээд хавтгайн дунд (x 5..17, y 3..9): тэр мөрийн хавтгайн өнгөөр будна
const face = rgb(stone, 4, 6);
const next = clone(stone);
for (let y = 3; y <= 9; y++)
  for (let x = 5; x <= 17; x++) {
    const c = rgb(stone, x, y);
    if (has(stone, x, y) && Math.abs(c[0] - face[0]) + Math.abs(c[1] - face[1]) + Math.abs(c[2] - face[2]) > 24) put(next, x, y, face);
  }
// тод: бага зэрэг цайруулна
for (let i = 0; i < next.d.length; i += 4) if (next.d[i + 3]) for (let c = 0; c < 3; c++) next.d[i + c] = Math.min(255, Math.round(next.d[i + c] * 1.04 + 6));

// түгжээтэй: бүдэг, саарал-ягаан (харанхуй дэвсгэр дээр ч ялгарна) + жижиг цоож
const lock = clone(next);
for (let i = 0; i < lock.d.length; i += 4)
  if (lock.d[i + 3]) {
    const g = (lock.d[i] + lock.d[i + 1] + lock.d[i + 2]) / 3;
    lock.d.set([Math.round(g * 0.62 + 12), Math.round(g * 0.6 + 8), Math.round(g * 0.66 + 22), 235], i);
  }
const PADLOCK = [
  '..HHH..',
  '.H###H.',
  '.#H.H#.',
  'HHHHHHH',
  'HbbkbbH',
  'HbbkbbH',
  'HddddDH',
  '.HHHHH.',
];
const lockPal: Record<string, RGB> = {
  '#': hex('#e9e4f5'),
  H: hex('#2b2640'),
  b: hex('#f2d27a'),
  d: hex('#c99a3e'),
  D: hex('#a77a2c'),
  k: hex('#2b2640'),
};
PADLOCK.forEach((row, y) => [...row].forEach((ch, x) => ch !== '.' && put(lock, 8 + x, 0 + y, lockPal[ch])));
save('tile_step_lock', lock);

// одоогийн: тод чулуу + 1 pixel зөөлөн шар хүрээ (дотор нь тод, гадна нь dither-тэй тунгалаг)
const cur = blank(next.w + 4, next.h + 4);
for (let y = 0; y < next.h; y++) for (let x = 0; x < next.w; x++) if (has(next, x, y)) cur.d.set(next.d.subarray(at(next, x, y), at(next, x, y) + 4), at(cur, x + 2, y + 2));
const ring = clone(cur);
const LEMON = hex('#ffe066');
for (let y = 0; y < cur.h; y++)
  for (let x = 0; x < cur.w; x++) {
    if (has(cur, x, y)) continue;
    const near1 = [-1, 0, 1].some((dy) => [-1, 0, 1].some((dx) => has(cur, x + dx, y + dy)));
    const near2 = !near1 && [-2, -1, 0, 1, 2].some((dy) => [-2, -1, 0, 1, 2].some((dx) => has(cur, x + dx, y + dy)));
    if (near1) put(ring, x, y, LEMON);
    else if (near2 && (x + y) % 2 === 0) put(ring, x, y, LEMON, 120);
  }
save('tile_step_cur', ring);

// ---------- Жижиг баавгай ----------
save('map_bear_small', threeQuarter(source('map_bear')));
save('map_bear_small_blink', threeQuarter(source('map_bear_blink')));

// ---------- Бүлгийн дэвсгэрүүд ----------
/**
 * Дээд 56 мөр: дээд бүлгийн (`above`) доод захыг толин тусгалаар үргэлжлүүлж, 5 шатлалт холимог өнгөөр Bayer
 * dither-тэй шинэ бүс рүү ууснa (pixel бүр цул өнгө тул бүдгэрэхгүй).
 */
function blendTop(zone: Img, above: Img) {
  const BLEND = 56;
  for (let y = 0; y < BLEND; y++)
    for (let x = 0; x < zone.w; x++) {
      const step = Math.max(0, Math.min(4, Math.floor(((y + 0.5) / BLEND) * 4 + 0.5 + BAYER[y % 4][x % 4]))) / 4;
      const a = rgb(above, x, above.h - 1 - y);
      const b = rgb(zone, x, y);
      put(zone, x, y, [0, 1, 2].map((c) => Math.round(a[c] + (b[c] - a[c]) * step)) as unknown as RGB);
    }
  return zone;
}
// 2-р бүлэг (Хадан аваргын бүс): голын эрэг, нурсан багана, болор; 1-р бүлэг (Хулуун шидтэний бүс) түүнд ууснa
const world1 = blendTop(depixelize(readPng(new URL('river_map_bg.png', REF)), 195, 380), source('map_world_2'));
save('map_world_1', world1);
save('map_world_0', blendTop(depixelize(readPng(new URL('pumpkin_map_bg.png', REF)), 195, 380), world1));

// ---------- Тулааны дэвсгэр ----------
// 8 мөр: зургийн дээд талын дугуй булангийн хар зурвас
save('lair_0', depixelize(readPng(new URL('pumpkin_battle_bg.png', REF)), 215, 232, 8));
// 2-р бүлэг (Хадан аварга, түүний гарууд): PixelLab create_image_pixflux (pixellab/golem-lair.png, голын бүсийн өнгөөр).
// Чулуун шал тулаанчдын хөлд (гэрийн 181-р мөр, BossArena GROUND) таарахаар 14 мөр дээш; доод зах нь шалны толин тусгал
const golemLair = readPng(new URL('../../docs/design/pixel-bear/pixellab/golem-lair.png', import.meta.url));
const lair1 = blank(215, 232);
for (let y = 0; y < lair1.h; y++) {
  const sy = y + 14 < golemLair.h ? y + 14 : 2 * golemLair.h - 1 - (y + 14);
  lair1.d.set(golemLair.d.subarray(at(golemLair, 0, sy), at(golemLair, 215, sy)), at(lair1, 0, y));
}
save('lair_1', lair1);

console.log('map sprites: tile_step_{lock,cur}, map_bear_small(_blink), map_world_0/1, lair_0/1');
