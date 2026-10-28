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
const HELD_IDS = [...STAFF_IDS, 'black_sword', 'bronze_shield', 'wizard_wand', 'pirate_sword'] as const;
const ITEMS: Record<string, { loose: boolean; layer?: string; at?: [number, number]; anchor?: 'hand' | 'feet' | 'body'; behind?: boolean }> = {
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
  // a dot-art headband tied round the head: fitted to each frame's head (headbandPixels)
  headband: { loose: false, layer: 'item_headband', at: [-6, -14], anchor: 'body' },
  mongol_hat: { loose: true, layer: 'item_mongol_hat', at: [11, -11] },
  puss_hat: { loose: true, layer: 'item_puss_hat', at: [-6, -14] },
  puss_belt: { loose: false, layer: 'item_puss_belt', at: [15, 82] },
  // the cape hangs behind the bear: drawn only where the bear is not, and under it in the app
  puss_cape: { loose: false, layer: 'item_puss_cape', at: [-6, 54], behind: true },
  // deel layer is regenerated from deelBase on the idle bear
  mongol_deel: { loose: false, layer: 'item_mongol_deel', at: [-6, -14] },
  // sports wear: fitted overlays of the bear's own body (sportPixels), the layer is the idle bear's
  sport_hoodie: { loose: false, layer: 'item_sport_hoodie', at: [-6, -14], anchor: 'body' },
  pirate_shirt: { loose: false, layer: 'item_pirate_shirt', at: [-6, -14], anchor: 'body' },
  wizard_robe: { loose: false, layer: 'item_wizard_robe', at: [-6, -14], anchor: 'body' },
  demon_cape: { loose: false, layer: 'item_demon_cape', at: [-6, -14], anchor: 'body' },
  ninja_jacket: { loose: false, layer: 'item_ninja_jacket', at: [-6, -14], anchor: 'body' },
  ninja_pants: { loose: false, layer: 'item_ninja_pants', at: [-6, -14], anchor: 'body' },
  ninja_sandals: { loose: false, layer: 'item_ninja_sandals', at: [-6, -14], anchor: 'body' },
  ninja_headband: { loose: false, layer: 'item_ninja_headband', at: [-6, -14], anchor: 'body' },
  straw_shirt: { loose: false, layer: 'item_straw_shirt', at: [-6, -14], anchor: 'body' },
  straw_shorts: { loose: false, layer: 'item_straw_shorts', at: [-6, -14], anchor: 'body' },
  straw_sandals: { loose: false, layer: 'item_straw_sandals', at: [-6, -14], anchor: 'body' },
  // a straw hat with a red band, its brim wide over the ears (REF rows -4..37)
  straw_hat: { loose: false, layer: 'item_straw_hat', at: [-6, -18] },
  demon_boots: { loose: false, layer: 'item_demon_boots', at: [-6, -14], anchor: 'body' },
  // a demon's ram horns sweeping out over the ears (REF rows -4..39)
  demon_horns: { loose: false, layer: 'item_demon_horns', at: [-6, -18] },
  pirate_boots: { loose: false, layer: 'item_pirate_boots', at: [-6, -14], anchor: 'body' },
  // Mongolian boots: like the sports wear, a fitted overlay of the bear's feet (mongolBootPixels)
  mongol_boots: { loose: false, layer: 'item_mongol_boots', at: [-6, -14], anchor: 'body' },
  sport_shorts: { loose: false, layer: 'item_sport_shorts', at: [-6, -14], anchor: 'body' },
  sport_sneakers: { loose: false, layer: 'item_sport_sneakers', at: [-6, -14], anchor: 'body' },
};
/** хэд хэдэн item-ийг хамт өмсөх хувцасны карт (доороос дээш дарааллаар) */
const COMBOS: Record<string, string[]> = { batman: ['batman_suit', 'batman_mask'], mongol: ['mongol_deel', 'mongol_boots', 'mongol_hat'], puss: ['puss_cape', 'brown_boots', 'puss_belt', 'puss_hat'],
  sport: ['sport_sneakers', 'sport_shorts', 'sport_hoodie'],
  pirate: ['pirate_shirt', 'pirate_boots', 'pirate_hat', 'pirate_sword'], // the boots go over the trousers
  wizard: ['wizard_robe', 'glasses', 'wizard_wand'],
  hero: ['warrior_helmet', 'black_sword'],
  demon: ['demon_cape', 'demon_boots', 'demon_horns'],
  ninja: ['ninja_sandals', 'ninja_pants', 'ninja_jacket', 'ninja_headband'],
  strawhat: ['straw_sandals', 'straw_shorts', 'straw_shirt', 'straw_hat'] };
for (const id of STAFF_IDS) ITEMS[id] = { loose: false, layer: `item_${id}`, at: [-16, -54], anchor: 'hand' };
ITEMS.black_sword = { loose: false, layer: 'item_black_sword', at: [-12, -54], anchor: 'hand' };
// a wizard's wand with a sparkling tip, held like the sword (grip 12, 54)
ITEMS.wizard_wand = { loose: false, layer: 'item_wizard_wand', at: [-12, -54], anchor: 'hand' };
// a pirate's cutlass: a broad curved blade, a skull on the guard, a wooden knuckle bow (grip 12, 54)
ITEMS.pirate_sword = { loose: false, layer: 'item_pirate_sword', at: [-12, -54], anchor: 'hand' };
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

const PLAIN = source('bear_idle');
const REF = source('bear_idle_scarf');
const sameAt = (a: Img, b: Img, i: number) => a.d[i] === b.d[i] && a.d[i + 1] === b.d[i + 1] && a.d[i + 2] === b.d[i + 2] && a.d[i + 3] === b.d[i + 3];
// ороолтгүй баавгай: шилтэй sprite-ийн шилийг малгайтай sprite-аас (тэнд нүүр нь хэвийн) нөхнө
const plain = clone(source('outfit_glasses'));
const capped = source('outfit_gradcap');
for (let i = 0; i < plain.d.length; i += 4) if (!sameAt(plain, capped, i) && sameAt(capped, REF, i)) plain.d.set(capped.d.subarray(i, i + 4), i);

/** item = outfit sprite-ийн ороолтгүй (эсвэл ороолттой) баавгайгаас ялгарах pixel-ууд + доор нь контакт сүүдэр */
function itemLayer(id: string): { img: Img; at: [number, number] } {
  const direct = ITEMS[id];
  if (direct.anchor === 'body') return { img: blank(REF.w, REF.h), at: [-6, -14] }; // drawn once the poses are known
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

/**
 * Sports wear (black hoodie with neon stripes, shorts, sneakers): like the boots, each piece is the bear's own
 * body recoloured per frame and drawn as a fitted overlay, so the pieces stack and move with the arms and legs.
 * Rows are the idle bear's (REF): the hoodie runs from the scarf to its ribbed hem, the shorts below it, the
 * sneakers are measured up from each sole. Paws and head keep the fur.
 */
const SPORT_BLACK = [[12, 12, 16], [24, 25, 30], [38, 40, 46], [54, 56, 64]] as const;
const SPORT_GREEN = [[22, 150, 110], [44, 214, 156]] as const;
const SPORT_BLUE = [[34, 52, 168], [64, 96, 240]] as const;
const SPORT_PINK = [[150, 60, 170], [206, 96, 220]] as const;
const SPORT_WHITE = [[176, 178, 188], [236, 238, 244]] as const;
const SPORT = { neck: 66, collar: 2, hem: 108, waist: 104, arms: 110, crotch: 116, hips: [21, 62], shorts: 121, sneakers: 8, sleeve: 78 } as const;
const SPORT_IDS = ['sport_sneakers', 'sport_shorts', 'sport_hoodie'] as const;
/**
 * A pirate captain's clothes, cut the same way: a long black coat with gold braid and gold-edged cuffs, open on a laced
 * cream shirt and a buttoned brown vest, dark trousers to the ankle; tall black-brown boots with a buttoned cuff.
 */
const PIRATE_IDS = ['pirate_boots', 'pirate_shirt'] as const;
const PIRATE_SHIRT = [[120, 100, 78], [196, 180, 148], [226, 214, 186], [244, 236, 214]] as const;
const PIRATE_VEST = [[38, 24, 18], [70, 46, 32], [96, 64, 44], [120, 84, 58]] as const;
const PIRATE_GOLD = [[150, 108, 30], [214, 170, 60], [246, 214, 120]] as const;
const PIRATE_BOOT = [[20, 14, 12], [36, 26, 22], [52, 38, 30], [86, 60, 44], [156, 116, 82]] as const;
const PIRATE_PANTS = [[12, 12, 16], [36, 36, 44], [50, 50, 60], [68, 68, 80]] as const;
const COAT = [[6, 6, 8], [16, 15, 19], [26, 25, 31], [44, 42, 50]] as const;
/** the coat's front opening (half width), the vest's bottom, pocket flaps (rows, half widths), vest buttons, its hem */
const CAPT = { open: 10, vest: 107, pocket: [107, 110, 12, 18], buttons: [88, 93, 98, 103], flare: [100, 4], hem: 124 } as const;
const PIRATE = { boots: 15, cuff: 4, ankle: 9 } as const;
/**
 * A wizard's school robe: long and black with a red lining, open over a grey jumper, a red-and-gold crest; the bear
 * keeps its own scarf over it. It hangs loose down to the ankles.
 */
const WIZARD_IDS = ['wizard_robe'] as const;
const ROBE = [[8, 8, 12], [24, 24, 32], [38, 38, 48], [54, 54, 66]] as const;
const ROBE_RED = [[110, 18, 24], [156, 30, 36], [190, 48, 48]] as const;
const ROBE_GOLD = [[170, 120, 30], [226, 172, 44], [246, 206, 96]] as const;
const JUMPER = [[70, 72, 82], [104, 106, 116], [128, 130, 142]] as const;
const WIZ = { hem: 131, panel: 7, crest: [56, 84], flare: [92, 6] } as const; // the crest sits beside the scarf's hanging end
/**
 * A demon's wear: a black feathered mantle on the shoulders with a spiked steel necklace, a long ragged feather cape
 * behind the bear down to its heels; black boots with a teal sole and cuff and a flame on the front.
 */
const DEMON_IDS = ['demon_boots', 'demon_cape'] as const;
const FEATHER = [[8, 8, 12], [26, 26, 32], [44, 44, 54], [70, 70, 84]] as const;
const STEEL = [[44, 46, 54], [120, 126, 140], [196, 202, 214]] as const;
const DEMON_TEAL = [[16, 70, 72], [34, 150, 146], [96, 214, 200]] as const;
const FLAME = [[196, 58, 20], [242, 142, 34], [255, 216, 92]] as const;
/** the mantle's lowest row (REF, at the middle), the necklace's row, the cape's top row and hem, the boots' height */
const DEMON = { mantle: 81, chain: 71, cape: [70, 133], boots: 12 } as const;
/** A ninja: black-shouldered orange jacket with a zip and a white patch, orange trousers with a thigh wrap, grey sandals */
const NINJA_IDS = ['ninja_sandals', 'ninja_pants', 'ninja_jacket'] as const;
const NINJA_BLACK = [[10, 10, 14], [28, 28, 36], [44, 44, 56], [62, 62, 76]] as const;
const NINJA_ORANGE = [[150, 60, 10], [220, 100, 24], [246, 134, 40], [255, 170, 80]] as const;
const NINJA_GREY = [[52, 56, 66], [120, 126, 140], [170, 176, 188], [222, 226, 234]] as const;
/** the jacket's black shoulders end at `chest`; the sleeve's patch; the thigh wrap (REF rows, columns) */
const NINJA = { chest: 84, patch: [64, 80], wrap: [[114, 121], [21, 28]] } as const;
/** A straw-hat sailor: an open red short-sleeved shirt with a yellow sash, blue shorts with white cuffs, straw sandals */
const STRAW_IDS = ['straw_sandals', 'straw_shorts', 'straw_shirt'] as const;
const STRAW_RED = [[110, 16, 20], [178, 30, 34], [214, 48, 48], [236, 84, 76]] as const;
const STRAW_YELLOW = [[176, 120, 10], [242, 196, 34], [255, 230, 110]] as const;
const STRAW_BLUE = [[24, 44, 110], [46, 84, 170], [66, 110, 200], [96, 140, 220]] as const;
const STRAW_CUFF = [[176, 182, 196], [214, 220, 232], [244, 246, 250]] as const;
const SANDAL = [[70, 40, 20], [138, 92, 50], [190, 146, 90]] as const;
/** the shirt's open front (half width), its buttons, the sash, the shorts' cuffs and hem (REF rows) */
const STRAW = { open: 9, buttons: [80, 87, 94], sash: [104, 109], knot: [50, 10], cuff: 121, hem: 124, shoulders: [[22, 72], [61, 72]], sleeve: 12 } as const;
type SportId = (typeof SPORT_IDS)[number] | (typeof PIRATE_IDS)[number] | (typeof WIZARD_IDS)[number] | (typeof DEMON_IDS)[number] | (typeof NINJA_IDS)[number] | (typeof STRAW_IDS)[number];
function sportPixels(id: SportId, img: Img, head: [number, number], hands: [number, number][], sleeping: boolean): Img {
  const out = blank(img.w, img.h);
  // asleep, the bear is under its green blanket from the first row that is mostly blanket: only the hoodie shows, above it
  let blanket = img.h;
  if (sleeping) {
    for (let y = head[1] + SPORT.neck - HEAD[1] + 10; y < img.h && blanket === img.h; y++) {
      let green = 0;
      for (let x = 0; x < img.w; x++) if (img.d[at(img, x, y) + 3] && img.d[at(img, x, y) + 1] > img.d[at(img, x, y)]) green++;
      if (green >= 12) blanket = y;
    }
    if (!['sport_hoodie', 'pirate_shirt', 'wizard_robe', 'demon_cape', 'ninja_jacket', 'straw_shirt'].includes(id)) return out;
  }
  const solid = (x: number, y: number) => x >= 0 && y >= 0 && x < img.w && y < Math.min(img.h, blanket) && img.d[at(img, x, y) + 3] > 128;
  const lum = (i: number) => 0.3 * img.d[i] + 0.59 * img.d[i + 1] + 0.11 * img.d[i + 2];
  const toRef = (x: number, y: number): [number, number] => [x - head[0] + HEAD[0], y - head[1] + HEAD[1]];
  const rim = (x: number, y: number) => !solid(x - 1, y) || !solid(x + 1, y) || !solid(x, y - 1) || !solid(x, y + 1);
  // cloth over the fur: the fur's light and shade, flattened to three tones and outlined at the silhouette; `flat` cloth
  // keeps only the lines where an arm meets the body (no belly or scarf showing through)
  const cloth = (x: number, y: number, ramp: readonly (readonly number[])[], flat = false) => {
    if (rim(x, y)) return ramp[0];
    const step = [70, 120].findIndex((t) => lum(at(img, x, y)) < t);
    if (!flat) return ramp[step < 0 ? 3 : step + 1];
    const rx = x - head[0] + HEAD[0];
    return ramp[step === 0 && (rx < BODY.torso[0] + 4 || rx > BODY.torso[1] - 4) ? 1 : 2];
  };
  const put = (x: number, y: number, c: readonly number[]) => out.d.set([...c, 255], at(out, x, y));
  const paw = (x: number, y: number, r2: number) => hands.some(([hx, hy]) => (x - hx) ** 2 + (y - hy) ** 2 <= r2);
  // the idle bear's head (dilated) above the neck: everything else up there is a raised arm
  // per column, the idle bear's first scarf row (none: no collar to lower there)
  const scarfTop = Array.from({ length: REF.w }, (_, x) => {
    for (let y = SPORT.neck - 2; y < SPORT.neck + 12; y++) if (REF.d[at(REF, x, y) + 3] && isScarf(REF.d, at(REF, x, y))) return y;
    return -Infinity;
  });
  // the wizard's robe at one pixel: a grey jumper down the open front, the red lining, the crest
  const wizardRobe = (x: number, y: number, rx: number, ry: number): readonly number[] => {
    const i = at(img, x, y);
    const edge = rim(x, y);
    if (edge || ry === WIZ.hem) return ROBE[0];
    if (paw(x, y, 52)) return ROBE[(x + y) % 3 ? 1 : 0]; // the wide sleeve's cuff
    const d = Math.abs(rx - 41);
    if (ry >= SPORT.neck + 8 && ry < SPORT.hem && d < WIZ.panel) return JUMPER[ry === SPORT.hem - 1 ? 0 : lum(i) < 70 ? 1 : 2];
    if (ry >= SPORT.neck + 8 && d === WIZ.panel) return ROBE_RED[1]; // the red lining at the opening
    const [cx, cy] = WIZ.crest;
    const [u, v] = [rx - cx, ry - cy];
    const crest = v >= 0 && v <= 5 && u >= Math.max(0, v - 3) && u <= 4 - Math.max(0, v - 3);
    if (crest) {
      const rimC = v === 0 || u === Math.max(0, v - 3) || u === 4 - Math.max(0, v - 3);
      return rimC ? ROBE_GOLD[1] : u === 2 && v === 2 ? ROBE_GOLD[2] : ROBE_RED[1];
    }
    return cloth(x, y, ROBE, true);
  };
  // the captain's coat at one pixel: black sleeves with gold-edged cuffs and the shirt's ruffle at the wrist; the coat
  // open down the front on a laced cream shirt and a buttoned brown vest, dark trousers below it
  const pirateShirt = (x: number, y: number, rx: number, ry: number, collarTop: number): readonly number[] => {
    const edge = rim(x, y);
    const d = Math.abs(rx - 41);
    const sleeve = rx < BODY.torso[0] + 1 || rx > BODY.torso[1] - 2 || ry < SPORT.neck;
    if (sleeve) {
      if (paw(x, y, 52)) return edge ? PIRATE_SHIRT[0] : PIRATE_SHIRT[(x + y) % 2 ? 2 : 3];
      if (paw(x, y, 104)) return edge ? COAT[0] : paw(x, y, 64) || !paw(x, y, 88) ? PIRATE_GOLD[1] : COAT[3];
      return cloth(x, y, COAT);
    }
    const top = SPORT.neck + SPORT.collar;
    if (ry <= collarTop + 1 && d <= CAPT.open + 2) return PIRATE_SHIRT[ry === collarTop || edge ? 1 : 3]; // the shirt's collar
    if (d === CAPT.open) return PIRATE_GOLD[edge ? 0 : 1]; // gold braid down the coat's front edges
    if (d > CAPT.open) {
      const [p0, p1, q0, q1] = CAPT.pocket;
      if (ry >= p0 && ry <= p1 && d >= q0 && d <= q1) return ry === p0 || ry === p1 || d === q0 || d === q1 ? PIRATE_GOLD[1] : COAT[2];
      return cloth(x, y, COAT, true);
    }
    const vest = CAPT.vest + (d < 3 ? 1 : 0); // the vest's pointed bottom
    if (ry > vest) return cloth(x, y, PIRATE_PANTS, true);
    const shirt = Math.max(0, 8 - Math.floor((ry - top) / 3)); // the shirt shows in a V that closes on the chest
    if (d < shirt) {
      if (d === 0) return PIRATE_SHIRT[0];
      if (ry >= top + 3 && ry <= top + 12 && d === [2, 1, 0, 1][(ry - top) % 4]) return PIRATE_VEST[0]; // the lacing
      return PIRATE_SHIRT[d === shirt - 1 ? 1 : 2];
    }
    if (d <= 1 && CAPT.buttons.some((b) => ry === b || ry === b + 1)) return PIRATE_GOLD[CAPT.buttons.includes(ry) ? (d ? 1 : 2) : 0];
    if ((d === shirt && shirt > 0) || ry === vest || edge) return PIRATE_VEST[0];
    return PIRATE_VEST[2];
  };
  // where the scarf (its outline, gold fringe and pale hem line too) shows on bare fur, the scarfless bear's fur instead
  const nearScarf = (u: number, v: number, r: number) => {
    for (let dy = -r; dy <= 0; dy++) for (let dx = -1; dx <= 1; dx++) if (solid(u + dx, v + dy) && isScarf(img.d, at(img, u + dx, v + dy))) return lum(at(img, u, v)) < 70 || r > 1;
    return false;
  };
  const rgb = (u: number, v: number) => img.d.subarray(at(img, u, v), at(img, u, v) + 3);
  const gold = (u: number, v: number) => rgb(u, v)[0] > 175 && rgb(u, v)[1] > 120 && rgb(u, v)[2] < 105;
  const paleGold = (u: number, v: number) => rgb(u, v)[0] > 200 && rgb(u, v)[1] > 170 && rgb(u, v)[0] - rgb(u, v)[2] > 100;
  const scarfBeside = (u: number, v: number) => {
    for (let dy = -2; dy <= 0; dy++) for (let dx = -7; dx <= 7; dx++) if (solid(u + dx, v + dy) && isScarf(img.d, at(img, u + dx, v + dy))) return true;
    return false;
  };
  const unscarf = (x: number, y: number, rx: number, ry: number) => {
    if (!(isScarf(img.d, at(img, x, y)) || nearScarf(x, y, 1) || (gold(x, y) && nearScarf(x, y, 4)) || (paleGold(x, y) && scarfBeside(x, y)))) return;
    if (rx >= 0 && ry >= 0 && rx < PLAIN.w && ry < PLAIN.h && PLAIN.d[at(PLAIN, rx, ry) + 3]) out.d.set(PLAIN.d.subarray(at(PLAIN, rx, ry), at(PLAIN, rx, ry) + 4), at(out, x, y));
  };
  // the ninja's jacket at one pixel: black shoulders, sleeves and ribbed cuffs and hem, a high collar, a zip, an orange body
  const ninjaJacket = (x: number, y: number, rx: number, ry: number, collarTop: number): readonly number[] => {
    const edge = rim(x, y);
    const sleeve = rx < BODY.torso[0] + 1 || rx > BODY.torso[1] - 2 || ry < SPORT.neck;
    if (paw(x, y, 52)) return edge ? NINJA_BLACK[0] : NINJA_BLACK[(x + y) % 2 ? 1 : 2];
    if (sleeve) {
      const [px, py] = NINJA.patch; // a white round patch with a grey swirl on the left sleeve
      const pd = Math.hypot(rx - px, ry - py);
      if (pd <= 2.6) return pd <= 1 ? NINJA_GREY[1] : pd > 2 ? NINJA_GREY[2] : NINJA_GREY[3];
      return cloth(x, y, NINJA_BLACK);
    }
    if (ry >= SPORT.hem) return edge || ry === SPORT.hem + 3 ? NINJA_BLACK[0] : NINJA_BLACK[x % 2 ? 1 : 2];
    const d = Math.abs(rx - 41);
    // a stand-up ribbed collar round the neck, the zip's pull at its top
    if (ry <= collarTop + 3 && d <= 10) return ry === collarTop || edge ? NINJA_BLACK[0] : rx === 41 ? NINJA_GREY[3] : NINJA_BLACK[x % 2 ? 2 : 3];
    if (rx === 41) return NINJA_GREY[ry <= collarTop + 6 ? 3 : 2]; // the zip
    // the black yoke dips round the shoulders; its seam casts a shadow on the orange below
    const yoke = NINJA.chest - 3 + Math.round(7 * (d / 19) ** 2);
    if (ry < yoke) return edge || ry === yoke - 1 ? NINJA_BLACK[0] : NINJA_BLACK[d === 1 ? 2 : (rx + ry) % 9 === 0 ? 2 : 1];
    // the orange front: lit in the middle, shading round the body's sides and under the yoke, creased from the armpits
    // and bunched above the ribbed hem; the light falls from the left
    if (edge || d >= 19) return NINJA_ORANGE[0];
    const crease = (d >= 12 && d <= 17 && ry - yoke - 3 === d - 12) || (ry >= SPORT.hem - 3 && (rx + 1) % 6 === 0);
    let k = d > 15 ? 1 : d > 9 ? 2 : 3;
    if (rx > 41 && d > 12) k--;
    if (ry === yoke || ry >= SPORT.hem - 1 || d === 1) k--;
    return crease ? NINJA_ORANGE[1] : NINJA_ORANGE[Math.max(1, k)];
  };
  // the straw-hat shirt at one pixel (null: the bear shows): short sleeves, open down the front, the sash at the waist
  const strawShirt = (x: number, y: number, rx: number, ry: number): readonly number[] | null => {
    const edge = rim(x, y);
    const d = Math.abs(rx - 41);
    if (ry >= STRAW.sash[0] && ry <= STRAW.sash[1]) return edge || ry === STRAW.sash[1] ? STRAW_YELLOW[0] : STRAW_YELLOW[(x + 2 * y) % 7 === 0 ? 2 : 1];
    if (ry > STRAW.sash[1]) return null;
    const sleeve = rx < BODY.torso[0] + 1 || rx > BODY.torso[1] - 2 || ry < SPORT.neck;
    if (sleeve) {
      // short sleeves: the forearm is bare, but the sleeve always covers the upper arm round the shoulder, a raised arm too
      const sh = Math.min(...STRAW.shoulders.map(([sx, sy]) => (rx - sx) ** 2 + (ry - sy) ** 2));
      const bare = paw(x, y, 380);
      if (bare && sh > STRAW.sleeve ** 2) return null;
      return edge || (bare ? sh > (STRAW.sleeve - 2) ** 2 : paw(x, y, 440)) ? STRAW_RED[0] : cloth(x, y, STRAW_RED);
    }
    if (d < STRAW.open) return null;
    if (d === STRAW.open) return STRAW_RED[0];
    if (rx < 41 && d === STRAW.open + 2 && STRAW.buttons.includes(ry)) return STRAW_YELLOW[2];
    return edge ? STRAW_RED[0] : cloth(x, y, STRAW_RED, true);
  };
  const onHead = (rx: number, ry: number) => {
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      const [u, v] = [rx + dx, ry + dy];
      if (v < SPORT.neck && u >= 0 && v >= 0 && u < REF.w && REF.d[at(REF, u, v) + 3]) return true;
    }
    return false;
  };
  if (id === 'pirate_boots') {
    const [l, r] = [footAt(img, true), footAt(img, false)];
    const mid = Math.round((l[0] + r[0]) / 2);
    for (const [[cx, bottom], x0, x1, outer] of [[l, 0, mid, -1], [r, mid, img.w, 1]] as const)
      for (let y = bottom - PIRATE.boots + 1; y <= bottom; y++) {
        const k = y - (bottom - PIRATE.boots + 1); // rows down from the boot's top
        const cuff = k < PIRATE.cuff;
        let edge = -1;
        for (let x = x0; x < x1; x++) {
          if (!solid(x, y)) continue;
          let c: readonly number[];
          // the turned-down cuff: outlined, a pale top edge, its fold creases, a dark line where it folds over
          if (cuff) c = rim(x, y) || k === 0 || k === PIRATE.cuff - 1 ? PIRATE_BOOT[0] : k === 2 && (x - cx + 9) % 3 === 0 ? PIRATE_GOLD[1] : PIRATE_BOOT[k === 1 ? 3 : 2]; // gold buttons round the cuff
          else if (rim(x, y) || y === bottom) c = PIRATE_BOOT[0];
          else if (Math.abs(x - cx - 2 * outer) <= 1 && k < PIRATE.boots - 3) c = PIRATE_BOOT[3]; // the leather's shine down the shin
          else c = PIRATE_BOOT[k === PIRATE.cuff ? 1 : 2];
          put(x, y, c);
          if (outer < 0 ? edge < 0 : true) edge = x;
        }
        // the cuff stands a pixel proud of the shaft on the outer side
        if (cuff && edge >= 0 && edge + outer >= 0 && edge + outer < img.w) put(edge + outer, y, PIRATE_BOOT[0]);
      }
    return out;
  }
  if (id === 'ninja_sandals' || id === 'straw_sandals') {
    // open sandals: a sole and straps over the toes (the fur shows between); the ninja's wrap up the shin
    const ninja = id === 'ninja_sandals';
    const P = ninja ? NINJA_GREY : SANDAL;
    const [l, r] = [footAt(img, true), footAt(img, false)];
    const mid = Math.round((l[0] + r[0]) / 2);
    for (const [[, bottom], x0, x1] of [[l, 0, mid], [r, mid, img.w]] as const)
      for (let y = bottom - (ninja ? 11 : 5); y <= bottom; y++) {
        const k = bottom - y; // rows up from the sole
        if (!(k <= 1 || k === 3 || (!ninja && k === 5) || (ninja && k >= 6))) continue;
        for (let x = x0; x < x1; x++) {
          if (!solid(x, y)) continue;
          const edge = rim(x, y) || k === 0;
          put(x, y, edge ? P[0] : k === 1 ? P[2] : ninja && k >= 6 ? P[k % 2 ? 1 : 2] : P[1]);
        }
      }
    return out;
  }
  if (id === 'demon_boots') {
    const [l, r] = [footAt(img, true), footAt(img, false)];
    const mid = Math.round((l[0] + r[0]) / 2);
    for (const [[cx, bottom], x0, x1] of [[l, 0, mid], [r, mid, img.w]] as const)
      for (let y = bottom - DEMON.boots + 1; y <= bottom; y++) {
        const k = bottom - y; // rows up from the sole
        for (let x = x0; x < x1; x++) {
          if (!solid(x, y)) continue;
          const u = Math.abs(x - cx) + Math.abs(k - 6.5); // the flame's diamond on the front
          let c: readonly number[];
          if (k === 0) c = DEMON_TEAL[0];
          else if (k === 1) c = rim(x, y) ? DEMON_TEAL[0] : DEMON_TEAL[2]; // teal sole
          else if (rim(x, y)) c = FEATHER[0];
          else if (k === DEMON.boots - 1) c = DEMON_TEAL[1]; // the cuff
          else if (u <= 2.5) c = u > 1.5 ? DEMON_TEAL[1] : k < 6 ? FLAME[1] : k === 6 ? FLAME[2] : FLAME[0];
          else if (k <= 3 && (x + k) % 4 === 0) c = DEMON_TEAL[1]; // a teal swirl round the toe
          else c = FEATHER[k >= 8 ? 2 : 1];
          put(x, y, c);
        }
      }
    return out;
  }
  if (id === 'sport_sneakers') {
    const [l, r] = [footAt(img, true), footAt(img, false)];
    const mid = Math.round((l[0] + r[0]) / 2);
    for (const [[cx, bottom], x0, x1] of [[l, 0, mid], [r, mid, img.w]] as const)
      for (let y = bottom - SPORT.sneakers + 1; y <= bottom; y++) {
        const k = bottom - y; // rows up from the sole
        for (let x = x0; x < x1; x++) {
          if (!solid(x, y)) continue;
          let c: readonly number[];
          if (k <= 1) c = k === 0 || rim(x, y) ? SPORT_WHITE[0] : SPORT_WHITE[1]; // white sole
          else if (rim(x, y) || k === SPORT.sneakers - 1) c = SPORT_BLACK[0];
          else if (k === 2) c = SPORT_PINK[1]; // a pink stripe above the sole
          else if (k === 5 && Math.abs(x - cx) <= 2 && (x + y) % 2 === 0) c = SPORT_WHITE[1]; // laces
          else c = SPORT_BLACK[k >= 5 ? 3 : 2]; // the leather upper
          put(x, y, c);
        }
      }
    return out;
  }
  // the trousers stop at the ankle, a few rows above each sole
  const feet = [footAt(img, true), footAt(img, false)];
  const ankle = (x: number) => feet[x < (feet[0][0] + feet[1][0]) / 2 ? 0 : 1][1] - PIRATE.ankle;
  for (let y = 0; y < img.h; y++)
    for (let x = 0; x < img.w; x++) {
      if (!solid(x, y)) continue;
      const [rx, ry] = toRef(x, y);
      if (id === 'pirate_shirt' && ry > SPORT.hem + 3) {
        // the trousers below the vest
        if (y > ankle(x) || paw(x, y, 30)) continue;
        put(x, y, y === ankle(x) ? PIRATE_PANTS[0] : cloth(x, y, PIRATE_PANTS, ry < SPORT.crotch));
        continue;
      }
      if (id === 'ninja_pants' || id === 'straw_shorts') {
        // from the waist down: the full hips once below the paws; the ninja's to the ankle, the shorts to the knee
        const ninja = id === 'ninja_pants';
        const [h0, h1] = SPORT.hips;
        const hem = ninja ? ankle(x) - 2 - head[1] + HEAD[1] : STRAW.hem;
        if (ry < SPORT.waist || ry > hem || paw(x, y, 30) || (ry < SPORT.arms && (rx < h0 || rx > h1))) continue;
        const edge = rim(x, y) || ry === hem || (ry < SPORT.arms && (rx === h0 || rx === h1));
        let c: readonly number[];
        if (ninja) {
          const [[w0, w1], [c0, c1]] = NINJA.wrap; // a grey wrap round the thigh, two white bands on it
          if (ry >= w0 && ry <= w1 && rx >= c0 && rx <= c1) c = ry === w0 || ry === w1 || edge ? NINJA_GREY[0] : (ry - w0) % 3 === 0 ? NINJA_GREY[3] : NINJA_GREY[1];
          else c = edge ? NINJA_ORANGE[0] : cloth(x, y, NINJA_ORANGE, ry < SPORT.crotch);
        } else if (ry >= STRAW.cuff) {
          // a fluffy white cuff, ragged at the hem
          if (ry === hem && x % 2) continue;
          c = edge ? STRAW_CUFF[0] : STRAW_CUFF[(x + y) % 3 ? 2 : 1];
        } else c = edge ? STRAW_BLUE[0] : cloth(x, y, STRAW_BLUE, ry < SPORT.crotch);
        put(x, y, c);
        continue;
      }
      if (id === 'sport_shorts') {
        // up on the belly, between the arms while they hang beside it, then the full width of the hips below the paws;
        // flat black, only the creases between the legs show
        const [h0, h1] = SPORT.hips;
        if (ry < SPORT.waist || ry > SPORT.shorts || paw(x, y, 30) || (ry < SPORT.arms && (rx < h0 || rx > h1))) continue;
        const side = ry < SPORT.arms && (rx === h0 || rx === h1);
        let c = rim(x, y) || side ? SPORT_BLACK[0] : ry >= SPORT.crotch && lum(at(img, x, y)) < 70 ? SPORT_BLACK[1] : SPORT_BLACK[2];
        if (ry <= SPORT.waist + 1 && !rim(x, y) && !side) c = SPORT_BLUE[ry - SPORT.waist]; // blue waistband
        else if (ry === SPORT.shorts) c = SPORT_BLACK[0];
        else if (!rim(x, y) && ry > SPORT.waist + 1 && (ry < SPORT.arms ? rx === h0 + 1 : !solid(x - 2, y) && solid(x - 1, y))) c = SPORT_PINK[0]; // purple side stripe
        put(x, y, c);
        continue;
      }
      // hoodie
      // a paw or the head keeps its fur, but the scarf beside them never shows (a tilted head is not where the idle one is)
      const scarfPx = isScarf(img.d, at(img, x, y));
      if (ry > (id === 'wizard_robe' ? WIZ.hem : SPORT.hem + 3) || (!scarfPx && (paw(x, y, 30) || (ry < SPORT.neck + 1 && onHead(rx, ry))))) continue;
      // the chin dips below the neck line: the hoodie starts where the idle bear's scarf does, never on the face
      if (!scarfPx && ry <= SPORT.neck + 4 && rx >= 0 && rx < REF.w && REF.d[at(REF, rx, ry) + 3] && !isScarf(REF.d, at(REF, rx, ry))) continue;
      if (id === 'demon_cape') {
        const d = Math.abs(rx - 41);
        // the necklace sags to the middle; steel spikes hang from it, the longest in the middle
        const chain = DEMON.chain + Math.round(5 * (1 - (Math.min(d, 14) / 14) ** 2));
        const spike = [0, 5, 10, 14].find((s, k) => Math.abs(d - s) <= (ry - chain <= 2 ? 1 : 0) && ry > chain && ry - chain <= [8, 6, 4, 3][k]);
        const bottom = DEMON.mantle + (d > 14 ? 5 : 0) + [2, 0, 1, 0][((rx % 4) + 4) % 4]; // feather tips, longer over the arms
        if (d <= 15 && ry === chain) put(x, y, rx % 2 ? STEEL[1] : STEEL[0]);
        else if (d <= 15 && spike !== undefined) put(x, y, Math.abs(d - spike) === 1 ? STEEL[0] : ry - chain > 2 ? STEEL[1] : STEEL[2]);
        else if (ry <= bottom) {
          const stroke = rx < 41 ? (rx + ry) % 4 === 0 : (rx - ry) % 4 === 0;
          put(x, y, rim(x, y) || ry === bottom ? FEATHER[0] : stroke ? FEATHER[2] : ry <= SPORT.neck + 2 ? FEATHER[3] : FEATHER[1]);
        } else unscarf(x, y, rx, ry); // below the mantle the scarf's hanging end turns into fur
        continue;
      }
      if (id === 'straw_shirt') {
        const c = strawShirt(x, y, rx, ry);
        if (c) put(x, y, c);
        else if (ry <= STRAW.sash[1]) unscarf(x, y, rx, ry); // the open front and bare forearms show the bear, never its scarf
        continue;
      }
      if (id === 'wizard_robe') {
        // the bear keeps its own scarf over the robe, outline and all
        const nearScarf = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => solid(x + dx, y + dy) && isScarf(img.d, at(img, x + dx, y + dy)));
        if (!scarfPx && !(nearScarf && lum(at(img, x, y)) < 70)) put(x, y, wizardRobe(x, y, rx, ry));
        continue;
      }
      // and the collar sits a little lower, on the neck: the scarf's top rows above it turn into the fur right above them
      const collarTop = (rx >= 0 && rx < REF.w ? scarfTop[rx] : -Infinity) + SPORT.collar;
      if (ry < collarTop) {
        const i = at(img, x, y);
        if (!isScarf(img.d, i) && lum(i) >= 60) continue;
        const cloth = (j: number) => isScarf(img.d, j) || lum(j) < 60;
        let yy = y;
        while (yy > 0 && cloth(at(img, x, yy)) && y - yy < SPORT.collar + 3) yy--;
        // a paw or a tilted head in the way: the hoodie takes the pixel after all
        if (!cloth(at(img, x, yy))) {
          out.d.set(img.d.subarray(at(img, x, yy), at(img, x, yy) + 4), at(out, x, y));
          continue;
        }
      }
      if (id === 'pirate_shirt') {
        put(x, y, pirateShirt(x, y, rx, ry, collarTop));
        continue;
      }
      if (id === 'ninja_jacket') {
        put(x, y, ninjaJacket(x, y, rx, ry, collarTop));
        continue;
      }
      const scarfRow = ry < SPORT.neck + 10 && !onHead(rx, ry - 3);
      let c = cloth(x, y, SPORT_BLACK, true);
      if (paw(x, y, 52)) c = rim(x, y) ? SPORT_BLACK[0] : SPORT_BLACK[(x + y) % 2 ? 1 : 2]; // ribbed cuff
      else if (ry >= SPORT.hem) c = rim(x, y) || ry === SPORT.hem + 3 ? SPORT_BLACK[0] : SPORT_BLACK[x % 2 ? 1 : 2]; // ribbed hem
      else if (rim(x, y)) c = SPORT_BLACK[0];
      else if (!scarfRow && rx < BODY.torso[0] && ry >= SPORT.sleeve && !solid(x - 3, y) && solid(x - 2, y)) c = SPORT_GREEN[1]; // green down the left sleeve
      else if (!scarfRow && rx < BODY.torso[0] && ry >= SPORT.sleeve && !solid(x - 2, y)) c = SPORT_GREEN[0];
      else if (rx >= 49 && rx <= 50 && ry >= 76 && ry < SPORT.hem) c = SPORT_BLUE[rx === 49 ? 1 : 0]; // blue stripe down the front
      else if (ry >= 87 && ry <= 88 && rx >= 26 && rx <= 50) c = SPORT_BLUE[ry === 87 ? 1 : 0]; // and across the chest
      else if (rx >= 56 && rx + ry >= 137 && rx + ry <= 138 && ry >= 74 && ry <= 84) c = SPORT_PINK[1]; // pink on the right shoulder
      else if (ry <= SPORT.neck + SPORT.collar + 9) {
        // the hood lies round the neck: its blue-lined opening is a V, two white drawstrings hang from it
        const n = SPORT.neck + SPORT.collar;
        const v = Math.abs(rx - 41) - (n + 10 - ry);
        c = v >= -1 && v <= 0 ? SPORT_BLUE[1] : SPORT_BLACK[ry === collarTop ? 0 : ry <= n + 1 ? 1 : 2];
      } else if ((rx === 37 || rx === 45) && ry >= SPORT.neck + SPORT.collar + 10 && ry <= SPORT.neck + SPORT.collar + 16) c = SPORT_WHITE[ry === SPORT.neck + SPORT.collar + 16 ? 0 : 1];
      else if (rx >= 57 && rx <= 59 && ry >= 79 && ry <= 81 && (rx === 58 || ry === 80)) c = SPORT_WHITE[1]; // a little logo
      put(x, y, c);
    }
  if (id === 'demon_cape' && !sleeping) {
    // the cape hangs behind the bear from the shoulders, widening to a ragged hem of feather tips at the heels
    const toX = (rx: number) => rx - HEAD[0] + head[0];
    const [top, hem] = DEMON.cape;
    for (let ry = top; ry <= hem + 3; ry++) {
      const y = ry - HEAD[1] + head[1];
      if (y < 0 || y >= img.h) continue;
      const hw = Math.round(29 + (7 * Math.min(ry - top, hem - top)) / (hem - top));
      for (let x = Math.max(0, toX(41 - hw)); x <= Math.min(img.w - 1, toX(41 + hw)); x++) {
        const rx = x - head[0] + HEAD[0];
        const tip = hem + [0, 2, 3, 2][((rx % 4) + 4) % 4];
        if (ry > tip || solid(x, y) || out.d[at(out, x, y) + 3]) continue;
        put(x, y, rx === 41 - hw || rx === 41 + hw || ry === tip ? FEATHER[0] : ((rx % 3) + 3) % 3 === 0 ? FEATHER[2] : FEATHER[1]);
      }
    }
  }
  if (id === 'straw_shirt' && !sleeping) {
    // the sash is knotted at the left hip, its end hanging down over the shorts
    const [kx, ky] = [STRAW.knot[0] - HEAD[0] + head[0], STRAW.sash[1] - HEAD[1] + head[1]];
    for (let k = 1; k <= STRAW.knot[1]; k++)
      for (let j = -2; j <= 2 + (k >> 2); j++) {
        const [x, y] = [kx + j + (k >> 1), ky + k];
        if (x < 0 || y >= img.h || x >= img.w) continue;
        const edge = j === -2 || j === 2 + (k >> 2) || k === STRAW.knot[1];
        put(x, y, edge ? STRAW_YELLOW[0] : STRAW_YELLOW[j === 0 ? 2 : 1]);
      }
  }
  if (id === 'pirate_shirt' && !sleeping) {
    // the coat hangs open past the hips down to the knees, flaring a little; the trousers show between its halves
    const toX = (rx: number) => rx - HEAD[0] + head[0];
    for (let ry = CAPT.flare[0]; ry <= CAPT.hem; ry++) {
      const y = ry - HEAD[1] + head[1];
      if (y < 0 || y >= img.h) continue;
      const flare = Math.round((CAPT.flare[1] * (ry - CAPT.flare[0])) / (CAPT.hem - CAPT.flare[0]));
      const [l, r] = [toX(BODY.torso[0] - 1 - flare), toX(BODY.torso[1] + flare)];
      for (let x = Math.max(0, l); x <= Math.min(img.w - 1, r); x++) {
        const d = Math.abs(x - toX(41));
        if (d < CAPT.open || (solid(x, y) && paw(x, y, 30)) || (ry <= SPORT.hem + 3 && out.d[at(out, x, y) + 3])) continue;
        put(x, y, x === l || x === r || ry === CAPT.hem ? COAT[0] : d === CAPT.open ? PIRATE_GOLD[1] : COAT[2]);
      }
    }
  }
  if (id === 'wizard_robe' && !sleeping) {
    // a loose robe: from the chest down it hangs straight past the body and flares to the hem, hiding the legs; open at
    // the front (red lining, dark trousers between), the paws stay in front of it
    const toX = (rx: number) => rx - HEAD[0] + head[0];
    for (let ry = WIZ.flare[0]; ry <= WIZ.hem; ry++) {
      const y = ry - HEAD[1] + head[1];
      if (y < 0 || y >= img.h) continue;
      const flare = Math.round((WIZ.flare[1] * (ry - WIZ.flare[0])) / (WIZ.hem - WIZ.flare[0]));
      const [l, r] = [toX(BODY.torso[0] - 1 - flare), toX(BODY.torso[1] + flare)];
      for (let x = Math.max(0, l); x <= Math.min(img.w - 1, r); x++) {
        const j = at(out, x, y);
        if (solid(x, y) && paw(x, y, 30)) continue;
        if (ry < SPORT.crotch && out.d[j + 3]) continue; // the robe already drawn on the body and arms
        const d = Math.abs(x - toX(41));
        const c = x === l || x === r || ry === WIZ.hem ? ROBE[0] : ry >= SPORT.hem && d === WIZ.panel ? ROBE_RED[1] : ry >= SPORT.hem && d < WIZ.panel ? ROBE[1] : ry >= SPORT.hem && (x === l + 3 || x === r - 3) ? ROBE[1] : ROBE[2]; // a fold down each side
        put(x, y, c);
      }
    }
  }
  return out;
}

/**
 * Mongolian boots (гутал): a brown felt rim, a yellow shaft with a brown endless knot, a blue foot under a yellow cloud
 * edge and a cream sole that curls up at the toe. Under the deel only the part below its hem shows (`clip`, the hem's row).
 */
const MBOOT_YELLOW = [[128, 88, 20], [204, 158, 40], [236, 194, 70]] as const;
const MBOOT_BLUE = [[22, 34, 110], [40, 70, 190], [70, 104, 230]] as const;
const MBOOT_BROWN = [[56, 26, 16], [158, 82, 56], [184, 106, 78]] as const;
const MBOOT_CREAM = [[176, 150, 100], [236, 222, 176]] as const;
const MBOOT = { height: 19, felt: 3, shaft: 10, sole: 17 } as const; // rows from the boot's top
function mongolBootPixels(base: Img, clip = 0): Img {
  const out = blank(base.w, base.h);
  const [l, r] = [footAt(base, true), footAt(base, false)];
  const mid = Math.round((l[0] + r[0]) / 2);
  const solid = (x: number, y: number) => x >= 0 && y >= 0 && x < base.w && y < base.h && base.d[at(base, x, y) + 3] > 128;
  for (const [[cx, bottom], x0, x1] of [[l, 0, mid], [r, mid, base.w]] as const) {
    const top = bottom - MBOOT.height + 1;
    for (let y = Math.max(top, clip); y <= bottom; y++) {
      const k = y - top;
      let [left, right] = [-1, -1];
      for (let x = x0; x < x1; x++) {
        if (!solid(x, y)) continue;
        if (left < 0) left = x;
        right = x;
        const rim = !solid(x - 1, y) || !solid(x + 1, y) || y === bottom;
        let c: readonly number[];
        if (k < MBOOT.felt) c = MBOOT_BROWN[rim || k !== 1 ? 0 : (x + y) % 3 ? 1 : 2]; // felt rim, outlined above and below
        else if (k < MBOOT.shaft) {
          // an endless knot: two interlocked diamonds down the front of the shaft
          const [dx, dy] = [Math.abs(x - cx), y - (top + MBOOT.felt + 4)];
          const knot = dx + Math.abs(dy + 1) === 2 || dx + Math.abs(dy - 1) === 2;
          c = rim ? MBOOT_YELLOW[0] : knot ? MBOOT_BROWN[1] : MBOOT_YELLOW[k === MBOOT.felt ? 2 : 1];
        } else if (k <= MBOOT.shaft + 1) {
          // the yellow comes down in cloud scallops over the blue foot
          const scallop = (x - cx + 12) % 4;
          c = rim ? MBOOT_BLUE[0] : k === MBOOT.shaft ? (scallop < 3 ? MBOOT_YELLOW[1] : MBOOT_BLUE[1]) : scallop === 1 ? MBOOT_YELLOW[1] : MBOOT_BLUE[2];
        } else if (k < MBOOT.sole) {
          const swirl = (k === MBOOT.shaft + 3 && Math.abs(x - cx) === 3) || (k === MBOOT.shaft + 4 && Math.abs(x - cx) === 2);
          const toe = Math.abs(x - cx) <= (k === MBOOT.sole - 1 ? 1 : 0) && k >= MBOOT.sole - 2; // the sole curls up at the toe
          c = rim ? MBOOT_BLUE[0] : toe ? MBOOT_CREAM[1] : swirl ? MBOOT_YELLOW[2] : MBOOT_BLUE[1];
        } else c = y === bottom || rim ? MBOOT_CREAM[0] : MBOOT_CREAM[1];
        out.d.set([...c, 255], at(out, x, y));
      }
      // the felt rim stands a pixel proud of the shaft
      if (k < MBOOT.felt - 1 && left >= 0) for (const x of [left - 1, right + 1]) if (x >= 0 && x < base.w) out.d.set([...MBOOT_BROWN[0], 255], at(out, x, y));
    }
  }
  return out;
}

/** a fitted item on a frame's own body: boots, Mongolian boots (`deel`: worn under it), sports wear */
/**
 * A dot-art headband (black, with a red and a brown wave, cream-and-orange dot circles and white dots) tied round the
 * head: across the forehead above the brows, curving down round the sides of the head under the ears, which stand in
 * front of it. Only the head's own pixels take it, shaded darker where the head turns away.
 */
const BAND = { nose: 54, top: 26, rows: 9, curve: 13, ears: [[16, 24, 10, 10.5], [65, 23, 11, 11]] } as const;
const BAND_BLACK = [[10, 8, 10], [22, 18, 20], [40, 34, 36]] as const;
const BAND_RED = [[110, 22, 20], [158, 34, 30], [196, 58, 44]] as const;
const BAND_BROWN = [[86, 48, 26], [122, 70, 38], [160, 98, 52]] as const;
const BAND_DOT = [[222, 140, 52], [246, 232, 200], [250, 248, 240]] as const;
const NINJA_NAVY = [[22, 26, 44], [36, 42, 70], [56, 64, 100]] as const;
function headbandPixels(img: Img, head: [number, number], ninja = false): Img {
  const out = blank(img.w, img.h);
  const solid = (x: number, y: number) => x >= 0 && y >= 0 && x < img.w && y < img.h && img.d[at(img, x, y) + 3] > 128;
  const lum = (x: number, y: number) => 0.3 * img.d[at(img, x, y)] + 0.59 * img.d[at(img, x, y) + 1] + 0.11 * img.d[at(img, x, y) + 2];
  // the animations' faces sit a little lower in the head than the idle bear's: line the band up by the nose's top row
  let nose = BAND.nose;
  for (let ry = BAND.nose - 8; ry < BAND.nose + 14 && nose === BAND.nose; ry++) {
    const y = ry - HEAD[1] + head[1];
    let dark = 0;
    for (let rx = 36; rx <= 46; rx++) if (solid(rx - HEAD[0] + head[0], y) && lum(rx - HEAD[0] + head[0], y) < 70) dark++;
    if (dark >= 4) nose = ry;
  }
  const dy = nose - BAND.nose;
  const ear = (rx: number, ry: number) => BAND.ears.some(([cx, cy, ax, ay]) => ((rx - cx) / ax) ** 2 + ((ry - dy - cy) / ay) ** 2 <= 1);
  const top = (rx: number) => BAND.top + dy + Math.round(BAND.curve * ((rx - 41) / 30) ** 2);
  for (let y = 0; y < img.h; y++)
    for (let x = 0; x < img.w; x++) {
      const [rx, ry] = [x - head[0] + HEAD[0], y - head[1] + HEAD[1]];
      const t = top(rx);
      if (ry < t || ry >= t + BAND.rows || !solid(x, y) || ear(rx, ry)) continue;
      const v = (ry - t) / (BAND.rows - 1);
      const edge = ry === t || ry === t + BAND.rows - 1 || !solid(x - 1, y) || !solid(x + 1, y);
      const side = Math.abs(rx - 41) > 22 ? 0 : 1; // the band turns away round the sides of the head
      let c: readonly number[];
      if (ninja) {
        // a navy cloth band, a steel plate on the forehead with a rivet at each corner and a spiral cut in it
        const [u, w] = [rx - 41, ry - t];
        const plate = Math.abs(u) <= 11 && w >= 1 && w <= BAND.rows - 2;
        const rivet = Math.abs(u) === 9 && (w === 2 || w === BAND.rows - 3);
        const spiral = Math.abs(u) <= 3 && w >= 2 && w <= 6 && (Math.max(Math.abs(u), Math.abs(w - 4)) === 2 ? !(u === 2 && w === 4) : u === 0 && w === 4);
        if (!plate) c = edge ? BAND_BLACK[0] : NINJA_NAVY[side + (w === 1 ? 1 : 0)];
        else if (Math.abs(u) === 11 || w === 1 || w === BAND.rows - 2) c = NINJA_GREY[0];
        else c = rivet || spiral ? NINJA_GREY[1] : w === 2 ? NINJA_GREY[3] : NINJA_GREY[2];
        out.d.set([...c, 255], at(out, x, y));
        continue;
      }
      // a cream ring round an orange one, a cream dot in the middle
      const circle = [18, 41, 64].map((cx) => Math.hypot(rx - cx, ry - (t + 4))).find((d) => d <= 3.3);
      if (edge) c = BAND_BLACK[0];
      else if (circle !== undefined) c = BAND_DOT[circle > 2.5 ? 1 : circle > 1.4 ? 0 : 1];
      else if (rx >= 22 && rx <= 58 && v > 0.62 + 0.22 * Math.sin(rx / 6.5)) c = BAND_RED[side + (((rx >> 1) + ry) % 7 === 0 ? 1 : 0)];
      else if (rx >= 30 && rx <= 52 && v < 0.3 + 0.18 * Math.sin(rx / 5 + 2)) c = BAND_BROWN[side];
      else if (rx >= 60 && v > 0.55) c = BAND_RED[side];
      else c = (rx * 7 + ry * 3) % 11 === 0 ? BAND_DOT[2] : BAND_BLACK[side + 1];
      out.d.set([...c, 255], at(out, x, y));
    }
  return out;
}

function fitOn(id: string, img: Img, head: [number, number], hands: [number, number][], sleeping: boolean, deel = false): Img {
  if (id === 'brown_boots') return fittedBootFrame(img);
  if (id === 'headband' || id === 'ninja_headband') return headbandPixels(img, head, id === 'ninja_headband');
  if (id === 'mongol_boots') return sleeping ? blank(img.w, img.h) : mongolBootPixels(img, deel ? head[1] + DEEL.hem - HEAD[1] : 0);
  return sportPixels(id as SportId, img, head, hands, sleeping);
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
function batmanBase(img: Img, head: [number, number], hands: [number, number][]): Img {
  const out = blank(img.w, img.h);
  const suit = items.batman_suit;
  const [sx, sy] = [head[0] + suit.at[0], head[1] + suit.at[1]];
  const suitPx = (u: number, v: number) =>
    u >= 0 && v >= 0 && u < suit.img.w && v < suit.img.h && suit.img.d[at(suit.img, u, v) + 3] > 0 ? at(suit.img, u, v) : -1;
  const lum = (d: Uint8Array | Uint8ClampedArray, i: number) => 0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2];
  // the head keeps its fur: the idle bear's head (a pixel's leeway for a tilt), the neck down to the collar; a raised
  // paw over it is the suit's glove
  const idleHead = (rx: number, ry: number) => {
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (ry + dy < SPORT.neck && IDLE_BODY(rx + dx, ry + dy)) return true;
    return false;
  };
  const inHead = (x: number, y: number) => {
    if (!(x >= head[0] && x < head[0] + HEAD[2] - HEAD[0] && y >= head[1] && y < sy + NECK_DROP)) return false;
    const [rx, ry] = [x - head[0] + HEAD[0], y - head[1] + HEAD[1]];
    if (hands.some(([hx, hy]) => (x - hx) ** 2 + (y - hy) ** 2 <= 40)) return false;
    return ry >= SPORT.neck || idleHead(rx, ry);
  };
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
/** the other paw where only one is known (HANDS): where the frame says, otherwise mirrored across the head */
const OTHER_PAW: Record<string, Record<number, [number, number]>> = { tired: { 2: [68, 78], 3: [68, 60], 4: [66, 57], 5: [69, 66] } }; // the yawning paw
function bothPaws(name: string, i: number, img: Img, head: [number, number]): [number, number][] {
  const hand = handAt(img, HANDS[name][i]);
  if (SHIELD_HANDS[name] !== HANDS[name]) return [hand, handAt(img, SHIELD_HANDS[name][i])];
  const other = OTHER_PAW[name]?.[i] ?? [2 * (head[0] + 41 - HEAD[0]) - HANDS[name][i][0], HANDS[name][i][1]];
  return [hand, handAt(img, other)];
}

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
    if (def.anchor === 'body') {
      overlay(card, fitOn(id, REF, [HEAD[0], HEAD[1]], IDLE_HANDS, false), 0, 0);
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
    const card = worn.includes('mongol_deel') ? deelBase(REF, [HEAD[0], HEAD[1]], IDLE_HANDS) : worn.includes('brown_boots') ? bootsBase(REF) : worn.includes('warrior_helmet') ? helmetBase(REF, [HEAD[0], HEAD[1]]) : clone(REF);
    for (const w of worn)
      if (w === 'brown_boots') overlay(card, fittedBootFrame(REF), 0, 0);
      else if (ITEMS[w].anchor === 'body') overlay(card, fitOn(w, REF, [HEAD[0], HEAD[1]], IDLE_HANDS, false, worn.includes('mongol_deel')), 0, 0);
      else if (ITEMS[w].anchor === 'hand') overlay(card, heldPatch(REF, [68, 104], w), 68 - HELD.pivot[0], 104 - HELD.pivot[1]);
      else if (w !== 'mongol_deel') overlayItem(card, w);
    writePng(new URL(`outfit_${id}.png`, SPRITES), card);
  }
  for (const [name, { frames }] of Object.entries(sheets)) writePng(new URL(`bear_home_${name}.png`, SPRITES), toSheet(frames, STATES[name].cols ?? frames.length));
  for (const [name, { frames, heads }] of Object.entries(sheets)) {
    const fitted = frames.map((f, i) => ({ ...f, img: helmetBase(f.img, heads[i]) }));
    writePng(new URL(`bear_helmet_base_${name}.png`, SPRITES), toSheet(fitted, STATES[name].cols ?? frames.length));
    const suited = frames.map((f, i) => ({ ...f, img: batmanBase(f.img, heads[i], bothPaws(name, i, f.img, heads[i])) }));
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
  for (const id of [...SPORT_IDS, ...PIRATE_IDS, ...WIZARD_IDS, ...DEMON_IDS, ...NINJA_IDS, ...STRAW_IDS, 'mongol_boots', 'headband', 'ninja_headband']) items[id].img = fitOn(id, REF, [HEAD[0], HEAD[1]], IDLE_HANDS, false);
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
  // fitted overlays: one sheet per state, the item drawn on that frame's own body
  const fittedSheets: Record<string, Record<string, string>> = {};
  for (const id of ['brown_boots', 'mongol_boots', 'mongol_boots_deel', 'headband', 'ninja_headband', ...SPORT_IDS, ...PIRATE_IDS, ...WIZARD_IDS, ...DEMON_IDS, ...NINJA_IDS, ...STRAW_IDS]) {
    fittedSheets[id] = {};
    for (const [name, { frames, heads }] of Object.entries(sheets)) {
      const cols = STATES[name].cols ?? frames.length;
      const factor = name === 'welcome' ? 3 : 2;
      const stem = `fitted_${id}_${name}`;
      const fit = (img: Img, i: number) =>
        fitOn(id.replace(/_deel$/, ''), img, heads[i], bothPaws(name, i, img, heads[i]), name === 'sleep', id.endsWith('_deel'));
      const strip = toSheet(frames.map((f, i) => ({ ...f, img: fit(f.img, i) })), cols);
      writePng(new URL(`${stem}.png`, SPRITES), strip);
      fittedSheets[id][name] = `${stem}_${strip.w * factor}x${strip.h * factor}`;
    }
  }
  writeFileSync(META, `${JSON.stringify(meta, null, 2)}\n`);
  const itemMeta = Object.fromEntries(Object.entries(items).map(([id, { at: a }]) => [id, {
    at: a, loose: ITEMS[id].loose,
    ...(ITEMS[id].anchor === 'hand' ? { anchor: 'hand', held: { at: HELD.pivot.map(v => -v), sheets: heldSheets[id] } } : {}),
    ...(ITEMS[id].anchor === 'feet' || ITEMS[id].anchor === 'body'
      ? { anchor: ITEMS[id].anchor, fitted: { sheets: fittedSheets[id], ...(fittedSheets[`${id}_deel`] ? { deel: fittedSheets[`${id}_deel`] } : {}) } }
      : {}),
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
        if (ITEMS[id].anchor === 'feet' || ITEMS[id].anchor === 'body') {
          const hands = bothPaws(name, i, frames[i].img, head);
          overlay(img, fitOn(id, frames[i].img, head, hands, name === 'sleep'), 0, 0);
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
