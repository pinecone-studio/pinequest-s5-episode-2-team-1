/**
 * Боргоцойн дэлгэцийн (app/pinecones.tsx) модон лангууны давтагдах pixel tile-ууд:
 *   bg_planks   — арын хана: хэвтээ банз, wood.bg-ийн эргэн тойронд бага контрасттай (карт, текст давамгайлна)
 *   wood_boards — толгой ба тавиурын босоо банз
 *   wood_edge   — босоо банзны доод шүдлэг ирмэг (3 банз тутмын нэг нь урт унжина) + сүүдэр
 *   wall_bricks — дэлгүүрийн хэсгийн гарчгийн тоосгон хана ((tabs)/shop.tsx)
 * wood_boards ба wood_edge нэг өргөнтэй (6 банз) тул хэвтээ чиглэлд хамт давтагдана.
 *
 * Ажиллуулах:  node scripts/pinecone-bg.ts && npm run sprites   (mobile/)
 * Гаралт:      docs/design/pixel-bear/sprites/{bg_planks,wood_boards,wood_edge,wall_bricks}.png
 */
import { blank, type Img, writePng } from './png.ts';

const OUT = (name: string) => new URL(`../../docs/design/pixel-bear/sprites/${name}.png`, import.meta.url);
const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

// тогтмол seed: дахин ажиллуулахад ижил tile гарна
let s = 7;
const rnd = () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);
const pick = (n: number) => Math.floor(rnd() * n);

/** Хэвтээ ба босоо чиглэлд ороож тавина (tile залгаасгүй давтагдана). */
function painter(img: Img) {
  return (x: number, y: number, c: number[], a = 255) => {
    const i = ((((y % img.h) + img.h) % img.h) * img.w + (((x % img.w) + img.w) % img.w)) * 4;
    img.d.set([c[0], c[1], c[2], a], i);
  };
}

function planks() {
  const W = 128;
  const PLANK = 12;
  const ROWS = 8;
  const C = {
    a: hex('#FFB676'),
    b: hex('#FCAE6C'),
    light: hex('#FFC48F'),
    seam: hex('#D98E50'),
    grain: hex('#F2A363'),
    knot: hex('#E39A5A'),
    knotCore: hex('#CC8547'),
  };
  const img = blank(W, PLANK * ROWS);
  const put = painter(img);
  for (let r = 0; r < ROWS; r++) {
    const y0 = r * PLANK;
    const base = r % 2 ? C.b : C.a;
    for (let y = 0; y < PLANK; y++) for (let x = 0; x < W; x++) put(x, y0 + y, base);
    for (let x = 0; x < W; x++) {
      put(x, y0, C.light);
      put(x, y0 + PLANK - 1, C.seam);
    }
    // банзны үе: мөр бүрт өөр байрлалд босоо зураас
    const joint = pick(W);
    for (let y = 0; y < PLANK - 1; y++) put(joint, y0 + y, C.seam);
    put(joint + 1, y0 + 1, C.light);
    // модны ширхэг: богино хэвтээ зураасууд
    for (let k = 0; k < 3; k++) {
      const gx = pick(W);
      const gy = y0 + 2 + pick(PLANK - 4);
      const len = 5 + pick(9);
      for (let i = 0; i < len; i++) put(gx + i, gy, C.grain);
    }
  }
  for (let k = 0; k < 3; k++) {
    const kx = pick(W);
    const ky = pick(ROWS) * PLANK + 3;
    for (const [dx, dy] of [[0, 0], [1, 0], [2, 0], [-1, 1], [0, 1], [1, 1], [2, 1], [3, 1], [0, 2], [1, 2], [2, 2]]) put(kx + dx, ky + dy, C.knot);
    put(kx + 1, ky + 1, C.knotCore);
  }
  return img;
}

// босоо банз: wood.light / wood.dark ээлжилнэ
const BOARD = 8;
const BOARDS = 6;
const BW = BOARD * BOARDS;
const LIGHT = { base: hex('#C98A4E'), hi: hex('#D99C5E'), lo: hex('#B57A42'), grain: hex('#BB7E45') };
const DARK = { base: hex('#A8652F'), hi: hex('#B87339'), lo: hex('#935628'), grain: hex('#9A5B2B') };
const EDGE = hex('#3A2316');
const tone = (i: number) => (i % 2 ? DARK : LIGHT);

function boards() {
  const H = 48;
  const img = blank(BW, H);
  const put = painter(img);
  for (let i = 0; i < BOARDS; i++) {
    const t = tone(i);
    const x0 = i * BOARD;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < BOARD; x++) put(x0 + x, y, t.base);
      put(x0, y, t.hi);
      put(x0 + BOARD - 1, y, t.lo);
    }
    // ширхэг: богино босоо зураасууд
    for (let k = 0; k < 3; k++) {
      const gx = x0 + 2 + pick(BOARD - 4);
      const gy = pick(H);
      const len = 6 + pick(10);
      for (let j = 0; j < len; j++) put(gx, gy + j, t.grain);
    }
    // хадаас
    const ny = pick(H);
    put(x0 + 3, ny, EDGE);
    put(x0 + 4, ny, EDGE);
  }
  return img;
}

function edge() {
  const H = 7;
  const img = blank(BW, H);
  const put = painter(img);
  for (let i = 0; i < BOARDS; i++) {
    const t = tone(i);
    const x0 = i * BOARD;
    // 3 банз тутмын нэг нь урт унжина
    const len = i % 3 === 1 ? 4 : 1;
    for (let x = 0; x < BOARD; x++) {
      for (let y = 0; y < len; y++) put(x0 + x, y, t.base);
      put(x0 + x, len, EDGE);
      put(x0 + x, len + 1, EDGE, 70);
    }
    for (let y = 0; y < len; y++) {
      put(x0, y, t.hi);
      put(x0 + BOARD - 1, y, t.lo);
    }
  }
  return img;
}

// дэлгүүрийн хэсгийн (Онцлох, Эрэлттэй…) тоосгон хана: 12×5 тоосго, мөр бүр хагасаар шилжинэ
function bricks() {
  const BW_ = 12;
  const BH = 5;
  const COLS = 4;
  const ROWS_ = 4;
  const MORTAR = hex('#2A1A10');
  const TONES = ['#6B3F26', '#7E4B2C', '#8F5A34', '#5A3420', '#A06A3C'].map(hex);
  const img = blank(BW_ * COLS, BH * ROWS_);
  const put = painter(img);
  for (let r = 0; r < ROWS_; r++) {
    const y0 = r * BH;
    for (let x = 0; x < img.w; x++) put(x, y0 + BH - 1, MORTAR);
    for (let c = 0; c < COLS; c++) {
      const x0 = c * BW_ + (r % 2 ? BW_ / 2 : 0);
      const t = TONES[pick(TONES.length)];
      const hi = t.map((v) => Math.min(255, v + 24));
      for (let y = 0; y < BH - 1; y++) for (let x = 1; x < BW_; x++) put(x0 + x, y0 + y, y === 0 ? hi : t);
      for (let y = 0; y < BH - 1; y++) put(x0, y0 + y, MORTAR);
    }
  }
  return img;
}

for (const [name, img] of [['bg_planks', planks()], ['wood_boards', boards()], ['wood_edge', edge()], ['wall_bricks', bricks()]] as const) {
  writePng(OUT(name), img);
  console.log(`${name} ${img.w}x${img.h}`);
}
