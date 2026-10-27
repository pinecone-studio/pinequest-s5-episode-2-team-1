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
const ITEMS: Record<string, { loose: boolean; layer?: string; at?: [number, number]; anchor?: 'hand' | 'feet'; behind?: boolean }> = {
  glasses: { loose: false },
  gradcap: { loose: true },
  headphones: { loose: true },
  warrior_helmet: { loose: false, layer: 'item_warrior_helmet', at: [-6, -14] },
  // Batman: маск, хувцас (нөмрөг, бүс, гутал) тусдаа давхарга; хувцас нь толгойг наалттай дагана
  batman_suit: { loose: false, layer: 'item_batman_suit', at: [-2, 52] },
  batman_mask: { loose: false, layer: 'item_batman_mask', at: [3, 0] },
  ny_cap: { loose: true, layer: 'item_ny_cap', at: [7, -13] },
  hiphop_chain: { loose: false, layer: 'item_hiphop_chain', at: [17, 57] },
  mickey_mask: { loose: false, layer: 'item_mickey_mask', at: [-4, -8] },
  pirate_hat: { loose: false, layer: 'item_pirate_hat', at: [-6, -18] },
  cowboy_hat: { loose: false, layer: 'item_cowboy_hat', at: [-3, -18] },
  white_headscarf: { loose: false, layer: 'item_white_headscarf', at: [-6, -14] },
  brown_boots: { loose: false, layer: 'item_brown_boots', at: [-6, -14], anchor: 'feet' },
  hard_hat: { loose: true, layer: 'item_hard_hat', at: [3, -19] },
  snorkel: { loose: false, layer: 'item_snorkel', at: [11, -4] },
  ribbon: { loose: false, layer: 'item_ribbon', at: [40, -4] },
  mongol_hat: { loose: true, layer: 'item_mongol_hat', at: [11, -11] },
  puss_hat: { loose: true, layer: 'item_puss_hat', at: [-6, -14] },
  puss_belt: { loose: false, layer: 'item_puss_belt', at: [15, 82] },
  // the cape hangs behind the bear: drawn only where the bear is not, and under it in the app
  puss_cape: { loose: false, layer: 'item_puss_cape', at: [-6, 54], behind: true },
  // deel layer is regenerated from deelBase on the idle bear
  mongol_deel: { loose: false, layer: 'item_mongol_deel', at: [-6, -14] },
};
/** хэд хэдэн item-ийг хамт өмсөх хувцасны карт (доороос дээш дарааллаар) */
const COMBOS: Record<string, string[]> = { batman: ['batman_suit', 'batman_mask'], mongol: ['mongol_deel', 'mongol_hat'], puss: ['puss_cape', 'brown_boots', 'puss_belt', 'puss_hat'] };
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
function heldPatch(base: Img, hand: [number, number], id: string, angle = 0, closed = false, pawOnly = false): Img {
  const out = blank(HELD.w, HELD.h);
  const item = pawOnly ? { at: [0, 0], img: blank(0, 0) } : items[id];
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
function heldFrame(name: string, frame: number, base: Img, id: string, pawOnly = false): Img {
  const hand = handAt(base, (id === 'bronze_shield' ? SHIELD_HANDS : HANDS)[name][frame]);
  const angle = name === 'happy' ? Math.min(10, Math.max(0, Math.round((94 - hand[1]) / 3))) : 0;
  return heldPatch(base, hand, id, angle, name === 'happy' && frame >= 3, pawOnly);
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

// Boots are the bear's own legs dressed in leather: in every frame the lower leg and foot keep their exact outline and
// shading but take the boots' leather ramp, under a turned-down cuff with a red trim. So they move as the legs move.
const BOOT_LEATHER = [[44, 22, 14], [84, 44, 28], [112, 62, 38], [140, 84, 52], [168, 110, 72]] as const;
const BOOT_RED = [[196, 52, 38], [138, 32, 24]] as const;
const BOOT = { height: 19, cuff: 6 } as const; // rows from the sole up; the cuff's rows from the boot top
function bootPixels(base: Img): Img {
  const out = blank(base.w, base.h);
  const [l, r] = [footAt(base, true), footAt(base, false)];
  const mid = Math.round((l[0] + r[0]) / 2);
  const solid = (x: number, y: number) => x >= 0 && y >= 0 && x < base.w && y < base.h && base.d[at(base, x, y) + 3] > 128;
  const lum = (i: number) => 0.3 * base.d[i] + 0.59 * base.d[i + 1] + 0.11 * base.d[i + 2];
  for (const [[cx, bottom], x0, x1, outer] of [[l, 0, mid, -1], [r, mid, base.w, 1]] as const) {
    const top = bottom - BOOT.height + 1;
    for (let y = top; y <= bottom; y++) {
      const k = y - top;
      const cuff = k < BOOT.cuff;
      let edgeX = -1;
      for (let x = x0; x < x1; x++) {
        if (!solid(x, y)) continue;
        const i = at(base, x, y);
        const rim = !solid(x - 1, y) || !solid(x + 1, y) || !solid(x, y + 1) || (k === 0);
        let c: readonly number[];
        if (cuff) c = k === 0 ? BOOT_LEATHER[0] : k === BOOT.cuff - 2 ? BOOT_RED[0] : k === BOOT.cuff - 1 ? BOOT_RED[1] : k === 1 ? BOOT_LEATHER[4] : (x - cx) % 5 === 0 ? BOOT_LEATHER[2] : BOOT_LEATHER[3];
        else if (rim || y === bottom) c = BOOT_LEATHER[0];
        else if (k === BOOT.cuff) c = BOOT_LEATHER[1]; // shadow under the cuff
        else {
          // the fur's shading, flattened: no toe pads show through, only a highlight across the top of the foot
          const step = [60, 100, 140, 185].findIndex((t) => lum(i) < t);
          const tone = Math.min(bottom - y < 6 ? 2 : 3, Math.max(1, step < 0 ? 3 : step));
          c = BOOT_LEATHER[bottom - y === 7 && Math.abs(x - cx - 3 * outer) < 4 ? 4 : tone];
          // slouchy wrinkles across the shaft, like the original boots
          if ((k === BOOT.cuff + 2 && (x + y) % 4 < 2) || (k === BOOT.cuff + 4 && (x + y) % 5 === 0)) c = BOOT_LEATHER[1];
        }
        if (cuff && rim && k > 0 && k < BOOT.cuff - 2) c = BOOT_LEATHER[0];
        out.d.set([...c, 255], at(out, x, y));
        if (outer < 0 ? edgeX < 0 : true) edgeX = outer < 0 ? (edgeX < 0 ? x : edgeX) : x;
      }
      // the folded cuff stands one pixel proud of the leg on the outer side
      if (cuff && edgeX >= 0) {
        const x = edgeX + outer;
        if (x >= 0 && x < base.w) out.d.set([...BOOT_LEATHER[0], 255], at(out, x, y));
        if (k > 0) out.d.set([...(k === BOOT.cuff - 2 ? BOOT_RED[0] : k === BOOT.cuff - 1 ? BOOT_RED[1] : BOOT_LEATHER[3]), 255], at(out, edgeX, y));
      }
    }
  }
  return out;
}
/** the boots as an overlay (fitted sheet): drawn over any base, helmet or headscarf included */
function fittedBootFrame(base: Img): Img {
  return bootPixels(base);
}
/** the base under the boots is the bear itself: the overlay covers its legs exactly */
function bootsBase(img: Img): Img {
  return clone(img);
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
/**
 * Batman хувцсыг frame бүрийн биед өмсгөнө: толгойноос (HEAD) доош баавгайн pixel бүрийг үсний гэрэлтэлтээр нь бараан
 * костюм болгож (гар, хөл хаашаа ч хөдөлсөн хувцастайгаа), цээжний сарьсан тэмдэг, бүсийг хувцасны зургаас биен дээр нь
 * тавина. Хувцасны зургийн гарыг ашиглахгүй (баавгайн гартай давхцаж 4 гартай харагдана); нөмрөгийг баавгайн ард зурна.
 */
const IDLE_BODY = (x: number, y: number) => x >= 0 && y >= 0 && x < REF.w && y < REF.h && REF.d[at(REF, x, y) + 3] > 0;
const CAPE = [30, 31, 37, 255] as const;
/** хувцасны зургийн (item_batman_suit) дотор: сарьсан тэмдэг, бүс (мөр), голын багана, гутал эхлэх мөр */
/** batman_bear зургийн костюмны өнгө (бараанаас), үсний гэрэлтэлтийн босго */
const SUIT_RAMP = [[10, 10, 13], [24, 25, 30], [40, 42, 48], [58, 60, 66], [78, 80, 87]] as const; // dark grey, not pitch black
/** the suit starts this many rows below the item's top: the collar sits on the neck, not the chin */
const NECK_DROP = 3;
const SUIT_RAMP_AT = [90, 145, 195, 235]; // бараан тал руу: костюм илүү хар
/** баавгайн ногоон ороолт, түүний алтан хээ/залаа (үс бор: r > g > b, цэнхэр нь их) */
const isScarf = (d: Uint8Array | Uint8ClampedArray, i: number) =>
  (d[i + 1] > d[i] && d[i + 1] > d[i + 2]) || (d[i] > 170 && d[i + 1] > 140 && d[i + 2] < 0.45 * d[i + 1]);
const SUIT_DETAIL = { rows: [[12, 29], [30, 39]], cols: [17, 57], boots: 58 } as const;
function batmanBase(img: Img, head: [number, number]): Img {
  const out = blank(img.w, img.h);
  const suit = items.batman_suit;
  const [sx, sy] = [head[0] + suit.at[0], head[1] + suit.at[1]];
  const suitPx = (u: number, v: number) =>
    u >= 0 && v >= 0 && u < suit.img.w && v < suit.img.h && suit.img.d[at(suit.img, u, v) + 3] > 0 ? at(suit.img, u, v) : -1;
  const lum = (d: Uint8Array | Uint8ClampedArray, i: number) => 0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2];
  const inHead = (x: number, y: number) => x >= head[0] && x < head[0] + HEAD[2] - HEAD[0] && y >= head[1] && y < sy + NECK_DROP;
  for (let y = 0; y < img.h; y++)
    for (let x = 0; x < img.w; x++) {
      const i = at(img, x, y);
      const [u, v] = [x - sx, y - sy];
      const s = suitPx(u, v);
      if (img.d[i + 3] === 0) {
        // нөмрөг: хувцасны зургийн бараан, баавгайн дүрсээс гадуурх хэсэг; гараа өргөхөд үлдсэн зай нөмрөгийн өнгөөр
        const [rx, ry] = [x - head[0] + HEAD[0], y - head[1] + HEAD[1]];
        if (s >= 0 && v >= NECK_DROP && (IDLE_BODY(rx, ry) || lum(suit.img.d, s) < 50)) out.d.set(IDLE_BODY(rx, ry) ? CAPE : suit.img.d.subarray(s, s + 4), i);
        continue;
      }
      if (inHead(x, y)) {
        // the neck above the collar: the scarf there turns into the fur right above it
        let j = i;
        if (y >= sy) for (let yy = y; yy >= sy - 4 && isScarf(img.d, j); yy--) j = at(img, x, yy - 1);
        out.d.set(img.d.subarray(isScarf(img.d, j) ? i : j, (isScarf(img.d, j) ? i : j) + 4), i);
        continue;
      }
      const detail = s >= 0 && u >= SUIT_DETAIL.cols[0] && u < SUIT_DETAIL.cols[1] && SUIT_DETAIL.rows.some(([r0, r1]) => v >= r0 && v < r1);
      if (detail) out.d.set([...[0, 1, 2].map((k) => Math.round(suit.img.d[s + k] * 0.85)), suit.img.d[s + 3]], i); // тэмдэг, бүс ч бараан
      else if (isScarf(img.d, i)) out.d.set([...SUIT_RAMP[1], img.d[i + 3]], i); // ороолт (ногоон, алтан хээ) харагдахгүй, хар захтай
      else {
        // зургийн костюмны өнгөнүүдээр (бараанаас цайвар): гар, хөл зурган дээрх шиг сүүдэртэй харагдана
        const step = SUIT_RAMP_AT.findIndex((t) => lum(img.d, i) < t);
        const tone = (step < 0 ? SUIT_RAMP.length : step) - (v >= SUIT_DETAIL.boots ? 1 : 0); // гутал нэг шат бараан
        out.d.set([...SUIT_RAMP[Math.max(0, Math.min(SUIT_RAMP.length - 1, tone))], img.d[i + 3]], i);
      }
    }
  return out;
}

/** the idle bear's body (REF rows/cols): collar rows, torso columns; and where its paws hang */
const BODY = { collar: [66, 72], torso: [22, 61] } as const;
const IDLE_HANDS: [number, number][] = [[68, 104], [14, 104]];

/** Mongolian deel: navy silk with cloud motifs, gold lapel/cuffs/sash; the scarf, paws and feet stay the bear's own */
const DEEL_BLUE = [[12, 16, 44], [22, 32, 84], [34, 50, 122], [50, 70, 156]] as const;
const DEEL_GOLD = [[150, 104, 30], [206, 156, 48], [240, 200, 92]] as const;
const DEEL = { sash: [95, 101], tails: [101, 119], hem: 129, flare: 4, skirt: [24, 59, 112], lapel: [[42, 71], [28, 85]], slit: 27 } as const;
/** small cloud swirls (REF), drawn one shade lighter */
const DEEL_CLOUDS: [number, number][] = [[30, 78], [50, 84], [26, 106], [48, 110], [36, 120], [54, 122], [12, 92], [68, 92]];
const CLOUD = ['.##.', '#..#', '.#.#'];
function deelBase(img: Img, head: [number, number], hands: [number, number][]): Img {
  const out = blank(img.w, img.h);
  const lum = (i: number) => 0.3 * img.d[i] + 0.59 * img.d[i + 1] + 0.11 * img.d[i + 2];
  const neck = head[1] + BODY.collar[0] - HEAD[1];
  const toRef = (x: number, y: number) => [x - head[0] + HEAD[0], y - head[1] + HEAD[1]];
  const cloud = (rx: number, ry: number) => DEEL_CLOUDS.some(([cx, cy]) => CLOUD[ry - cy]?.[rx - cx] === '#');
  const [[lx0, ly0], [lx1, ly1]] = DEEL.lapel;
  const onLapel = (rx: number, ry: number) => ry >= ly0 && ry <= ly1 && Math.abs(rx - (lx0 + ((lx1 - lx0) * (ry - ly0)) / (ly1 - ly0))) < 1;
  const sash = (rx: number, ry: number) =>
    (rx >= BODY.torso[0] && rx < BODY.torso[1] && ry >= DEEL.sash[0] && ry < DEEL.sash[1]) ||
    (ry >= DEEL.tails[0] && ((rx >= 27 && rx < 30 && ry < DEEL.tails[1]) || (rx >= 30 && rx < 33 && ry < DEEL.tails[1] - 4))); // two hanging tails
  // the deel starts below the scarf: per column its top scarf row, elsewhere the scarf's top
  const scarfTop: number[] = Array(img.w).fill(Infinity);
  for (let y = neck - 2; y < img.h; y++) for (let x = 0; x < img.w; x++) if (isScarf(img.d, at(img, x, y))) scarfTop[x] = Math.min(scarfTop[x], y);
  const gap = (rx: number, ry: number) => rx >= DEEL.skirt[0] && rx < DEEL.skirt[1] && ry >= DEEL.skirt[2] && ry < DEEL.hem;
  const edge = (x: number, y: number) =>
    [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => !img.d[at(img, x + dx, y + dy) + 3] && !gap(...(toRef(x + dx, y + dy) as [number, number])));
  const topRow = Math.min(...scarfTop);
  for (let y = 0; y < img.h; y++)
    for (let x = 0; x < img.w; x++) {
      const i = at(img, x, y);
      const [rx, ry] = toRef(x, y);
      if (!img.d[i + 3]) {
        // the skirt closes the gap between the legs
        if (gap(rx, ry)) out.d.set([...DEEL_BLUE[ry === DEEL.hem - 1 || rx === DEEL.skirt[0] || rx === DEEL.skirt[1] - 1 ? 0 : 2], 255], i);
        continue;
      }
      const inHeadBox = x >= head[0] && x < head[0] + HEAD[2] - HEAD[0] && y < neck;
      const d2 = Math.min(...hands.map(([hx, hy]) => (x - hx) ** 2 + (y - hy) ** 2));
      if (inHeadBox || y < Math.min(scarfTop[x], topRow + 2) || d2 <= 20 || ry >= DEEL.hem || isScarf(img.d, i)) { out.d.set(img.d.subarray(i, i + 4), i); continue; }
      const dark = lum(i) < 55;
      const step = [55, 95, 140].findIndex((t) => lum(i) < t);
      // the fur's belly and leg lines must not show through: flat cloth inside, outline only at the silhouette
      const skirt = ry >= DEEL.sash[1] && rx >= DEEL.skirt[0] && rx < DEEL.skirt[1];
      const shade = edge(x, y) ? 0 : skirt ? 2 : Math.max(1, Math.min(2, step < 0 ? 3 : step));
      let c: readonly number[];
      if (d2 <= 36) c = DEEL_GOLD[dark ? 0 : 2]; // cuff trim
      else if (sash(rx, ry)) c = DEEL_GOLD[dark ? 0 : Math.min(2, shade)];
      else if (onLapel(rx, ry) || (rx === DEEL.slit && ry >= DEEL.sash[1] && ry < DEEL.hem)) c = DEEL_GOLD[dark ? 0 : 1];
      else c = DEEL_BLUE[Math.min(3, shade + (cloud(rx, ry) ? 1 : 0))];
      out.d.set([...c, img.d[i + 3]], i);
    }
  // a loose deel: below the sash the skirt flares out past the body, widest at the hem
  const isDeel = (x: number, y: number) => {
    const j = at(out, x, y);
    return out.d[j + 3] > 0 && [...DEEL_BLUE, ...DEEL_GOLD].some((c) => c[0] === out.d[j] && c[1] === out.d[j + 1] && c[2] === out.d[j + 2]);
  };
  const mid = Math.round((DEEL.skirt[0] + DEEL.skirt[1]) / 2);
  for (let ry = DEEL.sash[1]; ry < DEEL.hem; ry++) {
    const y = ry - HEAD[1] + head[1];
    const toX = (rx: number) => rx - HEAD[0] + head[0];
    if (y < 0 || y >= out.h || !isDeel(toX(mid), y)) continue;
    const flare = Math.round((DEEL.flare * (ry - DEEL.sash[1] + 1)) / (DEEL.hem - DEEL.sash[1]));
    const hemRow = ry === DEEL.hem - 1;
    for (const [dir, side] of [[-1, BODY.torso[0]], [1, BODY.torso[1] - 1]]) {
      const line = toX(side + dir * flare);
      for (let x = toX(mid); dir < 0 ? x >= line : x <= line; x += dir) {
        if (x < 0 || x >= out.w) break;
        const j = at(out, x, y);
        if (out.d[j + 3] && !isDeel(x, y)) continue; // a paw in front of the skirt
        const old = out.d.subarray(j, j + 3);
        if (out.d[j + 3] && !(old[0] === DEEL_BLUE[0][0] && old[1] === DEEL_BLUE[0][1] && old[2] === DEEL_BLUE[0][2])) continue;
        out.d.set([...DEEL_BLUE[x === line || hemRow ? 0 : 2], 255], j);
      }
    }
  }
  return out;
}

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

/** item-ийн давхаргыг картын баавгайн толгойд тааруулж хольно */
function overlayItem(card: Img, id: string) {
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
      if (ITEMS[id].behind && card.d[j + 3]) continue;
      for (let c = 0; c < 3; c++) card.d[j + c] = Math.round(layer.img.d[i + c] * alpha + card.d[j + c] * (1 - alpha));
      card.d[j + 3] = Math.max(card.d[j + 3], layer.img.d[i + 3]);
    }
}

const preview = process.argv.indexOf('--preview');
if (preview < 0) {
  // Direct PixelLab overlays also produce the Shop card on the unchanged reference bear.
  for (const [id, def] of Object.entries(ITEMS)) {
    if (!def.layer) continue;
    if (id === 'mongol_deel') {
      writePng(new URL(`outfit_${id}.png`, SPRITES), deelBase(REF, [HEAD[0], HEAD[1]], IDLE_HANDS));
      continue;
    }
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
    overlayItem(card, id);
    writePng(new URL(`outfit_${id}.png`, SPRITES), card);
  }
  for (const [id, worn] of Object.entries(COMBOS)) {
    const card = worn.includes('mongol_deel') ? deelBase(REF, [HEAD[0], HEAD[1]], IDLE_HANDS) : worn.includes('brown_boots') ? bootsBase(REF) : clone(REF);
    for (const w of worn)
      if (w === 'brown_boots') overlay(card, fittedBootFrame(REF), 0, 0);
      else if (w !== 'mongol_deel') overlayItem(card, w);
    writePng(new URL(`outfit_${id}.png`, SPRITES), card);
  }
  for (const [name, { frames }] of Object.entries(sheets)) writePng(new URL(`bear_home_${name}.png`, SPRITES), toSheet(frames, STATES[name].cols ?? frames.length));
  for (const [name, { frames, heads }] of Object.entries(sheets)) {
    const fitted = frames.map((f, i) => ({ ...f, img: helmetBase(f.img, heads[i]) }));
    writePng(new URL(`bear_helmet_base_${name}.png`, SPRITES), toSheet(fitted, STATES[name].cols ?? frames.length));
    const suited = frames.map((f, i) => ({ ...f, img: batmanBase(f.img, heads[i]) }));
    writePng(new URL(`bear_batman_base_${name}.png`, SPRITES), toSheet(suited, STATES[name].cols ?? frames.length));
    const deel = frames.map((f, i) => ({ ...f, img: deelBase(f.img, heads[i], [handAt(f.img, HANDS[name][i]), handAt(f.img, SHIELD_HANDS[name][i])]) }));
    writePng(new URL(`bear_deel_base_${name}.png`, SPRITES), toSheet(deel, STATES[name].cols ?? frames.length));
    const scarfFree = frames.map((f, i) => ({ ...f, img: headscarfBase(f.img, heads[i]) }));
    writePng(new URL(`bear_headscarf_base_${name}.png`, SPRITES), toSheet(scarfFree, STATES[name].cols ?? frames.length));
    const shod = frames.map((f) => ({ ...f, img: bootsBase(f.img) }));
    writePng(new URL(`bear_boot_base_${name}.png`, SPRITES), toSheet(shod, STATES[name].cols ?? frames.length));
  }
  // deel layer = deel pixels of deelBase on the idle bear (head and paws stay the bear's own)
  const deelCard = deelBase(REF, [HEAD[0], HEAD[1]], IDLE_HANDS);
  items.mongol_deel.img = blank(REF.w, REF.h);
  for (let p = 0; p < REF.w * REF.h * 4; p += 4) if (!sameAt(deelCard, REF, p)) items.mongol_deel.img.d.set(deelCard.d.subarray(p, p + 4), p);
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
  // just the paw of every held frame: build-sprites recolours only these pixels for black/white fur, not the staff
  for (const [name, { frames }] of Object.entries(sheets))
    writePng(new URL(`held_paw_${name}.png`, SPRITES), toSheet(frames.map((f, i) => ({ ...f, img: heldFrame(name, i, f.img, 'staff00', true) })), STATES[name].cols ?? frames.length));
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
    ...(ITEMS[id].behind ? { behind: true } : {}),
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
