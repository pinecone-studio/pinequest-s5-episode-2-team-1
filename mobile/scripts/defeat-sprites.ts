/**
 * Дайсан бүрийн ялагдах анимаци (тулаанд баавгай ялахад): цагаан анивчилт → PixelLab-ийн унах frame-үүд
 * (pixellab/golem-<name>-defeat.png, pumpkin-defeat.png: 0 = суурь, 1–8 = унах) → хэвтэж хөдлөхгүй → бие нь доороосоо
 * дээш алтан гэрэл болж pixel-ээр уусаж, оч нь дээш хөөрнө. Frame бүр тулааны frame-тэй ижил хэмжээ, байрлалтай
 * (golems.json-ийн dx/dy-аар тайрна) тул тулааны дүрийн оронд шууд солигдоно.
 *
 * Ажиллуулах:  node scripts/golem-sprites.ts && node scripts/defeat-sprites.ts && npm run sprites   (mobile/)
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { blank, type Img, readPng, writePng } from './png.ts';
import { at, BAYER, crop, type Frame, groundShadow, has, hex, put, type RGB, SPRITES, toSheet, white } from './sprite-kit.ts';

const PIXELLAB = new URL('../../docs/design/pixel-bear/pixellab/', import.meta.url);
const GOLEMS = new URL('../src/lib/pixelBear/golems.json', import.meta.url);
const META = new URL('../src/lib/pixelBear/defeats.json', import.meta.url);
const COLS = 6;
/** хэвтсэн бие тулааны frame-ээс гарна: зүүн, баруун, дээд талд нэмэх зай (pixel); апп ижил хэмжээгээр ухраан зурна */
const PAD = 10;
/** уусах гэрлийн өнгө: бараан → цайвар */
const GLOW: RGB[] = ['#c9862a', '#f2c14e', '#ffe9a0', '#fffbe6'].map(hex);

/** `min`-ээс цөөн pixel-тэй сул хэсгийг (PixelLab-ийн толгойн дээрх зураас, оч) арилгана */
function dropSpecks(img: Img, min = 14): Img {
  const o = { w: img.w, h: img.h, d: img.d.slice() };
  // бараг тунгалаг pixel сул цэгийг биетэй холбохгүй
  for (let i = 3; i < o.d.length; i += 4) if (o.d[i] < 100) o.d[i] = 0;
  img = o;
  const seen = new Uint8Array(img.w * img.h);
  for (let s = 0; s < seen.length; s++) {
    if (seen[s] || !has(img, s % img.w, Math.floor(s / img.w))) continue;
    const part: number[] = [];
    const stack = [s];
    seen[s] = 1;
    while (stack.length) {
      const p = stack.pop() as number;
      part.push(p);
      const [x, y] = [p % img.w, Math.floor(p / img.w)];
      for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]])
        if (has(img, nx, ny) && !seen[ny * img.w + nx]) {
          seen[ny * img.w + nx] = 1;
          stack.push(ny * img.w + nx);
        }
    }
    if (part.length < min) for (const p of part) o.d[p * 4 + 3] = 0;
  }
  return o;
}

/**
 * PixelLab заримдаа толгойн дээр тод нимбэгэн шар зураас зурдаг (дүрийн өнгөнд байхгүй, G ≥ R): түүнийг ба хажуугийн
 * бараан хүрээг арилгана
 */
function dropLemon(img: Img): Img {
  const o = { w: img.w, h: img.h, d: img.d.slice() };
  const lemon = (x: number, y: number) => {
    const i = at(img, x, y);
    return has(img, x, y) && img.d[i] > 200 && img.d[i + 1] >= img.d[i] - 4 && img.d[i + 1] > 210 && img.d[i + 2] < 160;
  };
  for (let y = 0; y < img.h; y++)
    for (let x = 0; x < img.w; x++) {
      const i = at(img, x, y);
      const dark = img.d[i] + img.d[i + 1] + img.d[i + 2] < 120;
      const near = [-1, 0, 1].some((dy) => [-1, 0, 1].some((dx) => lemon(x + dx, y + dy)));
      if (lemon(x, y) || (dark && near)) o.d[i + 3] = 0;
    }
  return o;
}

/** pixel бүрийн тогтмол «санамсаргүй» тоо 0–1 */
const hash = (x: number, y: number) => (((x * 73856093) ^ (y * 19349663)) >>> 0) % 1000 / 1000;

/**
 * `t` (0–1) хүртэл уусгана: доороосоо дээш (бие газраас дээш гэрэл болно) pixel алга болж, ирмэгийн нарийн зурвас
 * алтан гэрэл болж, саяхан алга болсон pixel-ийн цөөхөн нь оч болж дээш хөөрөөд арилна.
 */
function dissolve(img: Img, t: number): Img {
  const o = blank(img.w, img.h);
  let top = img.h;
  let bottom = 0;
  for (let y = 0; y < img.h; y++)
    for (let x = 0; x < img.w; x++)
      if (has(img, x, y)) [top, bottom] = [Math.min(top, y), Math.max(bottom, y)];
  const sparks: [number, number, RGB][] = [];
  for (let y = 0; y < img.h; y++)
    for (let x = 0; x < img.w; x++) {
      if (!has(img, x, y)) continue;
      // голдуу өндрөөр (доороос дээш), Bayer нь ирмэгийг pixel шатлалтай болгоно
      const v = 0.8 * ((bottom - y) / Math.max(1, bottom - top)) + 0.2 * (BAYER[y % 4][x % 4] + 0.47);
      const edge = 1.3 * t - v;
      if (edge > 0.12) {
        if (edge < 0.5 && hash(x, y) < 0.1) sparks.push([x + Math.round((hash(y, x) - 0.5) * 4), y - Math.round((edge - 0.12) * 46), GLOW[2 + (hash(x, y + 1) < 0.5 ? 0 : 1)]]);
      } else if (edge > 0) put(o, x, y, GLOW[Math.min(3, Math.floor((edge / 0.12) * 4))]);
      else o.d.set(img.d.subarray(at(img, x, y), at(img, x, y) + 4), at(o, x, y));
    }
  for (const [x, y, c] of sparks) put(o, x, y, c);
  return o;
}

/** анивчих → унах (1–8) → хэвтэх → уусах; `cut` = 88 нүдийг тулааны frame болгож тайрна */
function defeatFrames(strip: Img, cell: number, cut: (img: Img) => Img, shadow: boolean): Frame[] {
  const cells = Array.from({ length: strip.w / cell }, (_, i) => dropSpecks(dropLemon(crop(strip, i * cell, 0, cell, strip.h))));
  const fall = cells.slice(1);
  const last = fall[fall.length - 1];
  const withShadow = (img: Img) => {
    if (!shadow) return img;
    const o = { w: img.w, h: img.h, d: img.d.slice() };
    let [x0, x1, y1] = [img.w, 0, 0];
    for (let y = 0; y < img.h; y++)
      for (let x = 0; x < img.w; x++) if (has(img, x, y)) [x0, x1, y1] = [Math.min(x0, x), Math.max(x1, x), Math.max(y1, y)];
    groundShadow(o, (x0 + x1) / 2, y1 + 0.5, (x1 - x0) / 2 + 2);
    return o;
  };
  const frames: Frame[] = [{ name: 'flash', duration: 90, img: white(fall[0]) }];
  fall.forEach((img, i) => frames.push({ name: `fall${i}`, duration: i < 3 ? 110 : i === fall.length - 1 ? 520 : 130, img: withShadow(img) }));
  for (let k = 1; k <= 7; k++) frames.push({ name: `fade${k}`, duration: 100, img: dissolve(last, k / 7) });
  frames.push({ name: 'gone', duration: 200, img: blank(cell, strip.h) });
  return frames.map((f) => ({ ...f, img: cut(f.img) }));
}

const golems = JSON.parse(readFileSync(GOLEMS, 'utf8')) as Record<string, { frameSize: { w: number; h: number }; dx: number; dy: number }>;
const meta: Record<string, { sheet: string; frameSize: { w: number; h: number }; pad: number; columns: number; durations: number[]; lying: number }> = {};
const save = (key: string, sheet: string, frames: Frame[], pad: number) => {
  writePng(new URL(`${sheet}.png`, SPRITES), toSheet(frames, COLS));
  const { w, h } = frames[0].img;
  meta[key] = { sheet, frameSize: { w, h }, pad, columns: COLS, durations: frames.map((f) => f.duration), lying: frames.findIndex((f) => f.name.startsWith('fade')) - 1 };
};

for (const [name, g] of Object.entries(golems)) {
  const file = new URL(`golem-${name}-defeat.png`, PIXELLAB);
  if (!existsSync(file)) continue;
  const cut = (img: Img) => crop(img, g.dx - PAD, g.dy - PAD, g.frameSize.w + 2 * PAD, g.frameSize.h + PAD);
  save(name, `defeat_${name}`, defeatFrames(readPng(file), 88, cut, true), PAD);
}
// Хулуун шидтэн: boss_pumpkin_sheet-ийн нүд (31×47) + 6 pixel зай; хөвдөг тул сүүдэргүй
const pumpkin = new URL('pumpkin-defeat.png', PIXELLAB);
if (existsSync(pumpkin)) save('pumpkin', 'defeat_pumpkin', defeatFrames(readPng(pumpkin), 31, (img) => crop(img, -6, -6, 43, 53), false), 6);

writeFileSync(META, `${JSON.stringify(meta, null, 2)}\n`);
console.log(`defeat sheets: ${Object.keys(meta).join(', ')}`);
