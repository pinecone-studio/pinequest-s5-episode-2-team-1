/**
 * 3-р бүлэг «Нарны элсэн хаант улс»-ын дэвсгэр, хайрцаг, хэрэглэгдэхүүн (эх: docs/design/pixel-bear/reference/sun_*.png,
 * AI-ээр томруулсан pixel зураг → жинхэнэ pixel хэмжээ, 2× нь апп-д).
 *
 *   map_world_sun       — sun_roadmap-bg.png (бүлгийн газрын зураг, 195×390)
 *   map_world_sun_foot  — sun_roadmap-boss-plaza-bg.png (бүлгийн доод хэсэг: boss-ын тавцан)
 *   lair_sun            — sun_boss-palace-bg.png (Нарны арсланы ордон)
 *   lair_sun_scarab     — sun_soldier-outpost-bg.png (Элсэн цохын застав)
 *   lair_sun_captain    — sun_left-rampart-bg.png (Бамбайт ахлагчийн цайзын хэрэм)
 *   map_chest(_open), item_amber, item_honey — тунгалаг дэвсгэртэй зураг → pixel (тойм хадгална)
 *
 * Ажиллуулах:  node scripts/sunsands-sprites.ts && npm run sprites   (mobile/)
 */
import { existsSync } from 'node:fs';
import { type Img, readPng, writePng } from './png.ts';
import { depixelize, shrink, SPRITES } from './sprite-kit.ts';

const REF = new URL('../../docs/design/pixel-bear/reference/', import.meta.url);
const save = (name: string, img: Img) => writePng(new URL(`${name}.png`, SPRITES), img);
const ref = (f: string) => new URL(f, REF);

save('map_world_sun', depixelize(readPng(ref('sun_roadmap-bg.png')), 195, 390));
const foot = ref('sun_roadmap-boss-plaza-bg.png');
if (existsSync(foot)) {
  const img = readPng(foot);
  save('map_world_sun_foot', depixelize(img, 195, Math.round((195 * img.h) / img.w)));
}
// тулаанчдын хөл гэрийн 181-р мөрөнд (BossArena GROUND): эх зургийн шал 77%-д тул шууд таарна
save('lair_sun', depixelize(readPng(ref('sun_boss-palace-bg.png')), 215, 232));
save('lair_sun_scarab', depixelize(readPng(ref('sun_soldier-outpost-bg.png')), 215, 232));
save('lair_sun_captain', depixelize(readPng(ref('sun_left-rampart-bg.png')), 215, 232));

for (const [file, name, h] of [
  // хоёр төлөв нэг масштабаар (эх зурагт таг нь 980 / 762 өндөр)
  ['sun_chest-closed.png', 'map_chest', 30],
  ['sun_chest-open.png', 'map_chest_open', 39],
  ['sun_item-amber-crystal.png', 'item_amber', 30],
  ['sun_item-honey-jar.png', 'item_honey', 30],
] as const)
  if (existsSync(ref(file))) save(name, shrink(readPng(ref(file)), h));

console.log('sun sands sprites: map_world_sun(_foot), lair_sun(_scarab/_captain), map_chest(_open), item_amber/honey');
