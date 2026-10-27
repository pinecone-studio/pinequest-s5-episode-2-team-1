/**
 * 4-р бүлэг «Мөнх цаст оргил»-ын газрын зураг ба тулааны дэвсгэрүүд (эх: docs/design/pixel-bear/reference/snow_*.png,
 * AI-ээр томруулсан pixel зураг → жинхэнэ pixel хэмжээ, 2× нь апп-д).
 *
 *   map_world_snow     — snow_roadmap-bg.png (цаст хавцал, хөлдсөн гол; 195×390)
 *   lair_snow          — Нарны ордны дэвсгэрийг (sun_boss-palace-bg) мөсөн өнгө рүү эргүүлсэн (Santa-ийн мөсөн ордон)
 *   lair_snow_yak      — sun_soldier-outpost-bg-ээс (Мөсөн эвэрт хааны застав)
 *   lair_snow_leopard  — sun_left-rampart-bg-ээс (мөсөн хэрэм)
 *   lair_snow_owl      — sun_right-observatory-bg-ээс (мөсөн одон орны танхим)
 *
 * Ажиллуулах:  node scripts/snow-sprites.ts && npm run sprites   (mobile/)
 */
import { type Img, readPng, writePng } from './png.ts';
import { bbox, contact, crop, cutout, depixelize, shrink, SPRITES, toSheet } from './sprite-kit.ts';

const REF = new URL('../../docs/design/pixel-bear/reference/', import.meta.url);
const save = (name: string, img: Img) => writePng(new URL(`${name}.png`, SPRITES), img);

save('map_world_snow', depixelize(readPng(new URL('snow_roadmap-bg.png', REF)), 195, 390));
/** Шар, улбар өнгийг (hue 20–60°) мөсөн цэнхэр рүү эргүүлж, бага зэрэг цайвар, бүдэг болгоно (pixel бүр цул өнгө хэвээр). */
function toIce(img: Img): Img {
  const o = { w: img.w, h: img.h, d: img.d.slice() };
  for (let i = 0; i < o.d.length; i += 4) {
    const [r, g, b] = [o.d[i] / 255, o.d[i + 1] / 255, o.d[i + 2] / 255];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const d = max - min;
    let h = 0;
    if (d) h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    let [hue, sat, val] = [((h * 60 + 360) % 360) / 360, max ? d / max : 0, max];
    if (sat > 0.15) hue = (hue + 0.5) % 1;
    [sat, val] = [sat * 0.75, Math.min(1, val * 1.05 + 0.05)];
    const k = (n: number) => {
      const t = (n + hue * 6) % 6;
      return val - val * sat * Math.max(0, Math.min(1, Math.min(t, 4 - t)));
    };
    [o.d[i], o.d[i + 1], o.d[i + 2]] = [k(5), k(3), k(1)].map((c) => Math.round(c * 255));
  }
  return o;
}

// тулаанчдын хөл гэрийн 181-р мөрөнд (BossArena GROUND): эх зургийн шал 77%-д
for (const [file, name] of [
  ['sun_boss-palace-bg.png', 'lair_snow'],
  ['sun_left-rampart-bg.png', 'lair_snow_leopard'],
  ['sun_right-observatory-bg.png', 'lair_snow_owl'],
  ['sun_soldier-outpost-bg.png', 'lair_snow_yak'],
] as const)
  save(name, toIce(depixelize(readPng(new URL(file, REF)), 215, 232)));
// Бүх нүдийг нэг хүрээгээр тайрна: цагираг, болор ургахдаа байрандаа үлдэнэ.
const burst = cutout(readPng(new URL('santa_ice-burst-sheet.png', REF)));
const cells = Array.from({ length: 6 }, (_, i) => crop(burst, (i % 3) * 512, Math.floor(i / 3) * 512, 512, 512));
const bounds = bbox(cells.map((img) => ({ ...img, d: img.d.map((v, i) => (i % 4 === 3 && v < 128 ? 0 : v)) })));
const frames = cells.map((img, i) => ({ name: `burst${i}`, duration: 90, img: shrink(img, 96, bounds) }));
const sheet = toSheet(frames, 3);
const bell = shrink(cutout(readPng(new URL('item_ice-bell.png', REF))), 30);
save('fx_santa_ice_burst', sheet);
save('item_bell', bell);
const preview = process.argv.indexOf('--preview');
if (preview >= 0) {
  writePng(`${process.argv[preview + 1]}/santa_ice_burst_contact.png`, contact(sheet));
  writePng(`${process.argv[preview + 1]}/item_bell_contact.png`, contact(bell));
}
console.log(`snow sprites: map_world_snow, lair_snow(_leopard/_owl/_yak), burst ${frames[0].img.w}×96, bell ${bell.w}×30`);
