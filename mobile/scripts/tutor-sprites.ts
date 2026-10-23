/**
 * Баавгайтай ярилцах дэлгэцийн (tutor) баавгай: урагшаа харсан frame-ууд (bear_tutor_<n>.png, grid; утасны 4096 px
 * texture-ийн хязгаарт багтахгүй бол хэд хэдэн sheet) + амны хэлбэр (bear_mouth.png: хагас, нээлттэй) + metadata
 * (mobile/src/lib/pixelBear/bear-tutor.json).
 *
 * Баавгай: PixelLab (docs/design/pixel-bear/pixellab/bear.png): idle, think (сонсох) ба ярих үеийн дохио: teach
 * (сарвуугаа өргөж тайлбарлах), point (чухал зүйлийг сарвуугаа өргөж онцлох), present (хоёр сарвуугаа дэлгэж
 * санаа гаргах), shape (хоёр сарвуугаараа цээжний урд санааг «хэлбэржүүлэх»). Дохио бүрийн frame-д амыг хааж (PixelLab зарим frame-д амыг нээсэн
 * байдаг), амны байрлалыг JSON-д бичнэ: апп дуу тоглуулж байх үед түүний чанга байдлаар хагас/нээлттэй амыг давхарлана.
 *
 * Ажиллуулах:  npm run sprites:tutor && npm run sprites   (mobile/)
 * Шалгах:      node scripts/tutor-sprites.ts --preview <dir>
 */
import { writeFileSync } from 'node:fs';
import { blank, type Img, writeApng, writePng } from './png.ts';
import { at, bbox, clone, contact, crop, type Frame, hex, type P, pixellab, SPRITES, scale, tagOf, toSheet, trim } from './sprite-kit.ts';

const META = new URL('../src/lib/pixelBear/bear-tutor.json', import.meta.url);
/** утсанд 4× харуулж 3× нягтралд хадгалдаг тул 1 pixel = 12 texture pixel; texture 4096 px-ээс хэтрэхгүй */
const TEXTURE = Math.floor(4096 / 12);
const GESTURES = ['teach', 'point', 'present', 'shape'] as const;

const bear = pixellab('bear');
const teach = bear.frames('teach', 'south');
const ref = teach[0];

// teach-ийн эхний (хаалттай амтай) frame-ийн нүүр: нүд (тааруулах хэсэг), ам (хуулах хэсэг), амны төв
const EYES = [33, 24, 56, 32] as const; // x0, y0, x1, y1
const MUZZLE = [39, 34, 48, 39] as const; // хамрын доод захаас хүзүүний зураас хүртэл
const MOUTH: P = [43, 35]; // амны зураасны дээд төв

/** Толгой бага зэрэг дохиж хөдөлдөг: нүдний хэсгийг `ref`-тэй хамгийн ойр тааруулах шилжилт */
function faceOffset(img: Img): P {
  let best: P = [0, 0];
  let bestCost = Infinity;
  for (let dy = -3; dy <= 3; dy++)
    for (let dx = -3; dx <= 3; dx++) {
      let cost = 0;
      for (let y = EYES[1]; y < EYES[3]; y++)
        for (let x = EYES[0]; x < EYES[2]; x++) {
          const i = at(ref, x, y);
          const j = at(img, x + dx, y + dy);
          for (let c = 0; c < 4; c++) cost += Math.abs(ref.d[i + c] - img.d[j + c]);
        }
      if (cost < bestCost) [best, bestCost] = [[dx, dy], cost];
    }
  return best;
}

/** `ref`-ийн хаалттай амыг нүүрний шилжилтээр нь буулгана */
function closeMouth(img: Img, [dx, dy]: P): Img {
  const o = clone(img);
  const patch = crop(ref, MUZZLE[0], MUZZLE[1], MUZZLE[2] - MUZZLE[0], MUZZLE[3] - MUZZLE[1]);
  for (let y = 0; y < patch.h; y++)
    for (let x = 0; x < patch.w; x++) o.d.set(patch.d.subarray(at(patch, x, y), at(patch, x, y) + 4), at(o, MUZZLE[0] + dx + x, MUZZLE[1] + dy + y));
  return o;
}

const all: (Frame & { mouth?: P })[] = [];
bear.frames('idle', 'south').forEach((img, i) => all.push({ name: `idle${i}`, duration: 220, img }));
bear.frames('think', 'south').forEach((img, i) => all.push({ name: `think${i}`, duration: 150, img })); // сонсох
for (const g of GESTURES)
  bear.frames(g, 'south').forEach((img, i) => {
    const off = faceOffset(img);
    all.push({ name: `${g}${i}`, duration: 150, img: closeMouth(img, off), mouth: [MOUTH[0] + off[0], MOUTH[1] + off[1]] });
  });
const { frames, dx, dy } = trim(all);
const [bx0, , bx1, by1] = bbox([bear.rotation('south')]);

// амны хэлбэр (5×4, амны зураасны дээд төвөөс): хагас нээлттэй, нээлттэй (хэл харагдана)
const SHAPES = [
  ['.ooo.', 'orrro', '.ooo.', '.....'],
  ['.ooo.', 'orrro', 'ortto', '.ooo.'],
];
const INK = { o: hex('#2a140a'), r: hex('#6b1f1f'), t: hex('#fc7b6a') } as const;
const mouth = blank(5 * SHAPES.length, 4);
SHAPES.forEach((rows, k) =>
  rows.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      if (ch !== '.') mouth.d.set([...INK[ch as keyof typeof INK], 255], at(mouth, k * 5 + x, y));
    }),
  ),
);
const MOUTH_ORIGIN = 2; // хэлбэрийн төвийн багана

const tag = tagOf(frames);
const tags = {
  idle: tag('idle0', 'idle3', 'pingpong'),
  listen: tag('think0', 'think8', 'pingpong'),
  teachIn: tag('teach0', 'teach2'),
  teach: tag('teach3', 'teach8', 'pingpong'),
  point: tag('point0', 'point8'),
  present: tag('present0', 'present7'), // 8-р frame-д нүд бараантаж гажсан
  shape: tag('shape0', 'shape8'),
};
const { w: FW, h: FH } = frames[0].img;
const COLS = Math.floor(TEXTURE / FW);
const PER_SHEET = COLS * Math.floor(TEXTURE / FH);
const sheets = Array.from({ length: Math.ceil(frames.length / PER_SHEET) }, (_, k) => toSheet(frames.slice(k * PER_SHEET, (k + 1) * PER_SHEET), COLS));

const preview = process.argv.indexOf('--preview');
if (preview < 0) {
  sheets.forEach((sheet, k) => writePng(new URL(`bear_tutor_${k}.png`, SPRITES), sheet));
  writePng(new URL('bear_mouth.png', SPRITES), mouth);
  const meta = {
    /** sheet бүрийн frame-ийн тоо: frame i нь sheet ⌊i / sheets[0]⌋ дотор */
    sheets: sheets.map((_, k) => Math.min(PER_SHEET, frames.length - k * PER_SHEET)),
    frameSize: { w: FW, h: FH },
    columns: COLS,
    feet: by1 - dy,
    pivot: (bx0 + bx1) / 2 - dx,
    mouth: { w: 5, h: 4, origin: MOUTH_ORIGIN, shapes: SHAPES.length },
    frames: all.map(({ name, duration, mouth: m }) => ({ name, duration, ...(m ? { mouth: [m[0] - dx, m[1] - dy] } : {}) })),
    tags,
  };
  writeFileSync(META, `${JSON.stringify(meta, null, 2)}\n`);
  console.log(`bear_tutor: ${frames.length} frame ${FW}×${FH}, ${sheets.length} sheet (${COLS} багана), ${Object.keys(tags).length} tag`);
} else {
  // ярьж буй мэт: дохионуудыг дараалан, ам 0 → 1 → 2 → 1 ээлжилнэ (апп-д энэ нь дууны чанга байдлаар явна)
  const dir = `${process.argv[preview + 1]}/`;
  writePng(`${dir}tutor_contact.png`, contact(toSheet(frames, COLS)));
  const seq = (t: keyof typeof tags) => {
    const { from, to, direction } = tags[t];
    const f = Array.from({ length: to - from + 1 }, (_, i) => from + i);
    return direction === 'pingpong' ? [...f, ...f.slice(1, -1).reverse()] : f;
  };
  const ids = (['teachIn', 'teach', 'point', 'teach', 'present', 'shape'] as const).flatMap(seq);
  const levels = [0, 1, 2, 1, 2, 2, 1, 0, 1, 2, 1, 0, 0, 1, 2, 1, 2, 1, 0];
  const shots = ids.map((id, n) => {
    const f = frames[id];
    const img = clone(f.img);
    const level = levels[n % levels.length];
    const m = all[id].mouth;
    if (m && level)
      for (let y = 0; y < 4; y++)
        for (let x = 0; x < 5; x++) {
          const i = at(mouth, (level - 1) * 5 + x, y);
          if (mouth.d[i + 3]) img.d.set(mouth.d.subarray(i, i + 4), at(img, m[0] - dx - MOUTH_ORIGIN + x, m[1] - dy + y));
        }
    return scale(img, 4);
  });
  writeApng(`${dir}tutor_teach.png`, shots, shots.map(() => 120));
  console.log(`preview: ${dir}`);
}
