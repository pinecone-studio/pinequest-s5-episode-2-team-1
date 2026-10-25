/**
 * Boss тулааны pixel чимэглэл (BossArena): амийн зурвасны гадна захын ясан дэгээ, голын эвэртэй гавлын ясан тэмдэг
 * (зурвасны бие, дүүргэлт нь RN View тул өргөн өөрчлөгдөхөд pixel бүдгэрэхгүй) ба манарсан баавгайн толгой дээрх
 * эргэлдэх эргүүлэг (fx_dizzy_sheet, 6 frame), амь дуусахад биеэс гарах сүнс (fx_soul_sheet, 4 frame).
 *
 * Ажиллуулах:  npm run sprites:hud && npm run sprites   (mobile/)
 */
import { blank, writePng } from './png.ts';
import { at, bbox, crop, has, hex, pixellab, put, type RGB, SPRITES } from './sprite-kit.ts';

const PAL: Record<string, RGB> = {
  K: hex('#150f24'), // тойм
  W: hex('#efe9f7'), // яс
  S: hex('#b9aed0'), // ясны сүүдэр
  D: hex('#2b1f45'), // бэх цацраг
  E: hex('#ff4d5e'), // нүдний гэрэл
};

function draw(name: string, rows: string[]) {
  const img = blank(Math.max(...rows.map((r) => r.length)), rows.length);
  rows.forEach((row, y) => [...row].forEach((ch, x) => ch !== '.' && put(img, x, y, PAL[ch])));
  writePng(new URL(`${name}.png`, SPRITES), img);
}

// зүүн талын зурвасны гадна зах (баруун талынх нь толин тусгал): зурвасыг тэврэх "C" дэгээ
draw('hud_cap', [
  '...KKKK...',
  '..KWWWWK..',
  '.KWWSSWWK.',
  'KWWSKKSWK.',
  'KWSK..KK..',
  'KWSK......',
  'KWSK......',
  'KWSK......',
  'KWSK......',
  'KWSK..KK..',
  'KWWSKKSWK.',
  '.KWWSSWWK.',
  '..KWWWWK..',
  '...KKKK...',
]);

// голын тэмдэг: эвэртэй гавлын яс, нүд нь улаан гэрэлтэй, доор нь бэх цацраг
draw('hud_skull', [
  'K...............K',
  'KK.............KK',
  '.KWK....K....KWK.',
  '.KWWK.KKKKK.KWWK.',
  '..KWWKWWWWWKWWK..',
  '...KWWWWWWWWWK...',
  '...KWWWWWWWWWK...',
  '..KWKKKWWWKKKWK..',
  '..KWKEKWWWKEKWK..',
  '..KSWWWWKWWWWSK..',
  '...KSWWKKKWWSK...',
  '....KWKWKWKWK....',
  '..D..KKKKKKK..D..',
  '.DD.DDD.D.DDD.DD.',
  'D....D.......D..D',
]);

// эргүүлэг: хавтгайруулсан (y × 0.5) Архимедийн мушгиа 6 frame-д 60° эргэнэ; цайвар ягаан шугам, бараан тойм, доош сүүл
const DW = 17;
const DH = 13;
const LINE = hex('#efe6ff');
const RIM = hex('#4a3a73');
const dizzy = blank(DW * 6, DH);
for (let k = 0; k < 6; k++) {
  const line = blank(DW, DH);
  for (let t = 0; t <= 3.2 * Math.PI; t += 0.02) {
    const r = 0.6 + t * 0.72;
    const a = t + (k * Math.PI) / 3;
    put(line, Math.round(8 + r * Math.cos(a)), Math.round(5 + r * Math.sin(a) * 0.5), LINE);
  }
  // мушгианы гаднах үзүүрээс доош унжих сүүл (лавлагаа зургийнх шиг)
  for (let y = 9; y <= 11; y++) put(line, 8 + (y === 11 ? -1 : 0), y, LINE);
  for (let y = 0; y < DH; y++)
    for (let x = 0; x < DW; x++) {
      const on = (xx: number, yy: number) => xx >= 0 && yy >= 0 && xx < DW && yy < DH && line.d[(yy * DW + xx) * 4 + 3] > 0;
      if (on(x, y)) put(dizzy, k * DW + x, y, LINE);
      else if (on(x + 1, y) || on(x - 1, y) || on(x, y + 1) || on(x, y - 1)) put(dizzy, k * DW + x, y, RIM, 200);
    }
}
writePng(new URL('fx_dizzy_sheet.png', SPRITES), dizzy);

// сүнс: баавгайн өөрийн хажуу дүрс (pixellab/bear.png west) — цайвар цэнхэр-цагаан, хагас тунгалаг, ягаан тойм;
// хөл нь нарийсч долгилсон сүүл болно (4 frame-д долгион урагшилна)
const west = pixellab('bear').rotation('west');
const [bx0, by0, bx1, by1] = bbox([west]);
const body = crop(west, bx0, by0, bx1 - bx0, by1 - by0);
const SW = body.w + 4;
const SH = body.h;
const TAIL = Math.round(SH * 0.62); // энэ мөрнөөс доош сүүл
const soul = blank(SW * 4, SH);
const GLOW = hex('#dff3ff');
const CORE = hex('#ffffff');
const EDGE = hex('#8c7ad6');
for (let k = 0; k < 4; k++)
  for (let y = 0; y < SH; y++) {
    const t = y < TAIL ? 0 : (y - TAIL) / (SH - TAIL);
    const shift = y < TAIL ? 0 : Math.round(Math.sin(y * 0.45 + (k * Math.PI) / 2) * 2 * t);
    const cx = body.w / 2;
    for (let x = 0; x < body.w; x++) {
      if (!has(body, x, y) || Math.abs(x - cx) > cx * (1 - t * 0.75)) continue;
      const i = at(body, x, y);
      const lum = (body.d[i] + body.d[i + 1] + body.d[i + 2]) / 3;
      const edge = !has(body, x - 1, y) || !has(body, x + 1, y) || !has(body, x, y - 1) || lum < 60;
      const fade = Math.round(200 * (1 - t * 0.8));
      put(soul, k * SW + 2 + x + shift, y, edge ? EDGE : lum > 170 ? CORE : GLOW, edge ? Math.min(230, fade + 30) : fade);
    }
  }
writePng(new URL('fx_soul_sheet.png', SPRITES), soul);

console.log('hud sprites: hud_cap, hud_skull, fx_dizzy_sheet, fx_soul_sheet');
