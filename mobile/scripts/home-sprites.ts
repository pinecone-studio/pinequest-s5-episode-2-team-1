/**
 * Нүүрний баавгайн амьд хөдөлгөөн: төлөв бүрд нэг мөр sheet (bear_home_<төлөв>.png) + metadata
 * (mobile/src/lib/pixelBear/bear-home.json: frame-ийн хэмжээ, анхны sprite-аас хэр шилжсэн, хугацаа, tag-ууд).
 *
 * Эх нь PixelLab animate_image (docs/design/pixel-bear/pixellab/home-<төлөв>.png, хэвтээ зурвас): анхны sprite-ийг
 * (docs/design/pixel-bear/sprites/<src>.png) хоосон захаас нь тайрч, хөдлөх зай (`pad`) үлдээгээд эхний frame болгон
 * өгсөн тул frame бүр тэр тайрсан хэмжээтэй. `in` нэг удаа (төлөв солигдоход), `loop` давтагдана.
 *
 * Ажиллуулах:  npm run sprites:home && npm run sprites   (mobile/)
 * Шалгах:      node scripts/home-sprites.ts --preview <dir>
 */
import { writeFileSync } from 'node:fs';
import { blank, type Img, readPng, writeApng, writePng } from './png.ts';
import { at, bbox, clone, crop, type Frame, scale, source, SPRITES, toSheet } from './sprite-kit.ts';

const PIXELLAB = new URL('../../docs/design/pixel-bear/pixellab/', import.meta.url);
const META = new URL('../src/lib/pixelBear/bear-home.json', import.meta.url);
const ITEMS_META = new URL('../src/lib/pixelBear/bear-items.json', import.meta.url);

/**
 * Өмсөх item-үүд: docs/design/pixel-bear/sprites/outfit_<id>.png (баавгай + item) -аас item-ийн давхаргыг салгана.
 * Шинэ item нэмэх: баавгайн sprite (bear_idle_scarf эсвэл ороолтгүй) дээр item-ээ зурж outfit_<id>.png болгоод энд
 * нэмнэ, бүх хөдөлгөөн дээр автоматаар өмсөгдөнө. `loose` = толгойг жинтэй дагах (малгай, чихэвч), үгүй бол хөдөлгөөнгүй
 * наалттай (нүдний шил).
 */
const ITEMS: Record<string, { loose: boolean }> = {
  glasses: { loose: false },
  gradcap: { loose: true },
  headphones: { loose: true },
};
/** bear_idle_scarf-ийн нээлттэй нүд (хөмсөгтэй нь): нүд анисан frame-д тавьж нээнэ */
const EYES = [
  [19, 37, 35, 56],
  [46, 37, 62, 56],
] as const;
/** item-ийн байрлалыг хэмжих толгой: bear_idle_scarf дээрх чих + нүүр (ороолтоос дээш) */
const HEAD = [6, 14, 76, 66] as const;
const CONTACT_SHADOW = [42, 20, 10, 80] as const; // item-ийн доорх үсэн дээрх зөөлөн сүүдэр

type Tag = [from: number, to: number, direction?: 'pingpong'];
interface State {
  /** анхны sprite (апп-д өмнө нь харагддаг байсан) */
  src: string;
  /** PixelLab-д өгөхдөө bbox-оос зүүн, дээд, баруун, доод тийш үлдээсэн зай */
  pad: [number, number, number, number];
  ms: number;
  /** зарим frame-д удаан зогсох (ms): амьсгалах завсар */
  hold?: Record<number, number>;
  in: Tag;
  loop: Tag;
  /**
   * Нүдийг хөдөлгөөнд тааруулах: `open` frame-уудад сэргэлэн баавгайн нээлттэй нүдийг (EYES) толгойд нь тааруулж тавина,
   * `blink` frame-ийн дараа анисан (эх) хувилбарыг нь нэг удаа оруулж ирмүүлнэ. `hold`, tag-ууд шинэ дарааллаар.
   */
  eyes?: { open: number[]; blink?: number };
  /** sheet-ийн баганын тоо (өгөөгүй бол нэг мөр); апп-д 3× харуулбал texture 4096 px-д багтаахын тулд */
  cols?: number;
}

const STATES: Record<string, State> = {
  // гэрэлтсэн: хоёр гараа өргөөд баярлан дэвхцэнэ
  thriving: { src: 'bear_cheer_scarf', pad: [2, 14, 2, 0], ms: 130, in: [0, 0], loop: [0, 4, 'pingpong'] },
  // хөнжлөө нөмрөөд нойрмоглоно: сэрүүн инээмсэглэл ↔ хөнжлөө татаж нойрмоглох
  sleep: { src: 'bear_sleep', pad: [1, 3, 1, 0], ms: 300, hold: { 0: 700, 4: 1400 }, in: [0, 0], loop: [0, 4, 'pingpong'] },
  // сэргэлэн: хэсэг зогсоод нүдээ ирмэж, инээмсэглэн гараараа даллана (даллах гарт баруун талд зай)
  happy: { src: 'bear_idle_scarf', pad: [4, 4, 16, 0], ms: 150, hold: { 0: 1800 }, in: [0, 0], loop: [0, 6] },
  // ядарсан: зүүрмэглэж зогсоод том эвшээж, сарвуугаараа амаа дарна
  tired: { src: 'bear_tired_scarf', pad: [4, 4, 4, 0], ms: 170, hold: { 0: 1600, 4: 500 }, in: [0, 0], loop: [0, 6] },
  // нээх дэлгэц (welcome, 3×): шинэ найзаа угтаж гараа дэлгээд өөрийгөө чанга тэвэрнэ
  // гараа дэлгэхдээ нүдээ нээж нэг ирмэнэ (0 → ирмэх → 2), тэврэхдээ баярлан анина (6 → 8)
  welcome: {
    src: 'bear_cheer_scarf',
    pad: [10, 14, 10, 0],
    ms: 140,
    hold: { 0: 600, 1: 110, 2: 500, 8: 1100 },
    eyes: { open: [0, 1, 2], blink: 0 },
    in: [0, 0],
    loop: [0, 8, 'pingpong'],
    cols: 4,
  },
  // хичээл хийгээгүй: хөмсгөө зангидаж гараа зөрүүлнэ → нүдээ аниад «хмф», хөлөө дэвсэнэ
  neglected: { src: 'bear_idle_scarf', pad: [4, 4, 4, 0], ms: 170, in: [0, 3], loop: [3, 6, 'pingpong'] },
};

const REF = source('bear_idle_scarf');
const sameAt = (a: Img, b: Img, i: number) => a.d[i] === b.d[i] && a.d[i + 1] === b.d[i + 1] && a.d[i + 2] === b.d[i + 2] && a.d[i + 3] === b.d[i + 3];
// ороолтгүй баавгай: шилтэй sprite-ийн шилийг малгайтай sprite-аас (тэнд нүүр нь хэвийн) нөхнө
const plain = clone(source('outfit_glasses'));
const capped = source('outfit_gradcap');
for (let i = 0; i < plain.d.length; i += 4) if (!sameAt(plain, capped, i) && sameAt(capped, REF, i)) plain.d.set(capped.d.subarray(i, i + 4), i);

/** item = outfit sprite-ийн ороолтгүй (эсвэл ороолттой) баавгайгаас ялгарах pixel-ууд + доор нь контакт сүүдэр */
function itemLayer(id: string): { img: Img; at: [number, number] } {
  const o = source(`outfit_${id}`);
  const differs = (base: Img) => Array.from({ length: o.w * o.h }, (_, p) => !sameAt(o, base, p * 4));
  const [a, b] = [differs(plain), differs(REF)];
  const mask = a.filter(Boolean).length <= b.filter(Boolean).length ? a : b;
  const layer = blank(o.w, o.h);
  mask.forEach((m, p) => m && layer.d.set(o.d.subarray(p * 4, p * 4 + 4), p * 4));
  for (let y = o.h - 2; y >= 0; y--)
    for (let x = 0; x < o.w; x++) {
      const below = (y + 1) * o.w + x;
      if (mask[y * o.w + x] && !mask[below] && plain.d[below * 4 + 3]) layer.d.set(CONTACT_SHADOW, below * 4);
    }
  const [x0, y0, x1, y1] = bbox([layer]);
  return { img: crop(layer, x0, y0, x1 - x0, y1 - y0), at: [x0 - HEAD[0], y0 - HEAD[1]] };
}

/** frame дээр толгой (HEAD) хаана байна: бүх байрлалаар тааруулж хамгийн бага зөрүүтэйг (зүүн дээд булан) */
const tpl = crop(REF, HEAD[0], HEAD[1], HEAD[2] - HEAD[0], HEAD[3] - HEAD[1]);
function headAt(img: Img): [number, number] {
  let best: [number, number, number] = [0, 0, Infinity];
  for (let y = 10 - tpl.h; y < img.h - 10; y++)
    for (let x = 10 - tpl.w; x < img.w - 10; x++) {
      let cost = 0;
      for (let ty = 0; ty < tpl.h && cost < best[2]; ty++)
        for (let tx = 0; tx < tpl.w; tx++) {
          const [fx, fy] = [x + tx, y + ty];
          const j = fx >= 0 && fy >= 0 && fx < img.w && fy < img.h ? at(img, fx, fy) : -1;
          for (let c = 0; c < 4; c++) cost += Math.abs(tpl.d[(ty * tpl.w + tx) * 4 + c] - (j < 0 ? 0 : img.d[j + c]));
        }
      if (cost < best[2]) best = [x, y, cost];
    }
  return [best[0], best[1]];
}

/** frame-ийн толгойд сэргэлэн баавгайн нээлттэй нүдийг тавина */
function withOpenEyes(img: Img): Img {
  const o = clone(img);
  const [hx, hy] = headAt(img);
  for (const [x0, y0, x1, y1] of EYES)
    for (let y = y0; y < y1; y++)
      for (let x = x0; x < x1; x++) {
        const [px, py] = [hx + x - HEAD[0], hy + y - HEAD[1]];
        if (px >= 0 && py >= 0 && px < o.w && py < o.h && REF.d[at(REF, x, y) + 3]) o.d.set(REF.d.subarray(at(REF, x, y), at(REF, x, y) + 4), at(o, px, py));
      }
  return o;
}

const items = Object.fromEntries(Object.keys(ITEMS).map((id) => [id, itemLayer(id)]));
const meta: Record<string, unknown> = {};
const sheets: Record<string, { frames: Frame[]; heads: [number, number][]; seq: number[] }> = {};
for (const [name, s] of Object.entries(STATES)) {
  const [x0, y0] = bbox([source(s.src)]);
  const strip = readPng(new URL(`home-${name}.png`, PIXELLAB));
  const [l, t] = s.pad;
  const w = bbox([source(s.src)])[2] - x0 + l + s.pad[2];
  let imgs = Array.from({ length: strip.w / w }, (_, i) => crop(strip, i * w, 0, w, strip.h));
  if (s.eyes) {
    const { open, blink } = s.eyes;
    const opened = imgs.map((img, i) => (open.includes(i) ? withOpenEyes(img) : img));
    imgs = opened.flatMap((img, i) => (i === blink ? [img, imgs[i], img] : [img]));
  }
  const frames: Frame[] = imgs.map((img, i) => ({ name: `${name}${i}`, duration: s.hold?.[i] ?? s.ms, img }));
  // PixelLab зургийн хүрээнээс гарсан хэсгийг тайрдаг: зүүн/баруун захад олон pixel хүрсэн frame = тасарсан гар,
  // `pad`-ийг томруулж дахин үүсгэ (shortcut: 8 хүртэл pixel = гарын хүрээ л хүрсэн, нүдэнд үл мэдэгдэнэ)
  frames.forEach(({ img }, i) => {
    for (const x of [0, img.w - 1]) {
      const touching = Array.from({ length: img.h }, (_, y) => img.d[at(img, x, y) + 3]).filter(Boolean).length;
      if (touching > 8) throw new Error(`${name}${i}: ${x ? 'баруун' : 'зүүн'} захад тасарсан (${touching} px)`);
    }
  });
  const heads = frames.map((f) => headAt(f.img));
  const tag = ([from, to, direction]: Tag) => ({ from, to, direction: direction ?? 'forward' });
  meta[name] = {
    frameSize: { w, h: strip.h },
    columns: s.cols ?? frames.length,
    /** frame-ийн зүүн дээд булан анхны sprite-ийн координатаар */
    offset: [x0 - l, y0 - t],
    /** frame бүрийн хугацаа ба толгойн (HEAD) зүүн дээд булан: item-ийг үүнд тааруулж өмсгөнө */
    frames: frames.map(({ name: n, duration }, i) => ({ name: n, duration, head: heads[i] })),
    tags: { in: tag(s.in), loop: tag(s.loop) },
  };
  const span = ([from, to, dir]: Tag) => {
    const f = Array.from({ length: to - from + 1 }, (_, i) => from + i);
    return dir === 'pingpong' ? [...f, ...f.slice(1, -1).reverse()] : f;
  };
  sheets[name] = { frames, heads, seq: [...span(s.in), ...span(s.loop), ...span(s.loop)] };
}

const preview = process.argv.indexOf('--preview');
if (preview < 0) {
  for (const [name, { frames }] of Object.entries(sheets)) writePng(new URL(`bear_home_${name}.png`, SPRITES), toSheet(frames, STATES[name].cols ?? frames.length));
  for (const [id, { img }] of Object.entries(items)) writePng(new URL(`item_${id}.png`, SPRITES), img);
  writeFileSync(META, `${JSON.stringify(meta, null, 2)}\n`);
  const itemMeta = Object.fromEntries(Object.entries(items).map(([id, { at: a }]) => [id, { at: a, loose: ITEMS[id].loose }]));
  writeFileSync(ITEMS_META, `${JSON.stringify(itemMeta, null, 2)}\n`);
  console.log(`bear_home: ${Object.entries(sheets).map(([n, { frames }]) => `${n} ${frames.length}`).join(', ')}`);
} else {
  const dir = `${process.argv[preview + 1]}/`;
  // item бүрийг бүх хөдөлгөөн дээр өмсгөж харуулна (апп-тай адил: loose бол өмнөх frame-тэй дундаж байрлал)
  for (const [name, { frames, heads, seq }] of Object.entries(sheets))
    for (const id of ['', ...Object.keys(items)]) {
      const shots = seq.map((i, n) => {
        const img = clone(frames[i].img);
        if (!id) return scale(img, 3);
        const head = heads[i];
        const prev = heads[seq[(n + seq.length - 1) % seq.length]];
        const [hx, hy] = ITEMS[id].loose ? [Math.round((head[0] + prev[0]) / 2), Math.round((head[1] + prev[1]) / 2)] : head;
        const it = items[id];
        for (let y = 0; y < it.img.h; y++)
          for (let x = 0; x < it.img.w; x++) {
            const [px, py] = [hx + it.at[0] + x, hy + it.at[1] + y];
            const k = at(it.img, x, y);
            const al = it.img.d[k + 3] / 255;
            if (!al || px < 0 || py < 0 || px >= img.w || py >= img.h) continue;
            const j = at(img, px, py);
            for (let c = 0; c < 3; c++) img.d[j + c] = Math.round(it.img.d[k + c] * al + img.d[j + c] * (1 - al));
            img.d[j + 3] = Math.max(img.d[j + 3], it.img.d[k + 3]);
          }
        return scale(img, 3);
      });
      writeApng(`${dir}home_${name}${id ? `_${id}` : ''}.png`, shots, seq.map((i) => frames[i].duration));
      if (id) writePng(`${dir}strip_${name}_${id}.png`, toSheet(shots.slice(0, frames.length).map((img) => ({ name: '', duration: 0, img })), frames.length));
    }
  console.log(`preview: ${dir}`);
}
