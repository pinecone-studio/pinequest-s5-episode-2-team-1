/**
 * Хичээлийн дэлгэцийн баавгай ба дэвсгэр: урагшаа харсан «манай баавгай»-н frame-ууд (bear_lesson.png, 7 баганатай
 * grid) + metadata (mobile/src/lib/pixelBear/bear-lesson.json) + хичээлийн булан (lesson_bg.png). Rig: ./bear-rig.ts.
 *
 *   pixel-art-creator: 132×156 px дэвсгэр (3×-ээр 396×468 dp): ягаан-нил хана, нар жаргах цонх, хөшиг, номын тавиур,
 *     модон шал, хивс. Баавгай газар дээрээ зогсоно (хөвөхгүй).
 *   pixel-art-animator: tag бүр frame-ийн өөр өөр хугацаатай. Зөв: суух (бэлдэх) → үсрэх → оргил (од) → буух
 *     (squash) → гараа даллах. Буруу: цочих → бөхийх (хөлс) → толгой сэгсрэх → гунигтай. Бодох: эрүүгээ барих.
 *   pixel-art-professional: Bayer dither-тэй gradient, hue-shift-тэй шат, цонхны гэрэл шалан дээр, selective outline.
 *   pixel-art-exporter: grid sheet + JSON + APNG урьдчилсан харагдац (дэвсгэр дээр, 3×).
 *
 * Ажиллуулах:  npm run sprites:lesson && npm run sprites   (mobile/)
 * Шалгах:      node scripts/lesson-sprites.ts --preview <dir>
 */
import { writeFileSync } from 'node:fs';
import {
  BAYER,
  breathe,
  BX,
  compose,
  contact,
  down,
  FEET,
  FH,
  figure,
  type Frame,
  FW,
  glow,
  hex,
  IDLE_FAR,
  IDLE_NEAR,
  type Limb,
  type P,
  put,
  type RGB,
  ramp,
  scale,
  selout,
  SHADOW,
  source,
  SPRITES,
  stand,
  tagOf,
  toSheet,
} from './bear-rig.ts';
import { blank, type Img, writeApng, writePng } from './png.ts';

const META = new URL('../src/lib/pixelBear/bear-lesson.json', import.meta.url);
const COLS = 7;

// ---------- баавгай (урагшаа харсан) ----------
const front = source('map_bear');
const shut = source('map_bear_blink');

const DROP = ramp('#2a3f7a', '#7cc8ff', '#e8f8ff');
/** хөлсний дусал (3×5): хүрээ, дүүргэлт, гялбаа */
function sweat(img: Img, x: number, y: number) {
  const shape = ['.o.', 'olo', 'ofo', 'ofo', '.o.'];
  shape.forEach((row, dy) =>
    [...row].forEach((ch, dx) => {
      if (ch !== '.') put(img, x + dx, y + dy, DROP[ch === 'o' ? 0 : ch === 'f' ? 1 : 2]);
    }),
  );
}

/** selective outline → од, хөлс. Газрын сүүдэр frame-д байхгүй: үсрэхэд апп баавгайг дээш (translateY) зөөлөн
 * өргөж, тусдаа сүүдрийг (lesson_shadow) жижигрүүлнэ, тиймээс толгой frame-ээс тайрагдахгүй. */
function done(r: ReturnType<typeof figure>, o: { drop?: P; stars?: P[] } = {}): Img {
  let img = selout(r.img);
  for (const s of o.stars ?? []) img = glow(img, s, 'star');
  if (o.drop) sweat(img, o.drop[0], o.drop[1]);
  return img;
}

/** `lift` = газраас өргөх өндөр (px): апп frame гарах агшинд тэр өндөрт зөөлөн (ease) хүргэнэ */
const frames: (Frame & { lift: number })[] = [];
const add = (name: string, duration: number, img: Img, lift = 0) => frames.push({ name, duration, img, lift });

/** хоёр гар (ойр, хол) мөрнөөс тэгш хэмтэй: `dx`, `dy` = тохой, сарвууны мөрнөөс шилжилт (ойр гар зүүн тийш) */
const both = (elbow: P, paw: P): [Limb, Limb] => [
  [
    [BX + 6 + elbow[0], 35 + elbow[1]],
    [BX + 6 + paw[0], 35 + paw[1]],
  ],
  [
    [BX + 27 - elbow[0], 35 + elbow[1]],
    [BX + 27 - paw[0], 35 + paw[1]],
  ],
];
const [UP_N, UP_F] = both([-5, -5], [-7, -13]); // хоёр гараа V хэлбэрээр дээш
const [WAVE_N, WAVE_F] = both([-6, -3], [-5, -11]); // даллах: сарвуу дотогш
const [LOW_N, LOW_F] = both([-2, 6], [1, 11]); // гунигтай: гар унжиж урагшаа
const [BACK_N, BACK_F] = both([-3, 5], [-4, 9]); // суухад гар арагш доош
const [STARTLE_N, STARTLE_F] = both([-5, 2], [-1, -4]); // цочиход гараа цээжиндээ

// зогсох: амьсгалд гар эхэлж суугаад толгой дагана (overlapping action); ping-pong
add('idle', 520, done(figure({ src: front, near: IDLE_NEAR })));
add('breatheA', 150, done(figure({ src: front, near: down(IDLE_NEAR, 1), far: down(IDLE_FAR, 1) })));
add('breatheB', 520, done(figure({ src: breathe(front), near: down(IDLE_NEAR, 1), far: down(IDLE_FAR, 1) })));
add('blink', 130, done(figure({ src: shut, near: IDLE_NEAR })));

// бодох: сарвуугаар эрүүгээ барьж, хааяа товшино
const CHIN: Limb = [
  [BX + 3, 43],
  [BX + 10, 31],
];
add('think', 700, done(figure({ src: front, near: CHIN })));
add('thinkTap', 220, done(figure({ src: front, near: [CHIN[0], [BX + 10, 32]] })));

// зөв: суух (бэлдэх) → үсрэх → оргил (од) → унах → буух (squash) → даллах
add('crouch', 110, done(figure({ src: front, near: BACK_N, far: BACK_F, bob: 2, legs: stand(1, false) })));
add('jump', 90, done(figure({ src: front, near: UP_N, far: UP_F })), 5);
add('peak', 200, done(figure({ src: front, near: UP_N, far: UP_F }), { stars: [[BX - 2, 20], [BX + 36, 20], [BX + 17, 3]] }), 9);
add('fall', 90, done(figure({ src: front, near: UP_N, far: UP_F })), 4);
add('land', 120, done(figure({ src: front, near: BACK_N, far: BACK_F, bob: 2, legs: stand(1, false) })));
add('waveA', 180, done(figure({ src: front, near: UP_N, far: UP_F }), { stars: [[BX - 3, 14]] }));
add('waveB', 180, done(figure({ src: shut, near: WAVE_N, far: WAVE_F }), { stars: [[BX + 37, 14]] }));

// буруу: цочих → бөхийх (хөлс) → толгой сэгсрэх → гунигтай (бөхийсөн хэвээр)
add('flinch', 140, done(figure({ src: shut, near: STARTLE_N, far: STARTLE_F, legs: stand(1) }), { drop: [BX + 29, 9] }), 1);
add('slump', 260, done(figure({ src: breathe(shut), near: LOW_N, far: LOW_F, bob: 1, legs: stand(0, false) }), { drop: [BX + 29, 11] }));
add('shakeL', 130, done(figure({ src: breathe(front), near: LOW_N, far: LOW_F, bob: 1, lean: -1, legs: stand(0, false) }), { drop: [BX + 28, 12] }));
add('shakeR', 130, done(figure({ src: breathe(front), near: LOW_N, far: LOW_F, bob: 1, lean: 1, legs: stand(0, false) }), { drop: [BX + 30, 12] }));
add('sad', 900, done(figure({ src: breathe(front), near: LOW_N, far: LOW_F, bob: 1, legs: stand(0, false) }), { drop: [BX + 29, 13] }));

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
  idle: tag('idle', 'breatheB', 'pingpong'),
  blink: tag('blink'),
  think: tag('think', 'thinkTap', 'pingpong'),
  cheer: tag('crouch', 'waveB'),
  wave: tag('waveA', 'waveB'),
  oops: tag('flinch', 'sad'),
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
    frameSize: { w: FW, h: FH },
    columns: COLS,
    feet: FEET,
    pad: BX,
    background: { w: BW, h: BH, floor: FLOOR, rug: RUG },
    frames: frames.map(({ name, duration, lift }) => ({ name, duration, lift })),
    tags,
  };
  writeFileSync(META, `${JSON.stringify(meta, null, 2)}\n`);
  console.log(`bear_lesson: ${frames.length} frame, ${Object.keys(tags).length} tag; lesson_bg ${BW}×${BH}`);
} else {
  const dir = `${process.argv[preview + 1]}/`;
  writePng(`${dir}lesson_contact.png`, contact(sheet));
  // дэвсгэр дээр хивсний төвд зогсоосон APNG (3×, апп-тай ижил)
  const at0: P = [RUG[0] - Math.round(FW / 2), RUG[1] - FEET];
  const seq = (t: keyof typeof tags) => {
    const { from, to, direction } = tags[t];
    const f = Array.from({ length: to - from + 1 }, (_, i) => from + i);
    return direction === 'pingpong' ? [...f, ...f.slice(1, -1).reverse()] : f;
  };
  const shot = (ids: number[], name: string) =>
    writeApng(
      `${dir}${name}.png`,
      ids.map((i) => scale(compose(compose(bg, shadow(), RUG[0] - 18, RUG[1] - 2), frames[i].img, at0[0], at0[1] - frames[i].lift), 3)),
      ids.map((i) => frames[i].duration),
    );
  shot([...seq('idle'), ...seq('idle'), tags.blink.from], 'lesson_idle');
  shot([...seq('think'), ...seq('think')], 'lesson_think');
  shot([...seq('idle'), ...seq('cheer'), ...seq('wave'), ...seq('wave'), ...seq('idle')], 'lesson_correct');
  shot([...seq('idle'), ...seq('oops'), ...seq('idle')], 'lesson_wrong');
  writePng(`${dir}lesson_bg_3x.png`, scale(bg, 3));
  console.log(`preview: ${dir}`);
}
