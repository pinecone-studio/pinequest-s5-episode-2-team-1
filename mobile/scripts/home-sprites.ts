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
import { readPng, writeApng, writePng } from './png.ts';
import { bbox, crop, type Frame, scale, source, SPRITES, toSheet } from './sprite-kit.ts';

const PIXELLAB = new URL('../../docs/design/pixel-bear/pixellab/', import.meta.url);
const META = new URL('../src/lib/pixelBear/bear-home.json', import.meta.url);

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
}

const STATES: Record<string, State> = {
  // гэрэлтсэн: хоёр гараа өргөөд баярлан дэвхцэнэ
  thriving: { src: 'bear_cheer_scarf', pad: [2, 14, 2, 0], ms: 130, in: [0, 0], loop: [0, 4, 'pingpong'] },
  // хөнжлөө нөмрөөд нойрмоглоно: сэрүүн инээмсэглэл ↔ хөнжлөө татаж нойрмоглох
  sleep: { src: 'bear_sleep', pad: [1, 3, 1, 0], ms: 300, hold: { 0: 700, 4: 1400 }, in: [0, 0], loop: [0, 4, 'pingpong'] },
  // сэргэлэн: хэсэг зогсоод нүдээ ирмэж, инээмсэглэн гараараа даллана
  happy: { src: 'bear_idle_scarf', pad: [4, 4, 4, 0], ms: 150, hold: { 0: 1800 }, in: [0, 0], loop: [0, 6] },
  // ядарсан: зүүрмэглэж зогсоод том эвшээж, сарвуугаараа амаа дарна
  tired: { src: 'bear_tired_scarf', pad: [4, 4, 4, 0], ms: 170, hold: { 0: 1600, 4: 500 }, in: [0, 0], loop: [0, 6] },
  // хичээл хийгээгүй: хөмсгөө зангидаж гараа зөрүүлнэ → нүдээ аниад «хмф», хөлөө дэвсэнэ
  neglected: { src: 'bear_idle_scarf', pad: [4, 4, 4, 0], ms: 170, in: [0, 3], loop: [3, 6, 'pingpong'] },
};

const meta: Record<string, unknown> = {};
const sheets: Record<string, { frames: Frame[]; seq: number[] }> = {};
for (const [name, s] of Object.entries(STATES)) {
  const [x0, y0] = bbox([source(s.src)]);
  const strip = readPng(new URL(`home-${name}.png`, PIXELLAB));
  const [l, t] = s.pad;
  const w = bbox([source(s.src)])[2] - x0 + l + s.pad[2];
  const frames: Frame[] = Array.from({ length: strip.w / w }, (_, i) => ({
    name: `${name}${i}`,
    duration: s.hold?.[i] ?? s.ms,
    img: crop(strip, i * w, 0, w, strip.h),
  }));
  const tag = ([from, to, direction]: Tag) => ({ from, to, direction: direction ?? 'forward' });
  meta[name] = {
    frameSize: { w, h: strip.h },
    /** frame-ийн зүүн дээд булан анхны sprite-ийн координатаар */
    offset: [x0 - l, y0 - t],
    frames: frames.map(({ name: n, duration }) => ({ name: n, duration })),
    tags: { in: tag(s.in), loop: tag(s.loop) },
  };
  const span = ([from, to, dir]: Tag) => {
    const f = Array.from({ length: to - from + 1 }, (_, i) => from + i);
    return dir === 'pingpong' ? [...f, ...f.slice(1, -1).reverse()] : f;
  };
  sheets[name] = { frames, seq: [...span(s.in), ...span(s.loop), ...span(s.loop)] };
}

const preview = process.argv.indexOf('--preview');
if (preview < 0) {
  for (const [name, { frames }] of Object.entries(sheets)) writePng(new URL(`bear_home_${name}.png`, SPRITES), toSheet(frames, frames.length));
  writeFileSync(META, `${JSON.stringify(meta, null, 2)}\n`);
  console.log(`bear_home: ${Object.entries(sheets).map(([n, { frames }]) => `${n} ${frames.length}`).join(', ')}`);
} else {
  const dir = `${process.argv[preview + 1]}/`;
  for (const [name, { frames, seq }] of Object.entries(sheets))
    writeApng(`${dir}home_${name}.png`, seq.map((i) => scale(frames[i].img, 3)), seq.map((i) => frames[i].duration));
  console.log(`preview: ${dir}`);
}
