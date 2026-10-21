/**
 * Тулааны баавгай: sprite sheet (docs/design/pixel-bear/sprites/bear_battle.png, 7×4 grid) ба metadata
 * (mobile/src/lib/pixelBear/bear.json: frame бүрийн хугацаа, tag-ууд, хөл/сарвууны байрлал).
 *
 * «Манай баавгай» (map_bear.png)-ын толгой, гэдэс, ороолт бүтнээрээ ирнэ (нүүрийг задлахгүй). Гар, хөл, ороолтын
 * үзүүрийг жижиг z-buffer renderer-ээр зурна: үе бүр гэрэл (зүүн дээрээс) тусах бөмбөрцөг/капсул.
 *   pixel-art-professional: hue-shift-тэй өнгөний шат (сүүдэр улаан-ягаан, гэрэл улбар шар), буцаж ойсон гэрэл,
 *     гарын сүүдэр бие дээр, selective outline (гэрэлтэй талын хүрээ хар биш, бараан хүрэн), гар хөлийн хүрээнд
 *     anti-alias, газрын сүүдэр.
 *   pixel-art-animator: frame бүр өөрийн хугацаатай (бэлдэх удаан, smear 50ms, дагах дунд), бэлдэх (anticipation),
 *     smear, дагах (follow-through), амьсгалд overlapping action (гар эхэлж, толгой дагана), ороолтын үзүүрийн
 *     secondary motion, гүйж эхлэх/тоормослох frame.
 *   pixel-art-exporter: grid sheet + JSON (frame, хугацаа, tag), урьдчилсан харагдац (APNG, 4×, boss-ын гэр дээр).
 *
 * Ажиллуулах:  npm run sprites:bear && npm run sprites   (mobile/)
 * Шалгах:      node scripts/bear-sprites.ts --preview <dir>
 */
import { writeFileSync } from 'node:fs';
import { blank, type Img, readPng, writeApng, writePng } from './png.ts';

const SPRITES = new URL('../../docs/design/pixel-bear/sprites/', import.meta.url);
const META = new URL('../src/lib/pixelBear/bear.json', import.meta.url);

type RGB = readonly [number, number, number];
type P = readonly [number, number];
/** гар/хөл: (тохой, сарвуу) frame-ийн координат (px) */
type Limb = readonly [P, P];

const hex = (h: string): RGB => [
  Number.parseInt(h.slice(1, 3), 16),
  Number.parseInt(h.slice(3, 5), 16),
  Number.parseInt(h.slice(5, 7), 16),
];
const ramp = (...h: string[]) => h.map(hex);

// ---------- палитр: map_bear.png-ийн өнгөнөөс, сүүдэр улаан-ягаан, гэрэл улбар шар руу hue-shift ----------
const OUT = hex('#2a140a');
const LINE = hex('#4b2016');
const FUR = ramp('#4a2120', '#632c22', '#7c3d29', '#8f4c2f', '#a05837', '#b5683f', '#c47649', '#d68b55');
const PAD = ramp('#c9845a', '#e4a474', '#f7c38e', '#fdd5a5', '#ffe5c2');
const CLAW = ramp('#b39c86', '#e9dcc8', '#fff7ea');
const SCARF = ramp('#123a26', '#1d5434', '#2f7a4c', '#3f9460', '#5aac6c');
const GOLD = hex('#e9b949');
const WHITE = hex('#ffffff');
const LEMON = hex('#f3f66c');
const STAR = hex('#ffe08a');
const DUST = ramp('#b8a78f', '#ddd2bf', '#f6f0e4');
const SHADOW = hex('#160b24');

const LIGHT = (() => {
  const v = [-0.55, -0.62, 0.56];
  const n = Math.hypot(...v);
  return v.map((x) => x / n);
})();
const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
].map((r) => r.map((v) => v / 16 - 0.47));

// ---------- frame ----------
const FW = 52;
const FH = 64;
const COLS = 7;
/** газар: хөлийн хүрээ 60-р мөрөнд, түүнээс доош газрын сүүдэр */
const FEET = 61;
/** 34px өргөн эх баавгай frame-ийн голд (зүүн/баруун 9px: сунгасан гар, оч): толин тусгалаар эргүүлэхэд байрнаасаа хөдлөхгүй */
const BX = 9;
/** эх баавгайн гарын зааг: тэр мөрөнд ойр гар энэ баганаас зүүн тийш; хол гар нь толин тусгал (33 − x) */
const SEP: Record<number, number> = { 33: 9, 34: 9, 35: 9, 36: 9, 37: 8, 38: 8, 39: 9, 40: 9, 41: 8, 42: 8, 43: 7, 44: 7, 45: 6, 46: 6 };
/** энэ мөрнөөс доош эх хөлийг арилгаж шинээр зурна */
const LEG_CUT = 52;
const NEAR_SH: P = [BX + 6, 35];
const FAR_SH: P = [BX + 27, 35];
const HIPS: readonly [P, P] = [
  [BX + 11, 49],
  [BX + 23, 49],
];
const ANKLE_Y = 56;
const THIGH = 4.3;
const SHIN = 4.3;
/** ороолтын ар талын үзүүр хүзүүний баруун талаас гарна */
const NECK: P = [BX + 26, 27];
const N4 = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const;

// ---------- зураг ----------
const at = (img: Img, x: number, y: number) => (y * img.w + x) * 4;
const has = (img: Img, x: number, y: number) => x >= 0 && y >= 0 && x < img.w && y < img.h && img.d[at(img, x, y) + 3] > 0;
const get = (img: Img, x: number, y: number): RGB => {
  const i = at(img, x, y);
  return [img.d[i], img.d[i + 1], img.d[i + 2]];
};
function put(img: Img, x: number, y: number, c: RGB, a = 255) {
  if (x < 0 || y < 0 || x >= img.w || y >= img.h) return;
  img.d.set([c[0], c[1], c[2], a], at(img, x, y));
}
const clone = (img: Img): Img => ({ w: img.w, h: img.h, d: img.d.slice() });
function over(dst: Img, src: Img): Img {
  const o = clone(dst);
  for (let i = 0; i < o.d.length; i += 4) if (src.d[i + 3]) o.d.set(src.d.subarray(i, i + 4), i);
  return o;
}
const same = (a: RGB, b: RGB) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
const mix = (a: RGB, b: RGB, t: number): RGB => [0, 1, 2].map((i) => Math.round(a[i] + (b[i] - a[i]) * t)) as unknown as RGB;
/** бараан хувилбар: саарал биш, улаан-ягаан руу hue-shift */
const darker = (c: RGB, k: number): RGB => [Math.round(c[0] * k), Math.round(c[1] * k * 0.88), Math.min(255, Math.round(c[2] * k * 1.08))];
/** хар хүрээ (эх sprite-ийн хүрээ, нүд гэх мэт) */
const isLine = (c: RGB) => c[0] < 70 && c[1] < 45 && c[2] < 40;

// ---------- z-buffer renderer ----------
interface Alt {
  ramp: RGB[];
  test: (u: number, v: number) => boolean;
}
/** сарвууны дэвсгэр: бөмбөрцгийн (du, dv) чиглэлд харсан хэсэг цайвар */
const pads = (du: number, dv: number, k = 0.25): Alt => ({ ramp: PAD, test: (u, v) => u * du + v * dv > k });

function level(x: number, y: number, nx: number, ny: number, nz: number, n: number, bias: number): number {
  const i = (nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2]) / (Math.hypot(nx, ny, nz) || 1);
  let v = (i * 0.5 + 0.5) * (n - 1) + bias + BAYER[y & 3][x & 3] * 0.6;
  // буцаж ойсон гэрэл: гэрлийн эсрэг талын ирмэг нэг шат гэгээ (эзэлхүүн тодорно)
  if (nz < 0.45 && nx * LIGHT[0] + ny * LIGHT[1] < -0.2) v += 1.1;
  return Math.max(0, Math.min(n - 1, Math.round(v)));
}

/** Хэсэг бүр өөрийн id, гүн (z), өнгөтэй; ойр нь хол хэсгийг дарна. `sdf` = хэлбэрийн гадна ирмэг хүртэлх зай (AA). */
class Layer {
  z = new Float32Array(FW * FH).fill(-Infinity);
  id = new Int16Array(FW * FH).fill(-1);
  sdf = new Float32Array(FW * FH).fill(Infinity);
  col: RGB[] = [];

  private paint(k: number, z: number, c: RGB, pid: number) {
    if (z <= this.z[k]) return;
    this.z[k] = z;
    this.col[k] = c;
    this.id[k] = pid;
  }

  ball(c: P, rx: number, ry: number, rmp: RGB[], z0: number, pid: number, bias = 0, alt?: Alt) {
    for (let y = 0; y < FH; y++)
      for (let x = 0; x < FW; x++) {
        const k = y * FW + x;
        const u = (x + 0.5 - c[0]) / rx;
        const v = (y + 0.5 - c[1]) / ry;
        const q = u * u + v * v;
        if (q > 1) {
          this.sdf[k] = Math.min(this.sdf[k], (Math.sqrt(q) - 1) * Math.min(rx, ry));
          continue;
        }
        const nz = Math.sqrt(1 - q);
        const r = alt?.test(u, v) ? alt.ramp : rmp;
        this.paint(k, z0 + nz * Math.min(rx, ry), r[level(x, y, u, v, nz, r.length, r === rmp ? bias : 0)], pid);
      }
  }

  capsule(a: P, b: P, r0: number, r1: number, rmp: RGB[], z0: number, pid: number, bias = 0) {
    const abx = b[0] - a[0];
    const aby = b[1] - a[1];
    const l2 = Math.max(1e-6, abx * abx + aby * aby);
    for (let y = 0; y < FH; y++)
      for (let x = 0; x < FW; x++) {
        const k = y * FW + x;
        const t = Math.max(0, Math.min(1, ((x + 0.5 - a[0]) * abx + (y + 0.5 - a[1]) * aby) / l2));
        const r = r0 + (r1 - r0) * t;
        const dx = x + 0.5 - (a[0] + abx * t);
        const dy = y + 0.5 - (a[1] + aby * t);
        const d = Math.hypot(dx, dy);
        if (d > r) {
          this.sdf[k] = Math.min(this.sdf[k], d - r);
          continue;
        }
        const nx = dx / r;
        const ny = dy / r;
        const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
        this.paint(k, z0 + nz * r, rmp[level(x, y, nx, ny, nz, rmp.length, bias)], pid);
      }
  }

  /** нэг pixel (ороолтын алтан толбо) */
  dot(p: P, c: RGB, z: number, pid: number) {
    const x = Math.floor(p[0]);
    const y = Math.floor(p[1]);
    if (x >= 0 && y >= 0 && x < FW && y < FH && this.id[y * FW + x] >= 0) this.paint(y * FW + x, z, c, pid);
  }

  /** Хэсгүүдийн зааг: хөрш нь илт ойр бол өөрийн өнгөний бараан хувилбар (selective); гадна 1px хүрээ, хэлбэр нь
   * pixel-ийн төвд маш ойр өнгөрвөл хүрээг дотор өнгөтэй хольж зөөлрүүлнэ (anti-alias). */
  img(out = OUT): Img {
    const o = blank(FW, FH);
    const group = (k: number) => Math.floor(this.id[k] / 10);
    const near = (x: number, y: number) => (x < 0 || y < 0 || x >= FW || y >= FH ? -1 : y * FW + x);
    for (let y = 0; y < FH; y++)
      for (let x = 0; x < FW; x++) {
        const k = y * FW + x;
        if (this.id[k] >= 0) {
          let c = this.col[k];
          for (const [dx, dy] of N4) {
            const q = near(x + dx, y + dy);
            if (q >= 0 && this.id[q] >= 0 && group(q) !== group(k) && this.z[q] - this.z[k] > 2.2) {
              c = darker(c, 0.55);
              break;
            }
          }
          put(o, x, y, c);
          continue;
        }
        let inner: RGB | null = null;
        for (const [dx, dy] of N4) {
          const q = near(x + dx, y + dy);
          if (q >= 0 && this.id[q] >= 0) inner = this.col[q];
        }
        if (inner) put(o, x, y, this.sdf[k] < 0.35 ? mix(out, inner, 0.4) : out);
      }
    return o;
  }
}

// ---------- эх баавгай ----------
/** Нүүрийг (нүд, хоншоор, хацрын сүүдэр) задлахгүй бүхэлд нь 2px зүүн тийш (boss руу) шилжүүлж, баруун хацрыг үсээр
 * нөхнө; гэдэсний цайвар хэсгийг 1px дагуулна. */
function bearTurn(o: Img): Img {
  const a = clone(o);
  const cp = (y: number, x: number, sx: number) => a.d.set(o.d.subarray(at(o, sx, y), at(o, sx, y) + 4), at(a, x, y));
  for (let x = 5; x < 25; x++) cp(10, x, x + 2); // хөмсөг (толгойн хүрээг дарахгүй)
  for (const x of [25, 26]) cp(10, x, 27);
  for (let y = 11; y < 24; y++) {
    for (let x = 4; x < 27; x++) cp(y, x, x + 2);
    for (const x of [27, 28]) cp(y, x, 29);
  }
  for (let x = 9; x < 21; x++) cp(24, x, x + 2); // эрүүний доод мөр
  for (let x = 21; x < 28; x++) put(a, x, 24, OUT);
  const cream = (img: Img, x: number, y: number) => has(img, x, y) && get(img, x, y)[0] > 230 && get(img, x, y)[1] > 150;
  const fur = (img: Img, x: number, y: number) => {
    const [r, g, b] = get(img, x, y);
    return has(img, x, y) && r >= 120 && r <= 215 && g >= 60 && g <= 140 && b < 110;
  };
  const belly: P[] = [];
  for (let y = 31; y < 48; y++) for (let x = 9; x < 25; x++) if (cream(o, x, y)) belly.push([x, y]);
  for (const [x, y] of belly) put(a, x, y, [182, 107, 69]);
  for (const [x, y] of belly) if (fur(a, x - 1, y) || cream(a, x - 1, y)) cp(y, x - 1, x);
  return a;
}

function centered(src: Img): Img {
  const b = blank(FW, FH);
  for (let y = 0; y < src.h; y++) b.d.set(src.d.subarray(y * src.w * 4, (y + 1) * src.w * 4), at(b, BX, y));
  return b;
}

/** мөрийг `dx` pixel хэвтээ шилжүүлнэ */
function shiftRow(src: Img, dst: Img, y: number, dx: number) {
  for (let x = 0; x < FW; x++) if (x - dx >= 0 && x - dx < FW) dst.d.set(src.d.subarray(at(src, x - dx, y), at(src, x - dx, y) + 4), at(dst, x, y));
}

/** бөхийх: толгой+ороолт `dx`, цээж dx/2 */
function lean(a: Img, dx: number): Img {
  const b = blank(FW, FH);
  for (let y = 0; y < FH; y++) shiftRow(a, b, y, y <= 30 ? dx : y <= 44 ? Math.trunc(dx / 2) : 0);
  return b;
}

/** амьсгал: толгой, ороолт 1px доош */
function breathe(a: Img): Img {
  const b = clone(a);
  b.d.copyWithin(at(b, 0, 1), at(a, 0, 0), at(a, 0, 30));
  b.d.fill(0, 0, at(b, 0, 1));
  return b;
}

/** гар, хөлгүй их бие; огтолсон ирмэг бүр хүрээтэй */
function torso(a: Img): Img {
  const b = clone(a);
  for (const [ys, sep] of Object.entries(SEP)) {
    const y = Number(ys);
    for (let x = 0; x < FW; x++) if (x < BX + sep || x >= BX + 34 - sep) put(b, x, y, [0, 0, 0], 0);
    for (const x of [BX + sep, BX + 33 - sep]) if (has(b, x, y)) put(b, x, y, OUT);
  }
  b.d.fill(0, at(b, 0, LEG_CUT));
  // хөлийг огтолсон доод ирмэг: зөөлөн зураас (хөл үүний ард)
  for (let x = 0; x < FW; x++) if (has(b, x, LEG_CUT - 1) && !same(get(b, x, LEG_CUT - 1), OUT)) put(b, x, LEG_CUT - 1, LINE);
  return b;
}

function shiftY(a: Img, dy: number): Img {
  const b = blank(a.w, a.h);
  const row = a.w * 4;
  if (dy >= 0) b.d.set(a.d.subarray(0, (a.h - dy) * row), dy * row);
  else b.d.set(a.d.subarray(-dy * row), 0);
  return b;
}

// ---------- гар, хөл, ороолт ----------
interface ArmOpts {
  far?: boolean;
  claws?: boolean;
  palm?: P;
  z?: number;
  ghost?: boolean;
}

/** Мөр → тохой → сарвуу. Хол гар биеийн ард, нэг шат бараан; smear-ийн сүүдэр (`ghost`) нарийн, цайвар. */
function arm(l: Layer, sh: P, [elbow, paw]: Limb, o: ArmOpts = {}): P {
  const bias = o.far ? -1.4 : o.ghost ? 2.6 : 0;
  const z0 = o.far ? -14 : (o.z ?? 8);
  const pid = o.far ? 30 : o.ghost ? 60 : 20;
  const k = o.ghost ? 0.7 : 1;
  if (!o.ghost) l.ball(sh, 3.6, 3.6, FUR, z0 - 1, pid, bias);
  l.capsule(sh, elbow, 3.5 * k, 3.2 * k, FUR, z0, pid, bias);
  l.capsule(elbow, paw, 3.2 * k, 3.0 * k, FUR, z0 + 0.5, pid, bias);
  const n = Math.hypot(paw[0] - elbow[0], paw[1] - elbow[1]) || 1;
  const d: P = [(paw[0] - elbow[0]) / n, (paw[1] - elbow[1]) / n];
  const c: P = [paw[0] + d[0] * 1.2, paw[1] + d[1] * 1.2];
  l.ball(c, 3.4 * k, 3.3 * k, FUR, z0 + 1.5, pid + 1, bias + 0.3, o.palm ? pads(o.palm[0], o.palm[1]) : undefined);
  if (o.claws)
    for (const s of [-1, 0, 1]) {
      // гурван хумс: сарвууны үзүүрээс сэнс хэлбэрээр
      const base: P = [c[0] + d[0] * 2.6 - d[1] * s * 1.9, c[1] + d[1] * 2.6 + d[0] * s * 1.9];
      const tip: P = [base[0] + d[0] * 3.2 - d[1] * s * 0.8, base[1] + d[1] * 3.2 + d[0] * s * 0.8];
      l.capsule(base, tip, 0.95, 0.55, CLAW, z0 + 4, pid + 2, 0.4);
    }
  return c;
}

/** 2 ястай IK: өвдөг урагш (зүүн тийш) нугарна; хүрэхгүй бол шагайг ташаа руу татна. */
function knee(hip: P, ankle: P, straight: boolean): Limb {
  const reach = THIGH + SHIN - 0.05;
  let n = Math.hypot(ankle[0] - hip[0], ankle[1] - hip[1]) || 1e-6;
  if (n > reach) {
    ankle = [hip[0] + ((ankle[0] - hip[0]) / n) * reach, hip[1] + ((ankle[1] - hip[1]) / n) * reach];
    n = reach;
  }
  const mid: P = [(hip[0] + ankle[0]) / 2, (hip[1] + ankle[1]) / 2];
  if (straight) return [mid, ankle];
  const h = Math.sqrt(Math.max(0, THIGH ** 2 - (n / 2) ** 2));
  let px = (ankle[1] - hip[1]) / n;
  let py = -(ankle[0] - hip[0]) / n;
  if (px > 0) [px, py] = [-px, -py];
  return [[mid[0] + px * h, mid[1] + py * h], ankle];
}

interface LegOpts {
  far?: boolean;
  sole?: boolean;
  straight?: boolean;
}

/** Ташаа → өвдөг → шагай, тавхай `toe` (−1 зүүн/урагш) тийш. `sole` = арагш өргөсөн тавхайн ул (дэвсгэр) харагдана. */
function leg(l: Layer, hip: P, ankle: P, toe: number, o: LegOpts = {}) {
  const [kn, an] = knee(hip, ankle, !!o.straight);
  const bias = o.far ? -1.1 : -0.3;
  const z0 = o.far ? -9 : -6;
  const pid = o.far ? 50 : 40;
  l.capsule(hip, kn, 4.4, 3.8, FUR, z0, pid, bias);
  l.capsule(kn, an, 3.8, 3.4, FUR, z0 + 0.5, pid, bias);
  l.ball([an[0] + toe * 1.6, an[1] + 1.4], 4.6, 2.9, FUR, z0 + 1.2, pid + 1, bias + 0.2, o.sole ? pads(-toe, 0.3, 0.05) : pads(-toe * 0.2, 1, 0.45));
}

/** ороолтын үзүүр (secondary motion): `ang` чиглэлд (0 = арагш, эерэг = доош) долгилж намирна */
interface Scarf {
  ang: number;
  wave: number;
  phase: number;
  len: number;
}
function scarf(l: Layer, from: P, s: Scarf) {
  let [x, y] = from;
  for (let i = 0; i < s.len; i++) {
    const a = s.ang + s.wave * Math.sin(s.phase + i * 1.15) * ((i + 1) / s.len);
    const nx = x + Math.cos(a) * 2;
    const ny = y + Math.sin(a) * 2;
    l.capsule([x, y], [nx, ny], 1.75 - (i / s.len) * 0.6, 1.75 - ((i + 1) / s.len) * 0.6, SCARF, -7, 70, 0.3);
    if (i % 3 === 1) l.dot([(x + nx) / 2, (y + ny) / 2], GOLD, -2, 71); // алтан толбо
    [x, y] = [nx, ny];
  }
}

// ---------- эффект ----------
function glow(img: Img, p: P, kind: 'spark' | 'star' | 'burst'): Img {
  const o = clone(img);
  const r = (n: number) => Array.from({ length: 2 * n + 1 }, (_, i) => i - n);
  const pts: [number, number, RGB][] = {
    spark: [[0, 0, WHITE], [-1, -1, LEMON], [1, 1, LEMON], [1, -1, STAR]] as [number, number, RGB][],
    star: [
      ...r(3).map((d): [number, number, RGB] => [0, d, LEMON]),
      ...r(3).map((d): [number, number, RGB] => [d, 0, LEMON]),
      [-1, -1, STAR], [1, -1, STAR], [-1, 1, STAR], [1, 1, STAR], [0, 0, WHITE],
    ] as [number, number, RGB][],
    burst: [
      ...r(4).map((d): [number, number, RGB] => [d, 0, WHITE]),
      ...r(4).map((d): [number, number, RGB] => [0, d, WHITE]),
      [-2, -2, LEMON], [2, -2, LEMON], [-2, 2, LEMON], [2, 2, LEMON],
      [-3, -3, STAR], [3, -3, STAR], [-3, 3, STAR], [3, 3, STAR],
    ] as [number, number, RGB][],
  }[kind];
  for (const [dx, dy, c] of pts) put(o, Math.trunc(p[0]) + dx, Math.trunc(p[1]) + dy, c);
  return o;
}

/** хурдан хөдөлгөөний ул мөр: сарвууны замаар 1px цагаан → шар нум */
function smear(img: Img, path: P[]): Img {
  const o = clone(img);
  path.forEach(([x, y], i) => {
    const px = Math.round(x);
    const py = Math.round(y);
    if (!has(o, px, py)) put(o, px, py, i < path.length * 0.6 ? WHITE : LEMON);
  });
  return o;
}

/** тоос: жижиг (1) → том (2) → сарних (3) */
function dust(img: Img, x: number, y: number, size: 1 | 2 | 3) {
  const pts = {
    1: [[0, 0, 1], [1, -1, 2], [2, 0, 0]],
    2: [[0, 0, 0], [1, 0, 1], [1, -1, 2], [2, -1, 1], [3, 0, 0], [2, -2, 2], [0, -1, 1]],
    3: [[0, 0, 0], [2, -1, 1], [4, -2, 2], [5, 0, 0], [3, -3, 1]],
  }[size];
  for (const [dx, dy, c] of pts) if (!has(img, x + dx, y + dy)) put(img, x + dx, y + dy, DUST[c], 235);
}

/** гарын сүүдэр бие дээр: гэрэл зүүн дээрээс тул баруун доош 1–2px шилжинэ */
function castShadow(img: Img, front: Img): Img {
  const o = clone(img);
  for (let y = 0; y < FH; y++)
    for (let x = 0; x < FW; x++) {
      if (!has(img, x, y) || has(front, x, y) || !(has(front, x - 1, y - 1) || has(front, x - 2, y - 1))) continue;
      const c = get(img, x, y);
      if (!isLine(c)) put(o, x, y, darker(c, 0.8));
    }
  return o;
}

/** selective outline: гэрэл тусах (зүүн, дээд) талын гадна хар хүрээг дотор өнгөний бараан хувилбараар солино */
function selout(img: Img): Img {
  const o = clone(img);
  for (let y = 0; y < FH; y++)
    for (let x = 0; x < FW; x++) {
      if (!has(img, x, y) || !isLine(get(img, x, y))) continue;
      let nx = 0;
      let ny = 0;
      for (const [dx, dy] of N4)
        if (!has(img, x + dx, y + dy)) {
          nx += dx;
          ny += dy;
        }
      if ((!nx && !ny) || (nx * -0.6 + ny * -0.8) / Math.hypot(nx, ny) < 0.3) continue;
      const ix = x - Math.sign(nx);
      const iy = y - Math.sign(ny);
      if (has(img, ix, iy) && !isLine(get(img, ix, iy))) put(o, x, y, darker(get(img, ix, iy), 0.5));
    }
  return o;
}

/** газрын сүүдэр: хөлийн доор зууван, ирмэг нь dither, хагас тунгалаг (ямар ч дэвсгэр дээр) */
function ground(img: Img, cx: number, rx: number) {
  for (let y = FEET - 2; y < FH; y++)
    for (let x = 0; x < FW; x++) {
      const u = (x + 0.5 - cx) / rx;
      const v = (y + 0.5 - (FEET + 0.9)) / 1.8;
      const q = u * u + v * v;
      if (q > 1 || has(img, x, y) || (q > 0.6 && (x + y) % 2)) continue;
      put(img, x, y, SHADOW, q > 0.6 ? 70 : 105);
    }
}

// ---------- pose ----------
type Legs = (l: Layer, bob: number) => readonly [number, number];

interface Pose {
  src: Img;
  near: Limb;
  far?: Limb;
  lean?: number;
  /** их бие, гар доош (хөл газраа үлдэнэ) */
  bob?: number;
  claws?: boolean;
  palm?: P;
  ghosts?: Limb[];
  legs?: Legs;
  scarf?: Scarf;
}

const IDLE_NEAR: Limb = [
  [BX + 3, 40],
  [BX + 3, 44],
];
const IDLE_FAR: Limb = [
  [BX + 30, 40],
  [BX + 30, 44],
];
/** толгойн зүүн хажууд өргөсөн гар (нүүрийг халхлахгүй) */
const UP: Limb = [
  [BX - 1, 30],
  [BX - 3, 22],
];
const CLAW_UP: Limb = [
  [BX - 1, 29],
  [BX - 2, 21],
];
const down = ([e, p]: Limb, dy: number): Limb => [
  [e[0], e[1] + dy],
  [p[0], p[1] + dy],
];

/** зогсох хөл: `straight` бол шулуун, үгүй бол (бие доош суухад) өвдөг нугарна */
const stand =
  (spread = 0, straight = true): Legs =>
  (l, bob) => {
    const a1 = HIPS[0][0] - 1 - spread;
    const a2 = HIPS[1][0] + 1 + spread;
    leg(l, [HIPS[0][0], HIPS[0][1] + bob], [a1, ANKLE_Y], -1, { straight });
    leg(l, [HIPS[1][0], HIPS[1][1] + bob], [a2, ANKLE_Y], 1, { far: true, straight });
    return [a1, a2];
  };

/** Хол гар + хөл + ороолт (биеийн ард) → их бие → smear → ойр гар (сүүдэртэй). Ойр гар арагш доош савлахдаа биеийн ард. */
function figure(p: Pose): { img: Img; paw: P; feet: readonly [number, number] } {
  const ln = p.lean ?? 0;
  const bob = p.bob ?? 0;
  const body = shiftY(torso(lean(centered(p.src), ln)), bob);
  const sx = Math.trunc(ln / 2);
  const mv = (q: P): P => [q[0] + sx, q[1] + bob];
  const limb = ([e, w]: Limb): Limb => [mv(e), mv(w)];
  const sh = mv(NEAR_SH);
  const near = limb(p.near);
  const back = new Layer();
  arm(back, mv(FAR_SH), limb(p.far ?? IDLE_FAR), { far: true });
  const feet = (p.legs ?? stand())(back, bob);
  if (p.scarf) scarf(back, [NECK[0] + ln, NECK[1] + bob], p.scarf);
  const behind = near[1][0] > sh[0] + 2 && near[1][1] > sh[1];
  let paw = near[1];
  if (behind) paw = arm(back, sh, near, { z: -10, claws: p.claws, palm: p.palm });
  let img = over(back.img(), body);
  if (p.ghosts?.length) {
    const g = new Layer();
    for (const q of p.ghosts) arm(g, sh, limb(q), { ghost: true });
    img = over(img, g.img(FUR[1]));
  }
  if (!behind) {
    const f = new Layer();
    paw = arm(f, sh, near, { claws: p.claws, palm: p.palm });
    const fi = f.img();
    img = over(castShadow(img, fi), fi);
  }
  return { img, paw, feet };
}

/** selective outline → (цагаан анивчилт) → газрын сүүдэр. `air` = агаарт (сүүдэр жижиг). */
function finish(img: Img, feet: readonly [number, number], o: { air?: boolean; white?: boolean } = {}): Img {
  const f = selout(img);
  if (o.white) for (let i = 0; i < f.d.length; i += 4) if (f.d[i + 3]) f.d.set([255, 255, 255], i);
  ground(f, (feet[0] + feet[1]) / 2, Math.abs(feet[1] - feet[0]) / 2 + (o.air ? 4 : 6));
  return f;
}

// ---------- frame-ууд ----------
const source = (n: string) => readPng(new URL(`${n}.png`, SPRITES));
const straight = source('map_bear');
const base = bearTurn(straight);
const blinkSrc = bearTurn(source('map_bear_blink'));

const frames: { name: string; duration: number; img: Img }[] = [];
const add = (name: string, duration: number, img: Img) => frames.push({ name, duration, img });
const done = (r: ReturnType<typeof figure>, o?: Parameters<typeof finish>[2]) => finish(r.img, r.feet, o);

// зогсох: амьсгалд гар эхэлж суугаад толгой дагана (overlapping action); ping-pong
add('idle', 520, done(figure({ src: base, near: IDLE_NEAR })));
add('breatheA', 150, done(figure({ src: base, near: down(IDLE_NEAR, 1), far: down(IDLE_FAR, 1) })));
add('breatheB', 520, done(figure({ src: breathe(base), near: down(IDLE_NEAR, 1), far: down(IDLE_FAR, 1) })));
add('blink', 130, done(figure({ src: blinkSrc, near: IDLE_NEAR })));

// од шидэх: гараа хажуугаар өргөх → толгойн хажууд оч → цэнэглэх (удаан) → smear (50ms) → гаргах → дагах → буцах
add('raise', 120, done(figure({ src: base, near: [[BX + 1, 38], [BX, 32]], lean: 1, palm: [-1, 0], scarf: { ang: 0.9, wave: 0.15, phase: 0, len: 4 } })));
let r = figure({ src: base, near: [[BX - 1, 31], [BX - 2, 24]], lean: 2, palm: [0, -1], scarf: { ang: 0.75, wave: 0.2, phase: 0.8, len: 4 } });
add('spark', 110, finish(glow(r.img, r.paw, 'spark'), r.feet));
r = figure({ src: base, near: UP, lean: 2, palm: [0, -1], scarf: { ang: 0.6, wave: 0.25, phase: 1.6, len: 5 } });
add('charge', 170, finish(glow(r.img, r.paw, 'star'), r.feet));
r = figure({ src: base, near: [[BX - 1, 31], [BX - 5, 28]], lean: -1, ghosts: [UP], scarf: { ang: 0.1, wave: 0.45, phase: 2.4, len: 6 } });
add('throwSmear', 50, finish(smear(r.img, Array.from({ length: 10 }, (_, i): P => [BX - 4 - i * 0.25, 19 + i * 0.9])), r.feet));
r = figure({ src: base, near: [[BX, 33], [BX - 5, 32]], lean: -2, palm: [-1, 0], scarf: { ang: 0, wave: 0.5, phase: 3.2, len: 6 } });
const PAW = r.paw;
add('release', 110, finish(glow(r.img, r.paw, 'burst'), r.feet));
add('follow', 130, done(figure({ src: base, near: [[BX + 1, 38], [BX - 3, 41]], lean: -1, scarf: { ang: 0.35, wave: 0.35, phase: 4, len: 5 } })));
add('recover', 120, done(figure({ src: base, near: [[BX + 2, 39], [BX + 2, 43]], scarf: { ang: 0.85, wave: 0.2, phase: 4.8, len: 4 } })));

// сарвуудах: хумсаа өргөх → smear → цохих (hit-stop-ын хугацаанд барина) → буцах
add('clawUp', 150, done(figure({ src: base, near: CLAW_UP, lean: 1, claws: true, palm: [-1, 0], scarf: { ang: 0.6, wave: 0.25, phase: 0, len: 5 } })));
r = figure({ src: base, near: [[BX - 1, 32], [BX - 6, 33]], lean: -2, claws: true, ghosts: [CLAW_UP], scarf: { ang: 0.05, wave: 0.5, phase: 2, len: 6 } });
let img = r.img;
for (let k = 0; k < 3; k++) img = smear(img, Array.from({ length: 9 }, (_, i): P => [BX - 3 - k * 1.3 + i * 0.1, 17 + k * 1.2 + i * 1.5]));
add('clawSmear', 50, finish(img, r.feet));
add('claw', 220, done(figure({ src: base, near: [[BX, 37], [BX - 4, 42]], lean: -2, claws: true, legs: stand(1), scarf: { ang: 0.25, wave: 0.4, phase: 3.2, len: 6 } })));
add('clawRecover', 110, done(figure({ src: base, near: [[BX + 2, 39], [BX + 1, 43]], lean: -1, scarf: { ang: 0.7, wave: 0.25, phase: 4.2, len: 5 } })));

// цохиулах: цагаан анивчих → цочиж гараа дээш, ороолт дээш хийснэ
r = figure({
  src: blinkSrc,
  near: [[BX + 1, 32], [BX - 1, 28]],
  far: [[BX + 32, 33], [BX + 35, 29]],
  lean: 2,
  legs: stand(1),
  scarf: { ang: -0.35, wave: 0.4, phase: 0.5, len: 6 },
});
add('flash', 120, done(r, { white: true }));
add('hurt', 440, done(r));

// эргэх агшин: урагшаа харсан эх баавгай (нүүр шилжүүлээгүй)
add('front', 110, done(figure({ src: straight, near: IDLE_NEAR })));

// гүйж эхлэх (anticipation): бие суугаад урагш бөхийж, ойр гар арагш
const ARM: Record<string, Limb> = {
  back: [[3, 5], [5, 8]],
  back2: [[2, 5], [4, 9]],
  mid: [[0, 5], [-1, 9]],
  fwd: [[-4, 3], [-7, 0]],
  fwd2: [[-3, 4], [-6, 2]],
};
/** мөрнөөс харьцангуй гар (бөхийлтөөр мөр 1px урагш) */
const rel = (sh: P, name: string): Limb => [
  [sh[0] - 1 + ARM[name][0][0], sh[1] + ARM[name][0][1]],
  [sh[0] - 1 + ARM[name][1][0], sh[1] + ARM[name][1][1]],
];
add('ready', 120, done(figure({ src: base, near: rel(NEAR_SH, 'back'), far: rel(FAR_SH, 'fwd2'), lean: -1, bob: 1, legs: stand(1, false), scarf: { ang: 0.95, wave: 0.15, phase: 0, len: 5 } })));

// 2 хөлөөр гүйх, 8 frame (зүүн тийш): 0 ойр хөл урагш газардах, 1 суух, 2 нөгөө хөл өвдгөө өргөж өнгөрөх, 3 түлхэж
// агаарт, 4–7 нөгөө хөлөөр давтана. Хөл: (шагай ташаанаас dx, газраас өргөх); гар эсрэг хөлтэйгөө савлана.
type Stride = readonly [number, P, P, string, string];
const STRIDE: Stride[] = [
  [0, [-5, 0], [6, 3], 'back', 'fwd'],
  [1, [-2, 0], [5, 5], 'back2', 'fwd2'],
  [0, [1, 0], [0, 6], 'mid', 'mid'],
  [-1, [5, 2], [-5, 3], 'fwd', 'back'],
];
const RUN = [...STRIDE, ...STRIDE.map(([b, nl, fl, na, fa]): Stride => [b, fl, nl, fa, na])];
RUN.forEach(([bob, nl, fl, na, fa], k) => {
  const legs: Legs = (l, b) => {
    const both = [
      [HIPS[0], nl, false],
      [HIPS[1], fl, true],
    ] as const;
    for (const [hip, [dx, lift], far] of both) leg(l, [hip[0], hip[1] + b], [hip[0] + dx, ANKLE_Y - lift], -1, { far, sole: lift > 0 && dx > 2 });
    return [HIPS[0][0] + nl[0], HIPS[1][0] + fl[0]];
  };
  const f = figure({
    src: base,
    near: rel(NEAR_SH, na),
    far: rel(FAR_SH, fa),
    lean: -2,
    bob,
    legs,
    palm: na === 'fwd' ? [1, 0] : undefined,
    scarf: { ang: 0.15 + bob * 0.08, wave: 0.55, phase: k * 0.9, len: 6 },
  });
  // газардах агшинд өмнөх алхмын тоос арагш үлдэж томроод сарна
  const heel = (k < 4 ? HIPS[1][0] : HIPS[0][0]) + 8;
  if (k % 4 === 0) dust(f.img, heel, 59, 1);
  if (k % 4 === 1) dust(f.img, heel + 2, 59, 2);
  if (k % 4 === 2) dust(f.img, heel + 4, 59, 3);
  add(`run${k}`, 96, finish(f.img, f.feet, { air: bob < 0 }));
});

// тоормослох: бие арагш налж, ойр хөл урагш гулсаж, гар тэнцвэр барина; ороолт инерцээрээ урагш дээш хийснэ
const brake = figure({
  src: base,
  near: [[BX, 36], [BX - 4, 35]],
  far: rel(FAR_SH, 'back'),
  lean: 1,
  bob: 1,
  legs: (l, b) => {
    leg(l, [HIPS[0][0], HIPS[0][1] + b], [HIPS[0][0] - 6, ANKLE_Y], -1);
    leg(l, [HIPS[1][0], HIPS[1][1] + b], [HIPS[1][0] + 2, ANKLE_Y - 1], -1, { far: true });
    return [HIPS[0][0] - 6, HIPS[1][0] + 2];
  },
  scarf: { ang: -0.5, wave: 0.35, phase: 1, len: 6 },
});
dust(brake.img, HIPS[0][0] - 13, 59, 2);
dust(brake.img, HIPS[0][0] - 9, 60, 1);
add('brake', 130, finish(brake.img, brake.feet));

// ---------- grid sheet + JSON (pixel-art-exporter) ----------
const index = (name: string) => frames.findIndex((f) => f.name === name);
const tag = (from: string, to = from, direction = 'forward') => ({ from: index(from), to: index(to), direction });
const tags = {
  idle: tag('idle', 'breatheB', 'pingpong'),
  blink: tag('blink'),
  throw: tag('raise', 'recover'),
  claw: tag('clawUp', 'clawRecover'),
  hurt: tag('flash', 'hurt'),
  turn: tag('front'),
  ready: tag('ready'),
  run: tag('run0', 'run7'),
  brake: tag('brake'),
};
const rows = Math.ceil(frames.length / COLS);
const sheet = blank(COLS * FW, rows * FH);
frames.forEach(({ img: f }, i) => {
  for (let y = 0; y < FH; y++) sheet.d.set(f.d.subarray(y * FW * 4, (y + 1) * FW * 4), at(sheet, (i % COLS) * FW, Math.floor(i / COLS) * FH + y));
});

const preview = process.argv.indexOf('--preview');
if (preview < 0) {
  writePng(new URL('bear_battle.png', SPRITES), sheet);
  const meta = {
    sheet: 'bear_battle',
    frameSize: { w: FW, h: FH },
    columns: COLS,
    feet: FEET,
    pad: BX,
    paw: [Math.round(PAW[0]), Math.round(PAW[1])],
    frames: frames.map(({ name, duration }) => ({ name, duration })),
    tags,
  };
  writeFileSync(META, `${JSON.stringify(meta, null, 2)}\n`);
  console.log(`bear_battle: ${frames.length} frame (${COLS}×${rows}), ${Object.keys(tags).length} tag`);
} else {
  const dir = `${process.argv[preview + 1]}/`;
  const scale = (a: Img, k: number) => {
    const o = blank(a.w * k, a.h * k);
    for (let y = 0; y < o.h; y++) for (let x = 0; x < o.w; x++) o.d.set(a.d.subarray(at(a, Math.floor(x / k), Math.floor(y / k)), at(a, Math.floor(x / k), Math.floor(y / k)) + 4), at(o, x, y));
    return o;
  };
  /** `fr`-ийг дэвсгэр дээр alpha-тай давхарлана (`mirror` = буцаж гүйх) */
  const compose = (bg: Img, fr: Img, x0: number, y0: number, mirror = false) => {
    const o = clone(bg);
    for (let y = 0; y < fr.h; y++)
      for (let x = 0; x < fr.w; x++) {
        const i = at(fr, mirror ? fr.w - 1 - x : x, y);
        const a = fr.d[i + 3] / 255;
        if (!a || !has(o, x0 + x, y0 + y)) continue;
        const j = at(o, x0 + x, y0 + y);
        for (let c = 0; c < 3; c++) o.d[j + c] = Math.round(fr.d[i + c] * a + o.d[j + c] * (1 - a));
      }
    return o;
  };
  // contact sheet: бүх frame 8×, хар ягаан дэвсгэр дээр
  const bgSheet = blank(sheet.w, sheet.h);
  for (let y = 0; y < sheet.h; y++) for (let x = 0; x < sheet.w; x++) put(bgSheet, x, y, (x + y) % 2 ? hex('#3b3f6b') : hex('#41467a'));
  writePng(`${dir}bear_contact.png`, scale(compose(bgSheet, sheet, 0, 0), 8));
  // boss-ын гэр (lair_0) дээр tag бүрийн APNG: газар нь гэрийн 181-р мөр (BossArena-ийн GROUND)
  const lair = source('lair_0');
  const W = 176;
  const bg = blank(W, 96);
  for (let y = 0; y < 96; y++) bg.d.set(lair.d.subarray(at(lair, 20, 100 + y), at(lair, 20 + W, 100 + y)), at(bg, 0, y));
  const top = 181 - 100 - FEET;
  const shot = (steps: { f: string; x: number; mirror?: boolean; ms?: number }[], name: string) =>
    writeApng(
      `${dir}${name}.png`,
      steps.map((s) => scale(compose(bg, frames[index(s.f)].img, Math.round(s.x), top, s.mirror), 4)),
      steps.map((s) => s.ms ?? frames[index(s.f)].duration),
    );
  const HOME = 112;
  const FOE = 30;
  const seq = (t: keyof typeof tags) => Array.from({ length: tags[t].to - tags[t].from + 1 }, (_, i) => frames[tags[t].from + i].name);
  shot([...['idle', 'breatheA', 'breatheB', 'breatheA', 'idle', 'blink', 'idle'].map((f) => ({ f, x: HOME }))], 'preview_idle');
  shot([{ f: 'idle', x: HOME, ms: 300 }, ...seq('throw').map((f) => ({ f, x: HOME })), { f: 'idle', x: HOME, ms: 400 }], 'preview_throw');
  shot([{ f: 'idle', x: HOME, ms: 300 }, ...seq('hurt').map((f) => ({ f, x: HOME })), { f: 'idle', x: HOME, ms: 400 }], 'preview_hurt');
  // ойроос сарвуудах: бэлдэх → гүйх (10 frame, ease in-out) → тоормослох → сарвуудах → эргэх → толин тусгалаар буцах
  const ease = (t: number) => 0.5 - Math.cos(Math.PI * t) / 2;
  const go = (n: number, from: number, to: number, mirror: boolean) =>
    Array.from({ length: n }, (_, i) => ({ f: `run${i % 8}`, x: from + (to - from) * ease((i + 1) / (n + 1)), mirror }));
  shot(
    [
      { f: 'idle', x: HOME, ms: 300 },
      { f: 'ready', x: HOME + 1 },
      ...go(9, HOME, FOE, false),
      { f: 'brake', x: FOE },
      ...seq('claw').map((f) => ({ f, x: FOE })),
      { f: 'front', x: FOE },
      ...go(7, FOE, HOME, true),
      { f: 'brake', x: HOME, mirror: true },
      { f: 'front', x: HOME },
      { f: 'idle', x: HOME, ms: 500 },
    ],
    'preview_claw',
  );
  console.log(`preview: ${dir}`);
}
