/**
 * Хичээлийн дэлгэцийн баавгай ба дэвсгэр: урагшаа харсан баавгайн frame-ууд (bear_lesson.png, grid) + metadata
 * (mobile/src/lib/pixelBear/bear-lesson.json) + хичээлийн булан (lesson_bg.png).
 *
 * Баавгай: PixelLab (pixellab.ai) map_bear.png-ээс үүсгэсэн дүр ба хөдөлгөөнүүд, эх нь
 * docs/design/pixel-bear/pixellab/bear.png + .json (south: idle, think, cheer, sad). Энд зөвхөн тайрч, хугацаа,
 * tag өгнө. Дэвсгэр: 132×156 px (3×-ээр 396×468 dp) нил хана, нар жаргах цонх, хөшиг, номын тавиур, модон шал, хивс.
 *
 * Ажиллуулах:  npm run sprites:lesson && npm run sprites   (mobile/)
 * Шалгах:      node scripts/lesson-sprites.ts --preview <dir>
 */
import { writeFileSync } from 'node:fs';
import { blank, type Img, writeApng, writePng } from './png.ts';
import {
  BAYER,
  bbox,
  compose,
  contact,
  type Frame,
  hex,
  type P,
  pixellab,
  put,
  type RGB,
  ramp,
  SHADOW,
  SPRITES,
  scale,
  tagOf,
  toSheet,
  trim,
} from './sprite-kit.ts';

const META = new URL('../src/lib/pixelBear/bear-lesson.json', import.meta.url);
const COLS = 7;

// ---------- баавгай (урагшаа харсан, PixelLab) ----------
const bear = pixellab('bear');
const all: Frame[] = [];
const add = (prefix: string, imgs: Img[], ms: (i: number) => number) => imgs.forEach((img, i) => all.push({ name: `${prefix}${i}`, duration: ms(i), img }));
add('idle', bear.frames('idle', 'south'), () => 220); // амьсгал (ping-pong)
add('think', bear.frames('think', 'south'), () => 150); // эрүүгээ барих (ping-pong)
add('cheer', bear.frames('cheer', 'south'), (i) => (i >= 4 && i <= 6 ? 90 : 110)); // суугаад үсэрч, гараа дэлгэнэ
add('sad', bear.frames('sad', 'south'), (i, n = 8) => (i === n ? 700 : 130)); // цочиж, бөхийж гунигтай зогсоно
const { frames, dx, dy } = trim(all);
/** хөл газар хүрэх мөр ба биеийн голын багана (тайрсан frame дотор) */
const [bx0, , bx1, by1] = bbox([bear.rotation('south')]);
const FEET = by1 - dy;
const PIVOT = (bx0 + bx1) / 2 - dx;

// ---------- дэвсгэр: хичээлийн булан (132×156 px, 3×) ----------
const BW = 132;
const BH = 156;
const FLOOR = 112; // шалны дээд мөр
const RUG: P = [100, 134]; // баавгай зогсох хивсний төв (апп энд байрлуулна)

const lerp = (a: RGB, b: RGB, t: number): RGB => [0, 1, 2].map((i) => Math.round(a[i] + (b[i] - a[i]) * t)) as unknown as RGB;
/** босоо gradient: шатуудын хооронд Bayer dither */
function vgrad(img: Img, x0: number, y0: number, x1: number, y1: number, stops: RGB[]) {
  for (let y = y0; y < y1; y++) {
    const s = ((y - y0) / Math.max(1, y1 - y0 - 1)) * (stops.length - 1);
    const i = Math.min(stops.length - 2, Math.floor(s));
    for (let x = x0; x < x1; x++) put(img, x, y, s - i > BAYER[y & 3][x & 3] + 0.47 ? stops[i + 1] : stops[i]);
  }
}
function rect(img: Img, x0: number, y0: number, x1: number, y1: number, c: RGB) {
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) put(img, x, y, c);
}
function oval(img: Img, cx: number, cy: number, rx: number, ry: number, paint: (x: number, y: number, q: number) => RGB | null) {
  for (let y = Math.floor(cy - ry); y <= cy + ry; y++)
    for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
      const q = ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2;
      const c = q <= 1 ? paint(x, y, q) : null;
      if (c) put(img, x, y, c);
    }
}

function background(): Img {
  const img = blank(BW, BH);
  // хана: дээрээс доош гүн нил → ягаан-нил, ромбо хээтэй
  const WALL = ramp('#3b2a8f', '#4a37a6', '#5642b4', '#6450c2');
  vgrad(img, 0, 0, BW, FLOOR, WALL);
  for (let y = 6; y < FLOOR - 6; y += 10)
    for (let x = (y / 10) % 2 ? 4 : 9; x < BW; x += 10) {
      put(img, x, y, hex('#7462d2'));
      put(img, x - 1, y + 1, hex('#5e4bbd'));
      put(img, x + 1, y + 1, hex('#5e4bbd'));
      put(img, x, y + 2, hex('#7462d2'));
    }

  // цонх: нар жаргах тэнгэр, үүл, хөндлөн хүрээ, хөшиг
  const [wx0, wy0, wx1, wy1] = [12, 22, 54, 74];
  vgrad(img, wx0, wy0, wx1, wy1, ramp('#ff9bb3', '#ffb39a', '#ffd08a', '#ffe7a8'));
  oval(img, 40, 66, 9, 9, (_x, _y, q) => (q < 0.55 ? hex('#fff6c8') : hex('#ffe58a'))); // нар
  for (const [cx, cy, rx] of [[22, 36, 7], [29, 34, 6], [34, 37, 6], [44, 48, 5], [49, 47, 4]] as const)
    oval(img, cx, cy, rx, rx * 0.55, (_x, y) => (y > cy ? hex('#ffd9e2') : hex('#fff4f6')));
  const WOOD = ramp('#5a3420', '#7c4a2c', '#9a6038', '#b87a48');
  rect(img, wx0 - 3, wy0 - 3, wx1 + 3, wy0, WOOD[1]);
  rect(img, wx0 - 3, wy1, wx1 + 3, wy1 + 3, WOOD[1]);
  rect(img, wx0 - 3, wy0, wx0, wy1, WOOD[2]);
  rect(img, wx1, wy0, wx1 + 3, wy1, WOOD[0]);
  rect(img, wx0, Math.round((wy0 + wy1) / 2) - 1, wx1, Math.round((wy0 + wy1) / 2) + 1, WOOD[2]); // хөндлөн хүрээ
  rect(img, Math.round((wx0 + wx1) / 2) - 1, wy0, Math.round((wx0 + wx1) / 2) + 1, wy1, WOOD[2]);
  rect(img, wx0 - 5, wy1 + 3, wx1 + 5, wy1 + 5, WOOD[3]); // цонхны тавцан
  rect(img, wx0 - 5, wy1 + 5, wx1 + 5, wy1 + 6, WOOD[0]);
  const CURTAIN = ramp('#b8577f', '#dd7ea4', '#f4a6c6', '#ffd0e3');
  for (const [x0, x1, flip] of [[wx0 - 9, wx0 + 3, false], [wx1 - 3, wx1 + 9, true]] as const)
    for (let y = wy0 - 6; y < wy1 + 4; y++) {
      const sway = Math.round(Math.sin(y / 6) * 1.2 + ((y - wy0) / (wy1 - wy0)) * (flip ? -2 : 2));
      for (let x = x0; x < x1; x++) {
        const fold = (x - x0 + sway + 12) % 4; // эвхрээ: гэрэл → сүүдэр
        put(img, x + sway, y, CURTAIN[fold === 0 ? 0 : fold === 1 ? 1 : fold === 2 ? 2 : 3]);
      }
    }
  rect(img, wx0 - 11, wy0 - 8, wx1 + 11, wy0 - 6, WOOD[0]); // хөшгийн мод

  // номын тавиур (баавгайн толгойн дээр): ном, жижиг ургамал
  const [sx0, sx1, sy] = [80, 126, 46];
  const BOOKS: RGB[][] = [
    ramp('#2d1f7a', '#4b37b8'),
    ramp('#8fbf2a', '#d4f55e'),
    ramp('#b8577f', '#f2a6c8'),
    ramp('#c9b02e', '#f3f66c'),
    ramp('#2a7f86', '#5ec8c9'),
    ramp('#8a3a5c', '#c85f8c'),
  ];
  let bx = sx0 + 3;
  [12, 10, 13, 9, 11, 12, 10].forEach((h, i) => {
    const w = i === 3 ? 4 : 3;
    const [dark, light] = BOOKS[i % BOOKS.length];
    rect(img, bx, sy - h, bx + w, sy, dark);
    rect(img, bx, sy - h, bx + 1, sy, light); // гэрэлтэй ирмэг
    put(img, bx + 1, sy - h + 2, hex('#fff6c8')); // нурууны алтан зураас
    put(img, bx + 1, sy - 3, hex('#fff6c8'));
    bx += w + (i === 2 ? 2 : 0);
  });
  // хазайсан ном
  for (let i = 0; i < 10; i++) rect(img, bx + 1 + Math.floor(i / 3), sy - 1 - i, bx + 4 + Math.floor(i / 3), sy - i, i % 9 ? hex('#5ec8c9') : hex('#2a7f86'));
  // ургамал
  rect(img, sx1 - 12, sy - 6, sx1 - 4, sy, hex('#c9784a'));
  rect(img, sx1 - 12, sy - 6, sx1 - 10, sy, hex('#e39a63'));
  for (const [x, y, c] of [[-10, -8, '#3f9460'], [-8, -11, '#5aac6c'], [-6, -9, '#3f9460'], [-5, -13, '#7cc77e'], [-9, -13, '#5aac6c'], [-7, -14, '#7cc77e'], [-4, -10, '#2f7a4c']] as const)
    rect(img, sx1 + x, sy + y, sx1 + x + 2, sy + y + 2, hex(c));
  rect(img, sx0, sy, sx1, sy + 3, WOOD[3]);
  rect(img, sx0, sy + 3, sx1, sy + 4, WOOD[0]);
  for (const x of [sx0 + 4, sx1 - 5]) rect(img, x, sy + 4, x + 2, sy + 8, WOOD[1]); // тулгуур

  // шал: модон хавтан, доошоо бараан; дээд ирмэгт хана-шалны зааг
  const PLANK = ramp('#6e3f25', '#87502f', '#a2653b', '#bb7b48');
  vgrad(img, 0, FLOOR, BW, BH, [PLANK[3], PLANK[2], PLANK[1]]);
  rect(img, 0, FLOOR, BW, FLOOR + 2, hex('#2a1a5e')); // баганын сүүдэр
  rect(img, 0, FLOOR + 2, BW, FLOOR + 3, PLANK[0]);
  for (let y = FLOOR + 9, row = 0; y < BH; y += 9, row++) {
    rect(img, 0, y, BW, y + 1, PLANK[0]);
    for (let x = (row % 2) * 17 + 8; x < BW; x += 34) rect(img, x, y - 8, x + 1, y, PLANK[1]); // үе
  }
  // цонхны гэрэл шалан дээр (dither-тэй параллелограмм)
  for (let y = FLOOR + 3; y < BH; y++)
    for (let x = 0; x < BW; x++) {
      const t = (y - FLOOR) / (BH - FLOOR);
      const left = 4 + t * 26;
      const right = 46 + t * 34;
      if (x < left || x > right || (x + y) % 2) continue;
      put(img, x, y, lerp(PLANK[3], hex('#ffd9a8'), 0.55));
    }

  // хивс: баавгай зогсох газар (ягаан, нил хүрээ, судал)
  oval(img, RUG[0], RUG[1], 30, 8, (x, y, q) => {
    if (q > 0.86) return hex('#2d1f7a');
    if (q > 0.72) return hex('#f3f66c');
    return (x + Math.round((y - RUG[1]) * 2)) % 8 < 2 ? hex('#dd7ea4') : hex('#f4a6c6');
  });
  return img;
}

/** газрын сүүдэр: зууван, ирмэг нь dither, хагас тунгалаг (баавгай үсрэхэд апп жижигрүүлнэ) */
function shadow(): Img {
  const img = blank(36, 6);
  oval(img, 18, 3, 18, 3, (x, y, q) => (q > 0.6 && (x + y) % 2 ? null : SHADOW));
  for (let i = 3; i < img.d.length; i += 4) if (img.d[i]) img.d[i] = 105;
  return img;
}

// ---------- sheet + JSON ----------
const tag = tagOf(frames);
const tags = {
  idle: tag('idle0', 'idle3', 'pingpong'),
  think: tag('think0', 'think8', 'pingpong'),
  cheer: tag('cheer0', 'cheer10'),
  wave: tag('cheer7', 'cheer10'),
  oops: tag('sad0', 'sad8'),
};
const sheet = toSheet(frames, COLS);
const bg = background();

const preview = process.argv.indexOf('--preview');
if (preview < 0) {
  writePng(new URL('bear_lesson.png', SPRITES), sheet);
  writePng(new URL('lesson_bg.png', SPRITES), bg);
  writePng(new URL('lesson_shadow.png', SPRITES), shadow());
  const meta = {
    sheet: 'bear_lesson',
    frameSize: { w: frames[0].img.w, h: frames[0].img.h },
    columns: COLS,
    feet: FEET,
    pivot: PIVOT,
    background: { w: BW, h: BH, floor: FLOOR, rug: RUG },
    frames: frames.map(({ name, duration }) => ({ name, duration })),
    tags,
  };
  writeFileSync(META, `${JSON.stringify(meta, null, 2)}\n`);
  console.log(`bear_lesson: ${frames.length} frame, ${Object.keys(tags).length} tag; lesson_bg ${BW}×${BH}`);
} else {
  const dir = `${process.argv[preview + 1]}/`;
  writePng(`${dir}lesson_contact.png`, contact(sheet));
  // дэвсгэр дээр хивсний төвд зогсоосон APNG (3×, апп-тай ижил)
  const at0: P = [RUG[0] - Math.round(PIVOT), RUG[1] - FEET];
  const seq = (t: keyof typeof tags) => {
    const { from, to, direction } = tags[t];
    const f = Array.from({ length: to - from + 1 }, (_, i) => from + i);
    return direction === 'pingpong' ? [...f, ...f.slice(1, -1).reverse()] : f;
  };
  const shot = (ids: number[], name: string) =>
    writeApng(
      `${dir}${name}.png`,
      ids.map((i) => scale(compose(compose(bg, shadow(), RUG[0] - 18, RUG[1] - 2), frames[i].img, at0[0], at0[1]), 3)),
      ids.map((i) => frames[i].duration),
    );
  shot([...seq('idle'), ...seq('idle')], 'lesson_idle');
  shot([...seq('think'), ...seq('think')], 'lesson_think');
  shot([...seq('idle'), ...seq('cheer'), ...seq('wave'), ...seq('wave'), ...seq('idle')], 'lesson_correct');
  shot([...seq('idle'), ...seq('oops'), ...seq('idle')], 'lesson_wrong');
  writePng(`${dir}lesson_bg_3x.png`, scale(bg, 3));
  console.log(`preview: ${dir}`);
}
