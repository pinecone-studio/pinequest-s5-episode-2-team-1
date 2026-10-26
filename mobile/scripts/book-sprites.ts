/**
 * Ачаалж байхад (баавгай бэлдэж байна) нээлттэй номын хуудас баруунаас зүүн тийш эргэх animation: 8 frame, 28×18.
 * Хуудас нурууг тойрон эргэхэд урдаас харахад өргөн нь cos(θ)-оор нарийсч, үзүүр нь sin(θ)-оор дээш өргөгдөнө;
 * босоо болох үедээ ирмэгээрээ харагдаж, ар тал нь арай бараан.
 *
 * Ажиллуулах:  npm run sprites:book && npm run sprites   (mobile/)
 * Шалгах:      node scripts/book-sprites.ts --preview <dir>
 */
import { blank, type Img, writePng } from './png.ts';
import { hex, put, type RGB, SPRITES, scale } from './sprite-kit.ts';

const W = 28;
const H = 18;
const SPINE = 13.5;
/** хуудасны өргөн (нуруунаас), дээд/доод мөр (нурууны дэргэд нэг мөр доор) */
const PAGE = 11;
const [TOP, BOTTOM] = [3, 14];

const C = {
  line: hex('#2a140a'),
  cover: [hex('#5a1f2b'), hex('#8e2f3a'), hex('#b8434b')] as RGB[],
  page: [hex('#d9c39a'), hex('#f1e2c0'), hex('#fff6e0')] as RGB[],
  back: [hex('#c9b083'), hex('#e3cfa5')] as RGB[],
  text: hex('#b9a98a'),
};

/** хуудас нуруу руугаа хотойж муруйна */
const dip = (x: number) => {
  const d = Math.abs(x + 0.5 - SPINE);
  return d < 1.5 ? 2 : d < 5 ? 1 : 0;
};
const topAt = (x: number) => TOP + dip(x);
const bottomAt = (x: number) => BOTTOM + dip(x);

function book(): Img {
  const img = blank(W, H);
  // хавтас: хуудаснаас 1 pixel илүү, доороо 2 мөр зузаан
  for (let x = 0; x < W; x++)
    for (let y = topAt(x) + 1; y <= bottomAt(x) + 3; y++) {
      const edge = x === 0 || x === W - 1 || y === bottomAt(x) + 3;
      put(img, x, y, edge ? C.line : y >= bottomAt(x) + 2 ? C.cover[0] : x < 2 || x > W - 3 ? C.cover[2] : C.cover[1]);
    }
  // хуудсын давхарга (доод ирмэгийн цайвар зураас) ба хоёр нүүр
  for (let x = 2; x < W - 2; x++) {
    put(img, x, bottomAt(x) + 1, C.page[0]);
    for (let y = topAt(x); y <= bottomAt(x); y++) {
      const nearSpine = Math.abs(x + 0.5 - SPINE) < 1.5;
      put(img, x, y, y === topAt(x) ? C.line : nearSpine ? C.page[0] : x === 2 || x === W - 3 ? C.page[1] : C.page[2]);
    }
  }
  // мөрүүд (бичиг)
  for (const y of [6, 8, 10, 12])
    for (const [x0, x1] of [
      [4, 11],
      [16, 23],
    ])
      for (let x = x0; x <= x1; x++) if ((x + y) % 7 !== 0) put(img, x, y, C.text);
  return img;
}

/** нурууг тойрон θ (0 = баруун талд хэвтээ, π = зүүн талд) өнцгөөр эргэж буй хуудас */
function flip(img: Img, theta: number) {
  const w = PAGE * Math.cos(theta);
  const lift = Math.round(4 * Math.sin(theta));
  const front = w > 0;
  const tip = SPINE + w;
  const [x0, x1] = [Math.floor(Math.min(SPINE, tip)), Math.ceil(Math.max(SPINE, tip)) - 1];
  if (Math.abs(w) < 1.2) {
    // ирмэгээрээ: нарийн босоо хуудас
    for (let y = TOP - lift; y <= BOTTOM; y++) put(img, 13, y, y === TOP - lift ? C.line : C.back[0]), put(img, 14, y, C.line);
    return;
  }
  // эргэж буй хуудасны доорх хуудсанд сүүдэр (нурууны дэргэд)
  const under = front ? 1 : -1;
  for (let i = 0; i < Math.min(5, Math.abs(w) * 0.5); i++) {
    const x = Math.round(SPINE - 0.5 + under * (i + 1));
    for (let y = topAt(x) + 1; y <= bottomAt(x); y++) put(img, x, y, C.page[i < 2 ? 0 : 1]);
  }
  for (let x = x0; x <= x1; x++) {
    const t = Math.abs(x + 0.5 - SPINE) / Math.abs(w); // 0 нуруу → 1 үзүүр
    const top = Math.round(TOP + 2 - t * (2 + lift));
    const bottom = Math.round(BOTTOM + 2 - t * (2 + lift));
    const outer = x === (front ? x1 : x0);
    for (let y = top; y <= bottom; y++) {
      const face = front ? (t > 0.7 ? C.page[1] : C.page[2]) : t > 0.7 ? C.back[0] : C.back[1];
      put(img, x, y, y === top ? C.line : y === bottom || outer ? (front ? C.page[0] : C.back[0]) : face);
    }
    // өргөн үедээ бичгийн мөр харагдана
    if (front && w > 8 && !outer && t > 0.15) for (const r of [3, 6, 9]) if ((x + r) % 7 !== 0 && top + r < bottom) put(img, x, top + r, C.text);
  }
}

const ANGLES = [0, 0.4, 0.85, 1.3, 1.62, 2.0, 2.45, 2.85];
const frames = ANGLES.map((a) => {
  const img = book();
  if (a > 0) flip(img, a);
  return img;
});
const sheet = blank(W * frames.length, H);
frames.forEach((f, i) => {
  for (let y = 0; y < H; y++) sheet.d.set(f.d.subarray(y * W * 4, (y + 1) * W * 4), (y * sheet.w + i * W) * 4);
});

const preview = process.argv.indexOf('--preview');
if (preview < 0) {
  writePng(new URL('fx_book_flip_sheet.png', SPRITES), sheet);
  console.log(`fx_book_flip_sheet: ${frames.length} frame ${W}×${H}`);
} else {
  writePng(`${process.argv[preview + 1]}/book_preview.png`, scale(sheet, 8));
  console.log(`preview: ${process.argv[preview + 1]}/book_preview.png`);
}
