// Дэлгүүрийн эвентийн poster (banner + эвентийн hero): poster-scenes.ts-ийн кодоор зурсан үзэгдэл дээр хувцастай баавгайнуудыг
// (costume_<id>_happy-ийн эхний frame, жинхэнэ pixel) зогсооно. Ард байгаа нь тэнгэрийн өнгөнд уусаж гүн үүсгэнэ; banner-ийн
// зүүн тал эвентийн өнгөөр dither-ээр уусна (апп бичгээ тэнд тавина).
// `node scripts/poster-sprites.ts` → assets/images/posters/<id>-banner.png (400×244), <id>-hero.png (320×300), 3× томруулсан.
import { mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { blank, type Img, readPng, writePng } from './png.ts';
import { BAYER, bbox, compose, crop, flipX, hex, put, type RGB, scale, SHADOW } from './sprite-kit.ts';
import { FLOOR, get, H, mix, SCENES, W } from './poster-scenes.ts';

// shortcut: events.ts-ийн өнгө, хувцсыг давтсан (апп-ын @shared alias node-д уншигдахгүй); эвент нэмэхэд энд бас нэмнэ
const POSTERS: { id: string; field: string; haze: string; cast: string[] }[] = [
  { id: 'agents', field: '#6B4EE6', haze: '#2A1C7A', cast: ['shadow_ninja', 'spy_agent', 'liquid_cop', 'leaf_ninja', 'blossom_ninja'] },
  { id: 'heroes', field: '#F7A97E', haze: '#F7A97E', cast: ['thunder_god', 'sky_hero', 'night_hero', 'wrestler', 'archer'] },
  { id: 'wizards', field: '#D4F55E', haze: '#A9D86A', cast: ['book_wizard', 'glasses_wizard', 'ginger_wizard'] },
];
const SPRITES = new URL('../assets/sprites/', import.meta.url);
const OUT = new URL('../assets/images/posters/', import.meta.url);
const COSTUMES = JSON.parse(readFileSync(new URL('../src/lib/pixelBear/bear-costumes.json', import.meta.url), 'utf8'));
const K = 3;
/** banner нь үзэгдлийн доод 244 мөр, hero нь голын 320 багана */
const BANNER = { x: 0, y: H - 244, w: W, h: 244 };
const HERO = { x: 40, y: 0, w: 320, h: H };

/** costume sheet (2× томруулсан) -ийн эхний frame-ийг жинхэнэ pixel болгоно */
function bear(id: string): Img {
  const name = readdirSync(SPRITES).find((f) => new RegExp(`^costume_${id}_happy_\\d+x\\d+\\.png$`).test(f));
  if (!name) throw new Error(`costume sheet алга: ${id}`);
  const sheet = readPng(new URL(name, SPRITES));
  const { w, h } = COSTUMES[id].happy.frameSize as { w: number; h: number };
  const o = blank(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) o.d.set(sheet.d.subarray((y * 2 * sheet.w + x * 2) * 4, (y * 2 * sheet.w + x * 2) * 4 + 4), (y * w + x) * 4);
  return o;
}

/** алсын дүрсийг тэнгэрийн өнгө рүү `k`-аар уусгана */
function haze(fr: Img, c: RGB, k: number): Img {
  const o = { ...fr, d: fr.d.slice() };
  for (let i = 0; i < o.d.length; i += 4) if (o.d[i + 3]) o.d.set(mix([o.d[i], o.d[i + 1], o.d[i + 2]], c, k), i);
  return o;
}

/** баавгайг `cx` төвтэй, хөлийг `feet` мөрөнд зогсоож, доор нь dither сүүдэр тавина */
function stand(img: Img, id: string, cx: number, feet: number, tint: RGB, k: number, mirror: boolean): Img {
  const fr = haze(mirror ? flipX(bear(id)) : bear(id), tint, k);
  const [x0, , x1, y1] = bbox([fr]);
  for (let y = feet - 3; y <= feet + 3; y++)
    for (let x = cx - 26; x <= cx + 26; x++) {
      const q = ((x - cx) / 26) ** 2 + ((y - feet) / 3.4) ** 2;
      if (q <= 1 && y < H && (q < 0.5 || (x + y) % 2)) put(img, x, y, mix(get(img, x, y), SHADOW, 0.5));
    }
  return compose(img, fr, Math.round(cx - (x0 + x1) / 2), feet - y1 + 1);
}

/** баг дүрс: [хувцасны индекс, төв x, хөл, уусалт, толин] — арын эгнээ эхэлж зурагдана */
type Slot = [number, number, number, number, boolean];
function cast(scene: Img, ids: string[], tint: RGB, slots: Slot[]): Img {
  return slots.filter(([i]) => ids[i]).reduce((img, [i, cx, feet, k, m]) => stand(img, ids[i], cx, feet, tint, k, m), scene);
}

/** зүүн тал эвентийн өнгө, `x0`..`x1` хооронд Bayer-ээр үзэгдэл рүү уусна */
function field(img: Img, c: RGB, x0: number, x1: number) {
  for (let y = 0; y < img.h; y++)
    for (let x = 0; x < x1; x++) if ((x - x0) / (x1 - x0) + BAYER[y & 3][x & 3] <= 0.5) put(img, x, y, c);
}

function out(img: Img, box: typeof BANNER, file: string) {
  writePng(new URL(file, OUT), scale(crop(img, box.x, box.y, box.w, box.h), K));
}

mkdirSync(OUT, { recursive: true });
for (const p of POSTERS) {
  const scene = SCENES[p.id]();
  const tint = hex(p.haze);
  const feet = FLOOR + 20;
  const banner = blank(W, H);
  banner.d.set(scene.d);
  field(banner, hex(p.field), 150, 250);
  out(cast(banner, p.cast, tint, [[1, 280, feet - 7, 0.3, false], [2, 372, feet - 7, 0.3, true], [0, 326, feet, 0, false]]), BANNER, `${p.id}-banner.png`);
  const hero = cast(scene, p.cast, tint, [
    [3, 92, feet - 13, 0.45, false],
    [4, 308, feet - 13, 0.45, true],
    [1, 144, feet - 7, 0.25, false],
    [2, 256, feet - 7, 0.25, true],
    [0, 200, feet, 0, false],
  ]);
  out(hero, HERO, `${p.id}-hero.png`);
  console.log(`poster: ${p.id}`);
}
