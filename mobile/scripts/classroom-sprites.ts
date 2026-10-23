/**
 * Баавгайтай ярилцах дэлгэцийн анги (classroom.png) ба түүн рүү орох навчит хөшигний мөчрүүд + metadata
 * (mobile/src/lib/pixelBear/classroom.json).
 *
 * Эх нь PixelLab (docs/design/pixel-bear/pixellab/): classroom.png (анги: самбар, цонх, номын тавиур, модон шал),
 * branch-<төрөл>.png (зүүн захаасаа ургасан мөчир салхинд найгах frame-ууд, хэвтээ зурвас, frame бүр 200 px).
 * Самбар дээрх шохойн тоонуудыг арилгаж (апп самбар дээр баавгайн яриаг бичнэ), самбарын хамгийн том хоосон тэгш
 * өнцөгт ба шалны эхлэлийг JSON-д бичнэ. Мөчир бүрийг хэвтээ (branch_<төрөл>: зүүн/баруун захаас) ба 90° эргүүлсэн
 * (branch_<төрөл>_v: дээд/доод захаас) sheet болгоно: эргүүлэлт pixel-ийг гажуудуулахгүй.
 *
 * Ажиллуулах:  npm run sprites:classroom && npm run sprites   (mobile/)
 * Шалгах:      node scripts/classroom-sprites.ts --preview <dir>
 */
import { writeFileSync } from 'node:fs';
import { blank, type Img, readPng, writeApng, writePng } from './png.ts';
import { at, bbox, clone, contact, crop, type Frame, hex, scale, SPRITES, toSheet } from './sprite-kit.ts';

const PIXELLAB = new URL('../../docs/design/pixel-bear/pixellab/', import.meta.url);
const META = new URL('../src/lib/pixelBear/classroom.json', import.meta.url);
const BOARD = hex('#208444');
const SHADE = hex('#136430'); // самбар дээрх налуу гэрлийн сүүдэр
const SEED = [60, 110] as const; // самбарын дунд
const FLOOR_X = 60; // шалны эхлэлийг хайх багана
const BRANCH_W = 200; // PixelLab-ийн frame-ийн өргөн
const KINDS = ['leaf', 'blossom', 'pine'] as const;
const BRANCH_MS = 140;

const room = readPng(new URL('classroom.png', PIXELLAB));
const is = (img: Img, x: number, y: number, c: readonly number[]) => {
  const i = at(img, x, y);
  return img.d[i] === c[0] && img.d[i + 1] === c[1] && img.d[i + 2] === c[2];
};
const isBoard = (img: Img, x: number, y: number) => is(img, x, y, BOARD);
/** самбарын гадаргуу: үндсэн ногоон эсвэл түүний сүүдэр */
const isSlate = (img: Img, x: number, y: number) => isBoard(img, x, y) || is(img, x, y, SHADE);

/** `inside` нөхцөлтэй, (x, y)-ээс 4 чиглэлд холбогдсон pixel-ууд */
function flood(w: number, h: number, x: number, y: number, inside: (x: number, y: number) => boolean): Set<number> {
  const seen = new Set<number>([y * w + x]);
  const stack = [y * w + x];
  while (stack.length) {
    const p = stack.pop() as number;
    const [px, py] = [p % w, Math.floor(p / w)];
    for (const [nx, ny] of [[px + 1, py], [px - 1, py], [px, py + 1], [px, py - 1]])
      if (nx >= 0 && ny >= 0 && nx < w && ny < h && !seen.has(ny * w + nx) && inside(nx, ny)) {
        seen.add(ny * w + nx);
        stack.push(ny * w + nx);
      }
  }
  return seen;
}

// самбар: дунд цэгээс холбогдсон ногоон хэсгийн хүрээ
const board = flood(room.w, room.h, SEED[0], SEED[1], (x, y) => isBoard(room, x, y));
let [bx0, by0, bx1, by1] = [room.w, room.h, 0, 0];
for (const p of board) [bx0, by0, bx1, by1] = [Math.min(bx0, p % room.w), Math.min(by0, Math.floor(p / room.w)), Math.max(bx1, p % room.w), Math.max(by1, Math.floor(p / room.w))];

// шохойн зураас: самбарын хүрээнд, хүрээний захад хүрэхгүй самбар бус бүлэг (захад хүрдэг нь ургамал, арчуур);
// pixel бүрийг зүүн талын хамгийн ойр самбарын өнгөөр (үндсэн эсвэл сүүдэр) будна
const clean = clone(room);
const done = new Set<number>();
const inBox = (x: number, y: number) => x >= bx0 && x <= bx1 && y >= by0 && y <= by1;
for (let y = by0; y <= by1; y++)
  for (let x = bx0; x <= bx1; x++) {
    if (isSlate(room, x, y) || done.has(y * room.w + x)) continue;
    const blob = flood(room.w, room.h, x, y, (nx, ny) => inBox(nx, ny) && !isSlate(room, nx, ny));
    for (const p of blob) done.add(p);
    const edge = [...blob].some((p) => [bx0, bx1].includes(p % room.w) || [by0, by1].includes(Math.floor(p / room.w)));
    if (edge) continue;
    for (const p of blob) {
      let sx = p % room.w;
      while (sx > bx0 && !isSlate(room, sx, Math.floor(p / room.w))) sx--;
      clean.d.set(room.d.subarray(at(room, sx, Math.floor(p / room.w)), at(room, sx, Math.floor(p / room.w)) + 4), p * 4);
    }
  }

/** Самбарын гадаргуу дээрх хамгийн том тэгш өнцөгт (баавгайн яриаг бичих хэсэг): [x, y, w, h] */
function freeRect(): [number, number, number, number] {
  let best: [number, number, number, number] = [0, 0, 0, 0];
  const run = new Array(room.w).fill(0); // багана бүрд дээрээс үргэлжилсэн самбарын мөрийн тоо (histogram)
  for (let y = by0; y <= by1; y++) {
    for (let x = bx0; x <= bx1; x++) run[x] = isSlate(clean, x, y) ? run[x] + 1 : 0;
    for (let x = bx0; x <= bx1; x++) {
      let h = Infinity;
      for (let r = x; r <= bx1 && run[r]; r++) {
        h = Math.min(h, run[r]);
        if ((r - x + 1) * h > best[2] * best[3]) best = [x, y - h + 1, r - x + 1, h];
      }
    }
  }
  return best;
}
const free = freeRect();

// шал: доороос дээшээ, модон шалны (цэнхэр суваг бага) pixel үргэлжилсэн хамгийн дээд мөр; хана цайвар шар (b ≥ 160)
let floor = room.h;
while (floor > by1 && room.d[at(room, FLOOR_X, floor - 1) + 2] < 160) floor--;

// мөчир: хэвтээ зурвас → frame-ууд; бүх төрлийг нэг хэмжээгээр (нийт хоосон захыг) тайрна, үндэс нь зүүн захад
const strips = KINDS.map((k) => {
  const strip = readPng(new URL(`branch-${k}.png`, PIXELLAB));
  return Array.from({ length: strip.w / BRANCH_W }, (_, i) => crop(strip, i * BRANCH_W, 0, BRANCH_W, strip.h));
});
const [, y0, x1, y1] = bbox(strips.flat());
const FRAMES = Math.min(...strips.map((f) => f.length));
const branches = strips.map((imgs) => imgs.slice(0, FRAMES).map((img) => crop(img, 0, y0, x1, y1 - y0)));

/** 90° цагийн зүүний дагуу: зүүн зах (үндэс) → дээд зах */
function rotate(img: Img): Img {
  const o = blank(img.h, img.w);
  for (let y = 0; y < img.h; y++)
    for (let x = 0; x < img.w; x++) o.d.set(img.d.subarray(at(img, x, y), at(img, x, y) + 4), at(o, img.h - 1 - y, x));
  return o;
}
const COLS = { h: 2, v: 4 };
const frames = (imgs: Img[]): Frame[] => imgs.map((img, i) => ({ name: `sway${i}`, duration: BRANCH_MS, img }));

const preview = process.argv.indexOf('--preview');
if (preview < 0) {
  writePng(new URL('classroom.png', SPRITES), clean);
  KINDS.forEach((k, n) => {
    writePng(new URL(`branch_${k}.png`, SPRITES), toSheet(frames(branches[n]), COLS.h));
    writePng(new URL(`branch_${k}_v.png`, SPRITES), toSheet(frames(branches[n].map(rotate)), COLS.v));
  });
  const meta = {
    size: { w: room.w, h: room.h },
    /** баавгайн яриаг бичих самбарын хоосон хэсэг [x, y, w, h] */
    board: free,
    /** шалны дээд мөр: баавгай үүнээс доош зогсоно */
    floor,
    /** хэвтээ frame-ийн хэмжээ (босоо sheet-д w, h солигдоно), sheet-ийн баганын тоо */
    branch: { kinds: KINDS, frameSize: { w: x1, h: y1 - y0 }, columns: COLS, frames: FRAMES, duration: BRANCH_MS },
  };
  writeFileSync(META, `${JSON.stringify(meta, null, 2)}\n`);
  console.log(`classroom ${room.w}×${room.h}, самбар ${free.join(',')}, шал ${floor}; branch ${KINDS.join('/')} ${FRAMES} frame ${x1}×${y1 - y0}`);
} else {
  const dir = `${process.argv[preview + 1]}/`;
  const marked = clone(clean);
  const [fx, fy, fw, fh] = free;
  for (let x = fx; x < fx + fw; x++) for (const y of [fy, fy + fh - 1]) marked.d.set([255, 0, 255, 255], at(marked, x, y));
  for (let y = fy; y < fy + fh; y++) for (const x of [fx, fx + fw - 1]) marked.d.set([255, 0, 255, 255], at(marked, x, y));
  writePng(`${dir}classroom_board.png`, scale(marked, 3));
  KINDS.forEach((k, n) => {
    writePng(`${dir}branch_${k}_contact.png`, contact(toSheet(frames(branches[n]), COLS.h)));
    writePng(`${dir}branch_${k}_v_contact.png`, contact(toSheet(frames(branches[n].map(rotate)), COLS.v)));
    // найгах: 0 → сүүлч → 1 (ping-pong)
    const seq = [...branches[n], ...branches[n].slice(1, -1).reverse()];
    writeApng(`${dir}branch_${k}_sway.png`, seq.map((img) => scale(img, 3)), seq.map(() => BRANCH_MS));
  });
  console.log(`preview: ${dir}`);
}
