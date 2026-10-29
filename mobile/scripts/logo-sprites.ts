/**
 * Апп-ын лого ба icon: хүрэн баавгайн хөрөг (avatar_brown_happy_plain, 80×80) + гараар зурсан төгсөлтийн малгай,
 * нил ягаан дэвсгэр дээр (128×128 эх хэмжээ → бүхэл тоогоор томруулна).
 *
 * Ажиллуулах:  npm run sprites:logo   (mobile/)
 */
import { blank, type Img, writePng } from './png.ts';
import { at, compose, hex, put, type RGB, scale, source } from './sprite-kit.ts';

const OUT = new URL('../assets/images/', import.meta.url);
const N = 128;
const [CX, BEAR_Y] = [64, 48];

const BG = hex('#7A5CF5');
const RINGS: [number, RGB][] = [
  [58, hex('#8C73FF')],
  [44, hex('#9C86FF')],
];
const OUTLINE = hex('#0f0730');
const CAP = { top: hex('#4a36b8'), lit: hex('#6a55d8'), side: hex('#22106E'), dark: hex('#170a4d') };
const GOLD = { hi: hex('#fbfdb0'), mid: hex('#F3F66C'), lo: hex('#c8b830') };

function fill(img: Img, c: RGB) {
  for (let i = 0; i < img.w * img.h; i++) img.d.set([...c, 255], i * 4);
}

/** Төгсөлтийн малгай: дөрвөлжин хавтан (дээрээс харсан ромб) + толгойн тууз + алтан цацаг */
function cap(img: Img, cx: number, by: number) {
  const [hw, hh] = [25, 8];
  // тууз (хавтангийн доор, толгойд суусан хэсэг)
  for (let y = by + 8; y <= by + 19; y++) {
    const half = 15 - Math.max(0, y - (by + 17)) * 2;
    for (let x = cx - half; x <= cx + half; x++) {
      const edge = x === cx - half || x === cx + half || y === by + 19;
      put(img, x, y, edge ? OUTLINE : x < cx - half + 4 ? CAP.side : x > cx + half - 5 ? CAP.dark : CAP.side);
    }
  }
  // хавтангийн зузаан (урд талын 2px ирмэг)
  for (let x = cx - hw; x <= cx + hw; x++) {
    const y0 = by + hh + Math.round(hh * (1 - Math.abs(x - cx) / hw));
    put(img, x, y0, x < cx ? CAP.side : CAP.dark);
    put(img, x, y0 + 1, x < cx ? CAP.side : CAP.dark);
    put(img, x, y0 + 2, OUTLINE);
  }
  // хавтангийн дээд гадаргуу: ромб, зүүн дээд тал нь гэрэлтэй
  for (let y = by - 1; y <= by + 2 * hh + 1; y++)
    for (let x = cx - hw - 1; x <= cx + hw + 1; x++) {
      const d = Math.abs(x - cx) / hw + Math.abs(y - (by + hh)) / hh;
      if (d > 1.08) continue;
      put(img, x, y, d > 0.9 ? OUTLINE : x - cx + (y - by - hh) * 3 < -10 ? CAP.lit : CAP.top);
    }
  // цацаг: голын товчноос баруун булан руу, тэндээс доош унжина
  const [bx, byy] = [cx, by + hh];
  put(img, bx, byy, GOLD.hi);
  put(img, bx + 1, byy, GOLD.mid);
  put(img, bx, byy + 1, GOLD.lo);
  for (let x = bx + 2; x < cx + hw - 1; x++) put(img, x, byy + Math.round(((x - bx) / hw) * 2), GOLD.mid);
  const tx = cx + hw - 2;
  for (let y = byy + 2; y <= byy + 16; y++) {
    put(img, tx, y, GOLD.mid);
    put(img, tx + 1, y, GOLD.lo);
  }
  for (let y = byy + 17; y <= byy + 21; y++)
    for (let x = tx - 1; x <= tx + 2; x++) put(img, x, y, (x + y) % 2 ? GOLD.lo : GOLD.mid);
  for (let x = tx - 1; x <= tx + 2; x++) put(img, x, byy + 22, OUTLINE);
}

/** 4 салаатай гялбаа (r = цацрагийн урт) */
function sparkle(img: Img, x: number, y: number, r: number, c: RGB) {
  for (let i = -r; i <= r; i++) {
    put(img, x + i, y, c);
    put(img, x, y + i, c);
  }
  put(img, x, y, GOLD.hi);
}

/** Баавгай + малгай, тунгалаг дэвсгэр дээр */
function mark(): Img {
  const img = blank(N, N);
  const bear = source('avatar_brown_happy_plain');
  // compose нь хоосон pixel дээр зурдаггүй тул мөрөөр хуулна
  for (let y = 0; y < bear.h && BEAR_Y + y < N; y++) img.d.set(bear.d.subarray(at(bear, 0, y), at(bear, bear.w, y)), at(img, CX - 40, BEAR_Y + y));
  cap(img, CX, BEAR_Y - 8);
  return img;
}

function background(): Img {
  const img = blank(N, N);
  fill(img, BG);
  for (const [r, c] of RINGS)
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++) if ((x + 0.5 - CX) ** 2 + (y + 0.5 - 74) ** 2 <= r * r) put(img, x, y, c);
  sparkle(img, 22, 26, 3, GOLD.mid);
  sparkle(img, 106, 34, 2, GOLD.mid);
  sparkle(img, 16, 70, 2, hex('#D4F55E'));
  sparkle(img, 112, 80, 3, hex('#D4F55E'));
  return img;
}

/** alpha-тай pixel-ийг цагаан болгоно (Android monochrome) */
function silhouette(img: Img): Img {
  const o = blank(img.w, img.h);
  for (let i = 0; i < img.w * img.h; i++) if (img.d[i * 4 + 3]) o.d.set([255, 255, 255, 255], i * 4);
  return o;
}

/** тунгалаг биш хэсгийн хүрээгээр тайрна */
function trimmed(img: Img): Img {
  let [x0, y0, x1, y1] = [img.w, img.h, 0, 0];
  for (let y = 0; y < img.h; y++)
    for (let x = 0; x < img.w; x++)
      if (img.d[at(img, x, y) + 3]) [x0, y0, x1, y1] = [Math.min(x0, x), Math.min(y0, y), Math.max(x1, x + 1), Math.max(y1, y + 1)];
  const o = blank(x1 - x0, y1 - y0);
  for (let y = y0; y < y1; y++) o.d.set(img.d.subarray(at(img, x0, y), at(img, x1, y)), (y - y0) * o.w * 4);
  return o;
}

const fg = mark();
const bg = background();
const icon = compose(bg, fg, 0, 0);
writePng(new URL('icon.png', OUT), scale(icon, 8));
writePng(new URL('logo.png', OUT), scale(icon, 2));
writePng(new URL('android-icon-background.png', OUT), scale(bg, 4));
writePng(new URL('android-icon-foreground.png', OUT), scale(fg, 4));
writePng(new URL('android-icon-monochrome.png', OUT), scale(silhouette(fg), 4));
writePng(new URL('splash-icon.png', OUT), scale(trimmed(fg), 3));
writePng(new URL('favicon.png', OUT), icon);
console.log('logo: icon 1024, logo 256, android 512, splash, favicon');
