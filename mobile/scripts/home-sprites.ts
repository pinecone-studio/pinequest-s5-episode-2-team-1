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
const STAFF_IDS = ['staff00', 'staff03', 'staff04', 'staff05', 'holly_staff', 'pestilence_staff', 'w_staff_256'] as const;
const HELD_IDS = [...STAFF_IDS, 'black_sword', 'bronze_shield'] as const;
const ITEMS: Record<string, { loose: boolean; layer?: string; at?: [number, number]; anchor?: 'hand' | 'feet' }> = {
  glasses: { loose: false },
  gradcap: { loose: true },
  headphones: { loose: true },
  warrior_helmet: { loose: false, layer: 'item_warrior_helmet', at: [-6, -14] },
  pirate_hat: { loose: false, layer: 'item_pirate_hat', at: [-6, -18] },
  cowboy_hat: { loose: false, layer: 'item_cowboy_hat', at: [-3, -18] },
  white_headscarf: { loose: false, layer: 'item_white_headscarf', at: [-6, -14] },
  brown_boots: { loose: false, layer: 'item_brown_boots', at: [-6, -14], anchor: 'feet' },
};
for (const id of STAFF_IDS) ITEMS[id] = { loose: false, layer: `item_${id}`, at: [-16, -54], anchor: 'hand' };
ITEMS.black_sword = { loose: false, layer: 'item_black_sword', at: [-12, -54], anchor: 'hand' };
ITEMS.bronze_shield = { loose: false, layer: 'item_bronze_shield', at: [-14, -19], anchor: 'hand' };

/** Staff grip points for each animation frame. In happy, use the paw that actually waves. */
const HANDS: Record<string, [number, number][]> = {
  thriving: [[10,67],[10,63],[9,62],[9,62],[10,66]],
  sleep: [[33,79],[33,79],[34,77],[35,75],[35,75]],
  happy: [[66,94],[66,94],[72,91],[74,69],[76,61],[74,70],[74,79]],
  tired: [[12,93],[12,93],[12,93],[12,93],[12,93],[12,93],[12,93]],
  welcome: [[13,67],[13,67],[13,67],[13,67],[13,67],[32,84],[40,84],[47,84],[47,84]],
  ouch: [[12,100],[12,100],[12,100],[13,61],[13,61],[13,61],[13,61]],
  neglected: [[12,95],[13,92],[23,88],[29,74],[30,77],[29,77],[32,76]],
};
/** Бамбай дэлгэцийн зүүн сарвууны кадр бүрийн хөдөлгөөнийг дагана. */
const SHIELD_HANDS: Record<string, [number, number][]> = {
  ...HANDS,
  happy: [[13,94],[12,94],[14,92],[12,92],[13,91],[12,92],[12,91]],
};

function handAt(img: Img, point: [number, number]): [number, number] {
  let nearest: [number, number] = point;
  let best = Infinity;
  for (let dy = -6; dy <= 6; dy++) for (let dx = -6; dx <= 6; dx++) {
    const x = point[0] + dx, y = point[1] + dy;
    if (x < 0 || y < 0 || x >= img.w || y >= img.h || img.d[at(img, x, y) + 3] < 128) continue;
    if (dx * dx + dy * dy < best) { best = dx * dx + dy * dy; nearest = [x, y]; }
  }
  if (!Number.isFinite(best)) throw new Error('Staff grip is outside paw silhouette');
  return nearest;
}
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
  /** PixelLab дээрээс орж ирсэн гадны зүйл (жишээ нь толгойг хурууддаг хүний гар) зурсан бол арилгана */
  noProp?: boolean;
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
  // 2–3 товшиход: цочоод «ёоё» гэнэ, толгойгоо хоёр сарвуугаараа бариад илнэ, дараа нь гараа аажуухан буулгаад
  // хэвийн зогсолтдоо (сэргэлэн баавгайн эхний frame) буцна: ping-pong 0 → 6 → 1, дараа нь 0 дээр зогсоно
  ouch: { src: 'bear_idle_scarf', pad: [4, 10, 4, 0], ms: 130, hold: { 4: 260, 5: 260, 6: 600 }, noProp: true, in: [0, 6, 'pingpong'], loop: [0, 0] },
  // хичээл хийгээгүй: хөмсгөө зангидаж гараа зөрүүлнэ → нүдээ аниад «хмф», хөлөө дэвсэнэ
  neglected: { src: 'bear_idle_scarf', pad: [4, 4, 4, 0], ms: 170, in: [0, 3], loop: [3, 6, 'pingpong'] },
};

const REF = source('bear_idle_scarf');
const PLAIN = source('bear_idle');
const sameAt = (a: Img, b: Img, i: number) => a.d[i] === b.d[i] && a.d[i + 1] === b.d[i + 1] && a.d[i + 2] === b.d[i + 2] && a.d[i + 3] === b.d[i + 3];
// ороолтгүй баавгай: шилтэй sprite-ийн шилийг малгайтай sprite-аас (тэнд нүүр нь хэвийн) нөхнө
const plain = clone(source('outfit_glasses'));
const capped = source('outfit_gradcap');
for (let i = 0; i < plain.d.length; i += 4) if (!sameAt(plain, capped, i) && sameAt(capped, REF, i)) plain.d.set(capped.d.subarray(i, i + 4), i);

/** item = outfit sprite-ийн ороолтгүй (эсвэл ороолттой) баавгайгаас ялгарах pixel-ууд + доор нь контакт сүүдэр */
function itemLayer(id: string): { img: Img; at: [number, number] } {
  const direct = ITEMS[id];
  if (direct.layer && direct.at) return { img: source(direct.layer), at: direct.at };
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

/**
 * Дээд захаас орж ирсэн гадны зүйлийг арилгана: дээд мөрнөөс эхлэн арьс (цайвар шаргал) ба цэнхэр (ханцуй) pixel-ээр
 * тархаж, түүний хүрээний бараан зураасыг хамт авна; ард нь далдлагдсан хэсгийг сэргэлэн баавгайн толгойгоор нөхнө.
 */
function withoutProp(img: Img): Img {
  const o = clone(img);
  const rgb = (x: number, y: number) => img.d.subarray(at(img, x, y), at(img, x, y) + 4);
  const prop = (x: number, y: number) => {
    const [r, g, b, a] = rgb(x, y);
    return a > 0 && ((r > 215 && g > 160 && b > 100) || b > r);
  };
  const seen = new Set<number>();
  const stack: [number, number][] = [];
  for (let x = 0; x < img.w; x++) if (prop(x, 0)) stack.push([x, 0]);
  while (stack.length) {
    const [x, y] = stack.pop() as [number, number];
    if (x < 0 || y < 0 || x >= img.w || y >= img.h || seen.has(y * img.w + x) || !prop(x, y)) continue;
    seen.add(y * img.w + x);
    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  if (!seen.size) return img;
  const gone = new Set(seen);
  for (const p of seen)
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) {
      const [x, y] = [(p % img.w) + dx, Math.floor(p / img.w) + dy];
      if (x >= 0 && y >= 0 && x < img.w && y < img.h && rgb(x, y)[3] && rgb(x, y)[0] < 90) gone.add(y * img.w + x);
    }
  const [hx, hy] = headAt(img);
  for (const p of gone) {
    const [x, y] = [p % img.w, Math.floor(p / img.w)];
    const [rx, ry] = [x - hx + HEAD[0], y - hy + HEAD[1]];
    const inRef = rx >= 0 && ry >= 0 && rx < REF.w && ry < REF.h && REF.d[at(REF, rx, ry) + 3];
    o.d.set(inRef ? REF.d.subarray(at(REF, rx, ry), at(REF, rx, ry) + 4) : [0, 0, 0, 0], p * 4);
  }
  // гарын хүрээнээс үлдсэн, биетэй холбогдоогүй жижиг арлууд
  const done = new Set<number>();
  for (let p = 0; p < o.w * o.h; p++) {
    if (done.has(p) || !o.d[p * 4 + 3]) continue;
    const blob: number[] = [];
    const st = [p];
    while (st.length) {
      const q = st.pop() as number;
      const [x, y] = [q % o.w, Math.floor(q / o.w)];
      if (done.has(q) || !o.d[q * 4 + 3]) continue;
      done.add(q);
      blob.push(q);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (x + dx >= 0 && y + dy >= 0 && x + dx < o.w && y + dy < o.h) st.push((y + dy) * o.w + x + dx);
    }
    if (blob.length < 20) for (const q of blob) o.d.set([0, 0, 0, 0], q * 4);
  }
  return o;
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

// A held frame contains BOTH the staff and its foreground fingers. Their grip
// cannot drift due to separate runtime transforms, scaling or animation clocks.
const GRIP = source('staff_grip'); // PixelLab edited closed fingers, pivot [8, 8]
const HELD = { w: 64, h: 112, pivot: [32, 60] as const };
function heldPatch(base: Img, hand: [number, number], id: string, angle = 0, closed = false): Img {
  const out = blank(HELD.w, HELD.h);
  const item = items[id];
  const theta = angle * Math.PI / 180;
  const cos = Math.cos(theta), sin = Math.sin(theta);
  for (let y = 0; y < out.h; y++) for (let x = 0; x < out.w; x++) {
    const dx = x - HELD.pivot[0], dy = y - HELD.pivot[1];
    const sx = Math.round(cos * dx + sin * dy - item.at[0]);
    const sy = Math.round(-sin * dx + cos * dy - item.at[1]);
    if (sx >= 0 && sy >= 0 && sx < item.img.w && sy < item.img.h)
      out.d.set(item.img.d.subarray(at(item.img, sx, sy), at(item.img, sx, sy) + 4), at(out, x, y));
  }
  if (id === 'bronze_shield') return out;
  for (let dy = -5; dy <= 5; dy++) for (let dx = -5; dx <= 5; dx++) {
    const x = hand[0] + dx, y = hand[1] + dy;
    if (x < 0 || y < 0 || x >= base.w || y >= base.h) continue;
    const b = at(base, x, y);
    if (!base.d[b + 3]) continue;
    const dst = at(out, HELD.pivot[0] + dx, HELD.pivot[1] + dy);
    out.d.set(base.d.subarray(b, b + 4), dst);
    if (closed) {
      const g = at(GRIP, dx + 8, dy + 8);
      if (GRIP.d[g + 3]) out.d.set(GRIP.d.subarray(g, g + 4), dst);
    }
  }
  return out;
}
function heldFrame(name: string, frame: number, base: Img, id: string): Img {
  const hand = handAt(base, (id === 'bronze_shield' ? SHIELD_HANDS : HANDS)[name][frame]);
  const angle = name === 'happy' ? Math.min(10, Math.max(0, Math.round((94 - hand[1]) / 3))) : 0;
  return heldPatch(base, hand, id, angle, name === 'happy' && frame >= 3);
}
function overlay(base: Img, layer: Img, ox: number, oy: number) {
  for (let y = 0; y < layer.h; y++) for (let x = 0; x < layer.w; x++) {
    const px = ox + x, py = oy + y;
    if (px < 0 || py < 0 || px >= base.w || py >= base.h) continue;
    const s = at(layer, x, y), d = at(base, px, py), a = layer.d[s + 3] / 255;
    if (!a) continue;
    for (let c = 0; c < 3; c++) base.d[d + c] = Math.round(layer.d[s + c] * a + base.d[d + c] * (1 - a));
    base.d[d + 3] = Math.max(base.d[d + 3], layer.d[s + 3]);
  }
}

function footAt(img: Img, left: boolean): [number, number] {
  const middle = Math.floor(img.w / 2);
  const from = left ? 0 : middle, to = left ? middle : img.w;
  let bottom = -1;
  for (let y = Math.floor(img.h * 0.65); y < img.h; y++) for (let x = from; x < to; x++)
    if (img.d[at(img, x, y) + 3] > 128) bottom = Math.max(bottom, y);
  if (bottom < 0) throw new Error('Bear foot not found');
  let min = to, max = from;
  for (let y = Math.max(0, bottom - 9); y <= bottom; y++) for (let x = from; x < to; x++)
    if (img.d[at(img, x, y) + 3] > 128) { min = Math.min(min, x); max = Math.max(max, x); }
  return [Math.round((min + max) / 2), bottom];
}

function fittedBootFrame(base: Img): Img {
  const out = blank(base.w, base.h);
  const boots = items.brown_boots.img;
  const left = crop(boots, 9, 108, 33, 32);
  const right = crop(boots, 42, 108, 35, 32);
  const [lx, ly] = footAt(base, true), [rx, ry] = footAt(base, false);
  overlay(out, left, lx - 19, ly - 31);
  overlay(out, right, rx - 16, ry - 31);
  return out;
}

function bootsBase(img: Img): Img {
  const out = clone(img);
  const boots = fittedBootFrame(img);
  for (const left of [true, false]) {
    const [cx, bottom] = footAt(img, left);
    // Зөвхөн тавхайн доод хэсгийн ил гарсан үсийг далдална; түрийн дээд талд шулуун тайралт үүсгэхгүй.
    for (let y = Math.max(0, bottom - 10); y <= bottom; y++) for (let x = Math.max(0, cx - 22); x <= Math.min(img.w - 1, cx + 22); x++) {
      const p = at(out, x, y);
      if (!boots.d[p + 3]) out.d.fill(0, p, p + 4);
    }
  }
  return out;
}

/** Алчууртай үед ногоон ороолтын өнгийг энгийн баавгайн үс/гэдсээр нөхнө. */
function headscarfBase(img: Img, head: [number, number]): Img {
  const out = clone(img);
  // Ногоон ороолтын хүрээ, алтлаг хээ, унжсан үзүүрийг бүхэлд нь нөхөх хэрэгтэй.
  for (let ry = 60; ry < 116; ry++) for (let rx = 16; rx < 67; rx++) {
    const x = head[0] + rx - HEAD[0], y = head[1] + ry - HEAD[1];
    if (x < 0 || y < 0 || x >= img.w || y >= img.h) continue;
    const p = at(PLAIN, rx, ry);
    if (PLAIN.d[p + 3]) out.d.set(PLAIN.d.subarray(p, p + 4), at(out, x, y));
  }
  // Алчуурын дээд завсарт цухуйдаг үсний шовх хэсгийг толгойн бор өнгөөр нөхнө.
  for (let ry = 19; ry < 29; ry++) for (let rx = 27; rx < 49; rx++) {
    const x = head[0] + rx - HEAD[0], y = head[1] + ry - HEAD[1];
    if (x < 0 || y < 0 || x >= img.w || y >= img.h) continue;
    if (!img.d[at(img, x, y) + 3]) continue;
    const sample = at(PLAIN, rx, 30);
    if (PLAIN.d[sample + 3]) out.d.set(PLAIN.d.subarray(sample, sample + 4), at(out, x, y));
  }
  for (let ry = 60; ry < 116; ry++) for (let rx = 8; rx < 75; rx++) {
    const x = head[0] + rx - HEAD[0], y = head[1] + ry - HEAD[1];
    if (x < 0 || y < 0 || x >= img.w || y >= img.h) continue;
    const i = at(out, x, y), [r, g, b] = out.d.subarray(i, i + 3);
    if (!(g > r * 1.55 && g > b * 1.25 && g > 55) && !(r > 175 && g > 120 && b < 105)) continue;
    const p = at(PLAIN, rx, ry);
    out.d.set(PLAIN.d.subarray(p, p + 4), i);
  }
  // Хацрын арын илүү үс алчуурын хоёр хажуугаас гарах ёсгүй; чихийг үлдээнэ.
  const cloth = items.white_headscarf;
  for (let ry = 35; ry < 71; ry++) {
    const iy = ry - HEAD[1] - cloth.at[1];
    let left = cloth.img.w, right = -1;
    for (let ix = 0; ix < cloth.img.w; ix++) {
      if (cloth.img.d[at(cloth.img, ix, iy) + 3]) { left = Math.min(left, ix); right = Math.max(right, ix); }
    }
    if (right < left) continue;
    for (let rx = 6; rx < 76; rx++) {
      const ix = rx - HEAD[0] - cloth.at[0];
      if (ix >= left && ix <= right) continue;
      const x = head[0] + rx - HEAD[0], y = head[1] + ry - HEAD[1];
      if (x >= 0 && y >= 0 && x < out.w && y < out.h) out.d.fill(0, at(out, x, y), at(out, x, y) + 4);
    }
  }
  return out;
}

/** Hide only head pixels protruding beyond the original helmet's outer contour.
 * The equipment PNG stays unchanged; the normal bear sheets remain untouched.
 */
function helmetBase(img: Img, head: [number, number]): Img {
  const out = clone(img);
  const helmet = items.warrior_helmet;
  for (let ry = HEAD[1]; ry < HEAD[3]; ry++) {
    const hy = ry - HEAD[1] - helmet.at[1];
    if (hy < 0 || hy >= helmet.img.h) continue;
    let left = helmet.img.w;
    let right = -1;
    for (let x = 0; x < helmet.img.w; x++)
      if (helmet.img.d[at(helmet.img, x, hy) + 3] > 32) {
        left = Math.min(left, x);
        right = Math.max(right, x);
      }
    if (right < left) continue;
    for (let rx = HEAD[0]; rx < HEAD[2]; rx++) {
      const hx = rx - HEAD[0] - helmet.at[0];
      if (hx >= left && hx <= right) continue;
      const x = head[0] + rx - HEAD[0];
      const y = head[1] + ry - HEAD[1];
      if (x >= 0 && x < out.w && y >= 0 && y < out.h) out.d.fill(0, at(out, x, y), at(out, x, y) + 4);
    }
  }
  return out;
}
const meta: Record<string, unknown> = {};
const sheets: Record<string, { frames: Frame[]; heads: [number, number][]; seq: number[] }> = {};
for (const [name, s] of Object.entries(STATES)) {
  const [x0, y0] = bbox([source(s.src)]);
  const strip = readPng(new URL(`home-${name}.png`, PIXELLAB));
  const [l, t] = s.pad;
  const w = bbox([source(s.src)])[2] - x0 + l + s.pad[2];
  let imgs = Array.from({ length: strip.w / w }, (_, i) => crop(strip, i * w, 0, w, strip.h));
  if (s.noProp) imgs = imgs.map(withoutProp);
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
    frames: frames.map(({ name: n, duration, img }, i) => ({
      name: n, duration, head: heads[i], hand: handAt(img, HANDS[name][i]),
      shieldHand: handAt(img, SHIELD_HANDS[name][i]),
    })),
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
  // Direct PixelLab overlays also produce the Shop card on the unchanged reference bear.
  for (const [id, def] of Object.entries(ITEMS)) {
    if (!def.layer) continue;
    const card = id === 'warrior_helmet' ? helmetBase(REF, [HEAD[0], HEAD[1]]) : id === 'white_headscarf' ? clone(PLAIN) : id === 'brown_boots' ? bootsBase(REF) : clone(REF);
    if (id === 'brown_boots') {
      overlay(card, fittedBootFrame(REF), 0, 0);
      writePng(new URL(`outfit_${id}.png`, SPRITES), card);
      continue;
    }
    if (def.anchor === 'hand') {
      const hand: [number, number] = id === 'bronze_shield' ? [14, 92] : [68, 104];
      overlay(card, heldPatch(REF, hand, id), hand[0] - HELD.pivot[0], hand[1] - HELD.pivot[1]);
      writePng(new URL(`outfit_${id}.png`, SPRITES), card);
      continue;
    }
    const layer = items[id];
    const pivot = [HEAD[0], HEAD[1]];
    const ox = pivot[0] + layer.at[0];
    const oy = pivot[1] + layer.at[1];
    for (let y = 0; y < layer.img.h; y++)
      for (let x = 0; x < layer.img.w; x++) {
        const [px, py] = [ox + x, oy + y];
        if (px < 0 || py < 0 || px >= card.w || py >= card.h) continue;
        const i = at(layer.img, x, y);
        const alpha = layer.img.d[i + 3] / 255;
        if (!alpha) continue;
        const j = at(card, px, py);
        for (let c = 0; c < 3; c++) card.d[j + c] = Math.round(layer.img.d[i + c] * alpha + card.d[j + c] * (1 - alpha));
        card.d[j + 3] = Math.max(card.d[j + 3], layer.img.d[i + 3]);
      }
    writePng(new URL(`outfit_${id}.png`, SPRITES), card);
  }
  for (const [name, { frames }] of Object.entries(sheets)) writePng(new URL(`bear_home_${name}.png`, SPRITES), toSheet(frames, STATES[name].cols ?? frames.length));
  for (const [name, { frames, heads }] of Object.entries(sheets)) {
    const fitted = frames.map((f, i) => ({ ...f, img: helmetBase(f.img, heads[i]) }));
    writePng(new URL(`bear_helmet_base_${name}.png`, SPRITES), toSheet(fitted, STATES[name].cols ?? frames.length));
    const scarfFree = frames.map((f, i) => ({ ...f, img: headscarfBase(f.img, heads[i]) }));
    writePng(new URL(`bear_headscarf_base_${name}.png`, SPRITES), toSheet(scarfFree, STATES[name].cols ?? frames.length));
    const shod = frames.map((f) => ({ ...f, img: bootsBase(f.img) }));
    writePng(new URL(`bear_boot_base_${name}.png`, SPRITES), toSheet(shod, STATES[name].cols ?? frames.length));
  }
  for (const [id, { img }] of Object.entries(items)) writePng(new URL(`item_${id}.png`, SPRITES), img);
  const heldSheets: Record<string, Record<string, string>> = {};
  for (const id of HELD_IDS) {
    heldSheets[id] = {};
    for (const [name, { frames }] of Object.entries(sheets)) {
      const cols = STATES[name].cols ?? frames.length;
      const scale = name === 'welcome' ? 3 : 2;
      const stem = `held_${id}_${name}`;
      const strip = toSheet(frames.map((f, i) => ({ ...f, img: heldFrame(name, i, f.img, id) })), cols);
      writePng(new URL(`${stem}.png`, SPRITES), strip);
      heldSheets[id][name] = `${stem}_${strip.w * scale}x${strip.h * scale}`;
    }
  }
  const fittedSheets: Record<string, string> = {};
  for (const [name, { frames }] of Object.entries(sheets)) {
    const cols = STATES[name].cols ?? frames.length;
    const factor = name === 'welcome' ? 3 : 2;
    const stem = `fitted_brown_boots_${name}`;
    const strip = toSheet(frames.map((f) => ({ ...f, img: fittedBootFrame(f.img) })), cols);
    writePng(new URL(`${stem}.png`, SPRITES), strip);
    fittedSheets[name] = `${stem}_${strip.w * factor}x${strip.h * factor}`;

  }
  writeFileSync(META, `${JSON.stringify(meta, null, 2)}\n`);
  const itemMeta = Object.fromEntries(Object.entries(items).map(([id, { at: a }]) => [id, {
    at: a, loose: ITEMS[id].loose,
    ...(ITEMS[id].anchor === 'hand' ? { anchor: 'hand', held: { at: HELD.pivot.map(v => -v), sheets: heldSheets[id] } } : {}),
    ...(ITEMS[id].anchor === 'feet' ? { anchor: 'feet', fitted: { sheets: fittedSheets } } : {}),
  }]));
  writeFileSync(ITEMS_META, `${JSON.stringify(itemMeta, null, 2)}\n`);
  console.log(`bear_home: ${Object.entries(sheets).map(([n, { frames }]) => `${n} ${frames.length}`).join(', ')}`);
} else {
  const dir = `${process.argv[preview + 1]}/`;
  // item бүрийг бүх хөдөлгөөн дээр өмсгөж харуулна (апп-тай адил: loose бол өмнөх frame-тэй дундаж байрлал)
  for (const [name, { frames, heads, seq }] of Object.entries(sheets))
    for (const id of ['', ...Object.keys(items)]) {
      const shots = seq.map((i, n) => {
        const img = id === 'warrior_helmet' ? helmetBase(frames[i].img, heads[i]) : id === 'white_headscarf' ? headscarfBase(frames[i].img, heads[i]) : id === 'brown_boots' ? bootsBase(frames[i].img) : clone(frames[i].img);
        if (!id) return scale(img, 3);
        const head = heads[i];
        const prev = heads[seq[(n + seq.length - 1) % seq.length]];
        if (ITEMS[id].anchor === 'feet') {
          overlay(img, fittedBootFrame(frames[i].img), 0, 0);
          return scale(img, 3);
        }
        const held = ITEMS[id].anchor === 'hand';
        const anchor = held ? handAt(frames[i].img, (id === 'bronze_shield' ? SHIELD_HANDS : HANDS)[name][i]) : head;
        if (held) {
          overlay(img, heldFrame(name, i, frames[i].img, id), anchor[0] - HELD.pivot[0], anchor[1] - HELD.pivot[1]);
          return scale(img, 3);
        }
        const [hx, hy] = ITEMS[id].loose ? [Math.round((head[0] + prev[0]) / 2), Math.round((head[1] + prev[1]) / 2)] : anchor;
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
        if (held) for (let y = hy - 4; y <= hy + 4; y++) for (let x = hx - 4; x <= hx + 4; x++) {
          if (x < 0 || y < 0 || x >= img.w || y >= img.h) continue;
          const j = at(img, x, y);
          img.d.set(frames[i].img.d.subarray(j, j + 4), j);
        }
        return scale(img, 3);
      });
      writeApng(`${dir}home_${name}${id ? `_${id}` : ''}.png`, shots, seq.map((i) => frames[i].duration));
      if (id) writePng(`${dir}strip_${name}_${id}.png`, toSheet(shots.slice(0, frames.length).map((img) => ({ name: '', duration: 0, img })), frames.length));
    }
  console.log(`preview: ${dir}`);
}
