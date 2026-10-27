// Sprite генераторуудын (bear-sprites.ts, lesson-sprites.ts) нийтлэг хэрэгсэл: PixelLab-ийн sheet унших, тайрах,
// grid sheet, tag, газрын сүүдэр, урьдчилсан харагдац.
import { readFileSync } from 'node:fs';
import { blank, type Img, readPng } from './png.ts';

export const SPRITES = new URL('../../docs/design/pixel-bear/sprites/', import.meta.url);
const PIXELLAB = new URL('../../docs/design/pixel-bear/pixellab/', import.meta.url);

export type RGB = readonly [number, number, number];
export type P = readonly [number, number];

export const hex = (h: string): RGB => [Number.parseInt(h.slice(1, 3), 16), Number.parseInt(h.slice(3, 5), 16), Number.parseInt(h.slice(5, 7), 16)];
export const ramp = (...h: string[]) => h.map(hex);
export const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
].map((r) => r.map((v) => v / 16 - 0.47));
export const SHADOW = hex('#160b24');

export const at = (img: Img, x: number, y: number) => (y * img.w + x) * 4;
export const has = (img: Img, x: number, y: number) => x >= 0 && y >= 0 && x < img.w && y < img.h && img.d[at(img, x, y) + 3] > 0;
export function put(img: Img, x: number, y: number, c: RGB, a = 255) {
  if (x < 0 || y < 0 || x >= img.w || y >= img.h) return;
  img.d.set([c[0], c[1], c[2], a], at(img, x, y));
}
export const clone = (img: Img): Img => ({ w: img.w, h: img.h, d: img.d.slice() });
export const source = (n: string) => readPng(new URL(`${n}.png`, SPRITES));

export function crop(img: Img, x0: number, y0: number, w: number, h: number): Img {
  const o = blank(w, h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) if (has(img, x0 + x, y0 + y)) o.d.set(img.d.subarray(at(img, x0 + x, y0 + y), at(img, x0 + x, y0 + y) + 4), at(o, x, y));
  return o;
}

/** Бүх зургийн тунгалаг бус pixel-ийн нийлбэр хүрээ (x0, y0, x1, y1 — x1, y1 орохгүй) */
export function bbox(imgs: Img[]): [number, number, number, number] {
  let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const img of imgs)
    for (let y = 0; y < img.h; y++)
      for (let x = 0; x < img.w; x++)
        if (has(img, x, y)) [x0, y0, x1, y1] = [Math.min(x0, x), Math.min(y0, y), Math.max(x1, x + 1), Math.max(y1, y + 1)];
  return [x0, y0, x1, y1];
}

/** хамгийн том холбоот хэсэг (дүр) л үлдэнэ: PixelLab-ийн зурсан бүдэг, сул pixel-үүдийг арилгана */
export function largest(img: Img): Img {
  const seen = new Int32Array(img.w * img.h).fill(-1);
  const sizes: number[] = [];
  for (let s = 0; s < img.w * img.h; s++) {
    if (seen[s] >= 0 || !has(img, s % img.w, Math.floor(s / img.w))) continue;
    const id = sizes.length;
    let n = 0;
    const stack = [s];
    seen[s] = id;
    while (stack.length) {
      const p = stack.pop() as number;
      n++;
      const [x, y] = [p % img.w, Math.floor(p / img.w)];
      for (const [ax, ay] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1], [x + 1, y + 1], [x - 1, y - 1], [x + 1, y - 1], [x - 1, y + 1]])
        if (has(img, ax, ay) && seen[ay * img.w + ax] < 0) {
          seen[ay * img.w + ax] = id;
          stack.push(ay * img.w + ax);
        }
    }
    sizes.push(n);
  }
  const keep = sizes.indexOf(Math.max(...sizes));
  const out = blank(img.w, img.h);
  for (let p = 0; p < seen.length; p++) if (seen[p] === keep) out.d.set(img.d.subarray(p * 4, p * 4 + 4), p * 4);
  return out;
}
/** цагаан дүрс (цохиулах агшны анивчилт) */
export function white(img: Img): Img {
  const o = clone(img);
  for (let i = 0; i < o.d.length; i += 4) if (o.d[i + 3]) o.d.set([255, 255, 255], i);
  return o;
}

/** газрын сүүдэр: хөлийн доор зууван, ирмэг нь dither, хагас тунгалаг (ямар ч дэвсгэр дээр); биеийн ард зурагдана */
export function groundShadow(img: Img, cx: number, cy: number, rx: number, ry = 2) {
  for (let y = Math.floor(cy - ry); y <= cy + ry; y++)
    for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
      const q = ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2;
      if (q > 1 || has(img, x, y) || (q > 0.6 && (x + y) % 2)) continue;
      put(img, x, y, SHADOW, q > 0.6 ? 70 : 105);
    }
}

// ---------- PixelLab ----------
interface PixelLabRow {
  row: number;
  type: string;
  animation?: string;
  direction?: string;
  directions?: string[];
  frame_count: number;
}

/** PixelLab-ийн character spritesheet (docs/design/pixel-bear/pixellab/<name>.png + .json): pivot голдоо, ижил нүдтэй grid */
export function pixellab(name: string) {
  const img = readPng(new URL(`${name}.png`, PIXELLAB));
  const meta = JSON.parse(readFileSync(new URL(`${name}.json`, PIXELLAB), 'utf8'));
  const { width: cw, height: ch } = meta.spritesheet.cell_size;
  const rows: PixelLabRow[] = meta.spritesheet.rows;
  const cell = (row: number, col: number) => crop(img, col * cw, row * ch, cw, ch);
  return {
    /** `animation`-ийн `direction` чиглэлийн frame-ууд (0 = лавлагаа зураг) */
    frames(animation: string, direction: string): Img[] {
      const r = rows.find((x) => x.animation === animation && x.direction === direction);
      if (!r) throw new Error(`PixelLab: ${animation}/${direction} алга`);
      return Array.from({ length: r.frame_count }, (_, i) => cell(r.row, i));
    },
    rotation(direction: string): Img {
      const r = rows.find((x) => x.type === 'rotations');
      const i = r?.directions?.indexOf(direction) ?? -1;
      if (!r || i < 0) throw new Error(`PixelLab: rotation ${direction} алга`);
      return cell(r.row, i);
    },
  };
}

// ---------- sheet, tag, урьдчилсан харагдац ----------
export interface Frame {
  name: string;
  duration: number;
  img: Img;
}

/** Ижил хэмжээтэй frame-уудыг `cols` баганатай grid sheet болгоно. */
export function toSheet(frames: Frame[], cols: number): Img {
  const { w, h } = frames[0].img;
  const sheet = blank(cols * w, Math.ceil(frames.length / cols) * h);
  frames.forEach(({ img }, i) => {
    for (let y = 0; y < h; y++) sheet.d.set(img.d.subarray(y * w * 4, (y + 1) * w * 4), at(sheet, (i % cols) * w, Math.floor(i / cols) * h + y));
  });
  return sheet;
}

/** Aseprite-ийн tag: `from`–`to` frame, ping-pong эсвэл forward. */
export const tagOf =
  (frames: Frame[]) =>
  (from: string, to = from, direction = 'forward') => ({
    from: frames.findIndex((f) => f.name === from),
    to: frames.findIndex((f) => f.name === to),
    direction,
  });

export function scale(a: Img, k: number): Img {
  const o = blank(a.w * k, a.h * k);
  for (let y = 0; y < o.h; y++)
    for (let x = 0; x < o.w; x++) o.d.set(a.d.subarray(at(a, Math.floor(x / k), Math.floor(y / k)), at(a, Math.floor(x / k), Math.floor(y / k)) + 4), at(o, x, y));
  return o;
}

/** хэвтээ толин тусгал */
export function flipX(img: Img): Img {
  const o = blank(img.w, img.h);
  for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) o.d.set(img.d.subarray(at(img, x, y), at(img, x, y) + 4), at(o, img.w - 1 - x, y));
  return o;
}

/** `fr`-ийг дэвсгэр дээр alpha-тай давхарлана (`mirror` = толин тусгал). */
export function compose(bg: Img, front: Img, x0: number, y0: number, mirror = false): Img {
  const o = clone(bg);
  const fr = mirror ? flipX(front) : front;
  for (let y = 0; y < fr.h; y++)
    for (let x = 0; x < fr.w; x++) {
      const i = at(fr, x, y);
      const a = fr.d[i + 3] / 255;
      if (!a || !has(o, x0 + x, y0 + y)) continue;
      const j = at(o, x0 + x, y0 + y);
      for (let c = 0; c < 3; c++) o.d[j + c] = Math.round(fr.d[i + c] * a + o.d[j + c] * (1 - a));
    }
  return o;
}

/** Бүх frame 6×, хар ягаан дэвсгэр дээр (шалгахад). */
export function contact(sheet: Img): Img {
  const bg = blank(sheet.w, sheet.h);
  for (let y = 0; y < sheet.h; y++) for (let x = 0; x < sheet.w; x++) put(bg, x, y, (x + y) % 2 ? hex('#3b3f6b') : hex('#41467a'));
  return scale(compose(bg, sheet, 0, 0), 6);
}

/** Frame-уудыг нэг хүрээгээр тайрна: бүгдийн нийлбэр хүрээ + 1px (pivot хадгалагдана). */
export function trim(frames: Frame[]): { frames: Frame[]; dx: number; dy: number } {
  const [x0, y0, x1, y1] = bbox(frames.map((f) => f.img));
  const [dx, dy, w, h] = [x0 - 1, y0 - 1, x1 - x0 + 2, y1 - y0 + 2];
  return { frames: frames.map((f) => ({ ...f, img: crop(f.img, dx, dy, w, h) })), dx, dy };
}

/** AI-ээр томруулсан pixel зургийг жинхэнэ pixel хэмжээ рүү: нүд бүрийн голын хагасыг дундажилна (холилдсон ирмэгийг алгасна). */
export function depixelize(img: Img, w: number, h: number, top = 0): Img {
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
