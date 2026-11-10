// Poster-ийн pixel зурах хэрэгсэл (poster-scenes.ts): AI биш, pixel бүрийг кодоор тооцоолно. 400×300 жинхэнэ pixel канвас.
import { blank, type Img } from './png.ts';
import { BAYER, hex, put, type RGB } from './sprite-kit.ts';

export const W = 400;
export const H = 300;
/** шалны дээд мөр: дүрүүдийн хөл үүнээс доош буна */
export const FLOOR = 272;

export const rnd = (n: number) => {
  const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};
/** 4×4 Bayer: t (0..1) хэр олон pixel асахыг заана */
export const on = (x: number, y: number, t: number) => t + BAYER[y & 3][x & 3] > 0.5;
export const get = (img: Img, x: number, y: number): RGB => {
  const i = (y * img.w + x) * 4;
  return [img.d[i], img.d[i + 1], img.d[i + 2]];
};
export const mix = (a: RGB, b: RGB, t: number): RGB => [0, 1, 2].map((i) => Math.round(a[i] + (b[i] - a[i]) * t)) as unknown as RGB;
export const each = (x0: number, y0: number, x1: number, y1: number, f: (x: number, y: number) => void) => {
  for (let y = Math.max(0, Math.floor(y0)); y < Math.min(H, y1); y++) for (let x = Math.max(0, Math.floor(x0)); x < Math.min(W, x1); x++) f(x, y);
};

/** босоо градиент: дараалсан өнгө бүрийн хооронд dither */
export function sky(img: Img, cols: RGB[]) {
  each(0, 0, W, H, (x, y) => {
    const f = Math.min(0.999, y / FLOOR) * (cols.length - 1);
    const i = Math.floor(f);
    put(img, x, y, on(x, y, f - i) ? cols[i + 1] : cols[i]);
  });
}

/** дугуй (сар, нар): гэрлийн эсрэг тал нь `edge`, эргэн тойрон `glow` dither туяа; `rays` > 0 бол туяа цацна */
export function orb(img: Img, cx: number, cy: number, r: number, base: RGB, edge: RGB, glow: RGB, reach: number, rays = 0) {
  each(cx - r - reach, cy - r - reach, cx + r + reach + 1, cy + r + reach + 1, (x, y) => {
    const d = Math.hypot(x - cx, y - cy);
    const fade = 1 - (d - r) / reach;
    const ray = rays && ((Math.atan2(y - cy, x - cx) / (2 * Math.PI)) * rays + 10) % 1 < 0.3;
    // гэрэл зүүн дээрээс: зүүн дээш шилжүүлсэн тойргоос гарсан хэсэг нь хавирган сүүдэр
    if (d <= r) put(img, x, y, Math.hypot(x - cx + r * 0.28, y - cy + r * 0.28) > r * 1.02 ? edge : base);
    else if (d < r + reach && on(x, y, fade * (ray ? 0.95 : 0.6))) put(img, x, y, glow);
  });
}
export const disc = (img: Img, cx: number, cy: number, r: number, c: RGB) => each(cx - r, cy - r, cx + r + 1, cy + r + 1, (x, y) => Math.hypot(x - cx, y - cy) <= r && put(img, x, y, c));

export function stars(img: Img, n: number, maxY: number, cols: RGB[], seed: number) {
  for (let i = 0; i < n; i++) {
    const [x, y] = [Math.floor(rnd(seed + i) * W), Math.floor(rnd(seed + i + 700) * maxY)];
    const c = cols[i % cols.length];
    put(img, x, y, c);
    // зарим од загалмай хэлбэрээр гялалзана
    if (i % 6 === 0) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) put(img, x + dx, y + dy, c);
  }
}

/** сүүдэр дүрс (уул, хот): x бүрийн оройгоос шал хүртэл; орой нь `rim` өнгөөр 1px гэрэлтэнэ */
export function ridge(img: Img, top: (x: number) => number, fill: RGB, rim?: RGB) {
  for (let x = 0; x < W; x++) {
    const t = Math.round(top(x));
    for (let y = Math.max(0, t); y < FLOOR; y++) put(img, x, y, rim && y === t ? rim : fill);
  }
}
export const wave = (x: number, seed: number, f: number) => Math.sin(x * f + seed) * 0.6 + Math.sin(x * f * 2.3 + seed * 1.7) * 0.3 + Math.sin(x * f * 5.1 + seed * 3.1) * 0.1;
/** санамсаргүй өргөн, өндөртэй байшингуудын оройн шугам */
export function blocks(seed: number, min: number, max: number): number[] {
  const tops: number[] = [];
  for (let x = 0, i = 0; x < W; i++) {
    const [w, top] = [10 + Math.floor(rnd(seed + i) * 22), FLOOR - min - Math.floor(rnd(seed + i + 99) * (max - min))];
    for (let k = 0; k < w && x < W; k++, x++) tops[x] = top;
  }
  return tops;
}
/** байшингийн цонхнууд: зөвхөн тэгш оройн дотор, санамсаргүй асна */
export function windows(img: Img, tops: number[], c: RGB, odds: number) {
  for (let x = 2; x < W - 2; x += 4)
    for (let y = tops[x] + 5; y < FLOOR - 4; y += 6)
      if (tops[x - 2] === tops[x] && tops[x + 2] === tops[x] && rnd(x * 31 + y) < odds) [0, 1].forEach((k) => put(img, x, y + k, c));
}

/** олон давхар пагод: давхар бүр нарийсна, дээвэр нь үзүүрээрээ дээш эргэнэ */
export function pagoda(img: Img, cx: number, base: number, tiers: number, w: number, body: RGB, roof: RGB, light: RGB) {
  let y = base;
  for (let t = 0; t < tiers; t++) {
    const bw = w - t * 6;
    each(cx - bw / 2, y - 11, cx + bw / 2, y, (x, yy) => put(img, x, yy, body));
    each(cx - 2, y - 8, cx + 2, y - 4, (x, yy) => put(img, x, yy, light));
    const rw = bw + 12;
    for (let k = 0; k < 3; k++) each(cx - rw / 2 + k * 2, y - 12 - k, cx + rw / 2 - k * 2, y - 11 - k, (x, yy) => put(img, x, yy, roof));
    for (const s of [-1, 1]) [1, 2].forEach((k) => put(img, cx + s * (rw / 2 + k - (s > 0 ? 1 : 0)), y - 12 - k, roof));
    y -= 15;
  }
  each(cx - 1, y - 9, cx + 1, y + 3, (x, yy) => put(img, x, yy, roof));
}

export function cloud(img: Img, cx: number, cy: number, w: number, top: RGB, under: RGB) {
  const bumps = [[-0.36, 0.14, 0.26], [0, -0.02, 0.36], [0.34, 0.1, 0.28], [0.58, 0.22, 0.17], [-0.62, 0.24, 0.16]];
  each(cx - w, cy - w * 0.5, cx + w, cy + w * 0.4, (x, y) => {
    if (y > cy + w * 0.3 || !bumps.some(([dx, dy, r]) => Math.hypot(x - cx - dx * w, y - cy - dy * w) <= r * w)) return;
    put(img, x, y, y > cy + w * 0.12 || (y > cy && on(x, y, 0.5)) ? under : top);
  });
}

export function bolt(img: Img, pts: [number, number][], core: RGB, glow: RGB) {
  for (const pass of [glow, core])
    for (let i = 1; i < pts.length; i++) {
      const [[ax, ay], [bx, by]] = [pts[i - 1], pts[i]];
      for (let s = 0; s <= 1; s += 0.01) {
        const [x, y] = [Math.round(ax + (bx - ax) * s), Math.round(ay + (by - ay) * s)];
        if (pass === core) [0, 1].forEach((k) => put(img, x + k, y, core));
        else each(x - 2, y - 1, x + 4, y + 2, (gx, gy) => on(gx, gy, 0.55) && put(img, gx, gy, glow));
      }
    }
}

/** цамхаг: ханан дээр гэрэлтэй цонх, орой нь шовгор дээвэр (далбаатай) эсвэл шүдлэг хана */
export function tower(img: Img, cx: number, top: number, w: number, wall: RGB, roof: RGB, light: RGB, cone: boolean) {
  each(cx - w / 2, top, cx + w / 2, FLOOR, (x, y) => put(img, x, y, wall));
  for (let y = top + 10; y < FLOOR - 16; y += 16) each(cx - 1, y, cx + 2, y + 5, (x, yy) => put(img, x, yy, light));
  if (!cone) return each(cx - w / 2, top - 3, cx + w / 2, top, (x, y) => (x - cx + w) % 6 < 3 && put(img, x, y, wall));
  const h = Math.round(w * 1.2);
  for (let k = 0; k < h; k++) each(cx - (w / 2 + 2) * (1 - k / h), top - k - 1, cx + (w / 2 + 2) * (1 - k / h), top - k, (x, y) => put(img, x, y, roof));
  each(cx, top - h - 7, cx + 1, top - h, (x, y) => put(img, x, y, roof));
  each(cx + 1, top - h - 7, cx + 6, top - h - 4, (x, y) => put(img, x, y, light));
}

export function sparkle(img: Img, x: number, y: number, n: number, c: RGB) {
  for (let k = -n; k <= n; k++) [put(img, x + k, y, c), put(img, x, y + k, c)];
}

/** урд талын шал: дээд мөр гэрэлтэй, `seam` нь хээ (вааран дээвэр, хад, хавтан чулуу) */
export function floor(img: Img, base: RGB, rim: RGB, seam: RGB, kind: 'tile' | 'rock' | 'stone') {
  each(0, FLOOR, W, H, (x, y) => {
    const r = y - FLOOR;
    const line =
      kind === 'tile' ? r % 7 === 0 || (x + ((r / 7) | 0) * 6) % 12 === 0
      : kind === 'rock' ? rnd(x * 7 + y * 131) < 0.1 || (r % 9 === 0 && on(x, y, 0.4))
      : r % 9 === 0 || (x + ((r / 9) | 0) * 13) % 26 === 0;
    put(img, x, y, r === 0 ? rim : line ? seam : base);
  });
}
