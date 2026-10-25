/**
 * Тулааны баавгай: sprite sheet (docs/design/pixel-bear/sprites/bear_battle.png, grid) ба metadata
 * (mobile/src/lib/pixelBear/bear.json: frame бүрийн хугацаа, tag-ууд, хөл/бие/сарвууны байрлал).
 *
 * Баавгай: PixelLab (pixellab.ai) map_bear.png-ээс үүсгэсэн дүр ба хөдөлгөөнүүд, эх нь
 * docs/design/pixel-bear/pixellab/bear.png + .json (west: idle, run, throw = зөгийн бал шидэх, claw, hurt; south: эргэх
 * агшин). Энд зөвхөн тайрч, газрын сүүдэр, цохиулах агшны цагаан анивчилт нэмж, хугацаа, tag өгнө.
 *
 * Ажиллуулах:  npm run sprites:bear && npm run sprites   (mobile/)
 * Шалгах:      node scripts/bear-sprites.ts --preview <dir>
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { blank, type Img, readPng, writeApng, writePng } from './png.ts';
import { at, bbox, compose, contact, crop, type Frame, groundShadow, largest, pixellab, SPRITES, scale, source, tagOf, toSheet, trim, white } from './sprite-kit.ts';

const META = new URL('../src/lib/pixelBear/bear.json', import.meta.url);
// зөгийн бал boss-д тусаж хагарах эффект (PixelLab VFX: гэрэл → бал цацрах → хэлтэрхий), 3×3 grid
const PIXELLAB = new URL('../../docs/design/pixel-bear/pixellab/', import.meta.url);
const COLS = 7;

const bear = pixellab('bear');
const all: Frame[] = [];
const add = (name: string, duration: number, img: Img) => all.push({ name, duration, img });
const each = (imgs: Img[], name: (i: number) => string, ms: (i: number) => number) => imgs.forEach((img, i) => add(name(i), ms(i), img));

each(bear.frames('idle', 'west'), (i) => `idle${i}`, () => 200); // амьсгал (ping-pong)
// зөгийн бал шидэх: савыг толгойн ард аваачих (удаан) → урагш (throwSmear) → суллах (release: сав ниснэ) → дагах
each(bear.frames('throw', 'west'), (i) => (i === 5 ? 'throwSmear' : i === 6 ? 'release' : `throw${i}`), (i) => [80, 80, 110, 120, 120, 70, 90, 110, 110][i]);
// сарвуудах: сарвуугаа өргөөд цавчина; цагаан зурвас хамгийн том frame = цохилт (claw)
each(bear.frames('claw', 'west'), (i) => (i === 6 ? 'claw' : `claw${i}`), (i) => (i === 6 ? 160 : 90));
const hurt = bear.frames('hurt', 'west');
add('flash', 80, white(hurt[1]));
each(hurt, (i) => `hurt${i}`, () => 90);
add('front', 110, bear.rotation('south')); // эргэх агшин: урагшаа харна
add('ready', 120, bear.rotation('west'));
each(bear.frames('run', 'west'), (i) => `run${i}`, () => 96);
add('brake', 130, bear.rotation('west'));

// манарах (2 удаа дараалан цохиулахад): PixelLab animate_image (west зогсолтоос, pixellab/bear-dazed.png) — толгой унжиж,
// нүд аних, бие ганхана. PixelLab-ийн бүдэг эргүүлгийг арилгана: BossArena толгой дээр нь өөрийн fx_dizzy-г зурна.
const dazed = readPng(new URL('bear-dazed.png', PIXELLAB));
const CELL = dazed.h;
for (let i = 1; i < dazed.w / CELL; i++) add(`daze${i}`, i <= 3 ? 150 : 220, largest(crop(dazed, i * CELL, 0, CELL, CELL)));
// амь дуусахад: ганхаж, өвдөг сулраад ар тийшээ унаж хэвтэнэ (PixelLab animate_image, pixellab/bear-fall.png); сүүлийн frame-д хэвтэж үлдэнэ
const fall = readPng(new URL('bear-fall.png', PIXELLAB));
for (let i = 1; i < fall.w / CELL; i++) add(`fall${i}`, [0, 140, 140, 120, 110, 90, 90, 130, 400][i], largest(crop(fall, i * CELL, 0, CELL, CELL)));

// газрын сүүдэр (хөлийн доор, биеийн ард): хажуугаас харсан зогсолтоор
const [sx0, , sx1, sy1] = bbox([bear.rotation('west')]);
for (const f of all) {
  if (f.name === 'flash') continue;
  // унах frame-ийн сүүдэр нь тухайн frame-ийн биеийн өргөнөөр (хэвтэхэд урт)
  const [a, , b] = f.name.startsWith('fall') ? bbox([f.img]) : [sx0, 0, sx1];
  groundShadow(f.img, (a + b) / 2, sy1 + 0.5, (b - a) / 2 + 4);
}
const { frames, dx, dy } = trim(all);

/** шидэх агшинд зөгийн балны сав (шар-улбар pixel) хаана байна: сум эндээс ниснэ */
function honeyAt(img: Img): [number, number] {
  let best: [number, number] = [img.w, 0];
  for (let y = 0; y < img.h; y++)
    for (let x = 0; x < img.w; x++) {
      const i = at(img, x, y);
      const [r, g, b, a] = img.d.subarray(i, i + 4);
      if (a && r > 240 && g > 140 && b < 40 && x < best[0]) best = [x, y]; // үсний шар (b ≥ 56)-аас ялгарах тод улбар шар
    }
  // сав олдоогүй бол (шидэх хөдөлгөөнийг өөр өнгөөр дахин үүсгэсэн) буруу цэгээс нисгэхийн оронд зогсоно
  if (best[0] === img.w) throw new Error('honeyAt: throwSmear frame-д зөгийн балны сав (шар pixel) олдсонгүй');
  return best;
}

const index = (name: string) => frames.findIndex((f) => f.name === name);
const tag = tagOf(frames);
const tags = {
  idle: tag('idle0', 'idle3', 'pingpong'),
  blink: tag('idle0'),
  throw: tag('throw0', 'throw8'),
  claw: tag('claw0', 'claw8'),
  hurt: tag('flash', 'hurt6'),
  turn: tag('front'),
  ready: tag('ready'),
  run: tag('run0', 'run7'),
  brake: tag('brake'),
  dazeIn: tag('daze1', 'daze3'),
  daze: tag('daze4', 'daze8', 'pingpong'),
  fall: tag('fall1', 'fall8'),
};
const sheet = toSheet(frames, COLS);
const FEET = sy1 - dy;
const PAD = sx0 - dx;
const PAW = honeyAt(frames[index('throwSmear')].img);
/** манарсан баавгайн толгойн орой (frame дотор): эргүүлэг эндээс дээш */
const HEAD = ((img: Img): [number, number] => {
  const [x0, y0, x1] = bbox([crop(img, 0, 0, img.w, bbox([img])[1] + 4)]);
  return [Math.round((x0 + x1) / 2), y0];
})(frames[index('daze4')].img);
/** хэвтсэн баавгайн биеийн төв, орой (frame дотор): сүнс эндээс гарч дээшилнэ */
const DOWN = ((img: Img): [number, number] => {
  const [x0, y0, x1] = bbox([img]);
  return [Math.round((x0 + x1) / 2), y0];
})(frames[index('fall8')].img);

const preview = process.argv.indexOf('--preview');
if (preview < 0) {
  writePng(new URL('bear_battle.png', SPRITES), sheet);
  writePng(new URL('fx_honey_shatter.png', SPRITES), readPng(new URL('honey-shatter.png', PIXELLAB)));
  const fx = JSON.parse(readFileSync(new URL('honey-shatter.json', PIXELLAB), 'utf8'));
  const meta = {
    sheet: 'bear_battle',
    frameSize: { w: frames[0].img.w, h: frames[0].img.h },
    columns: COLS,
    feet: FEET,
    pad: PAD,
    paw: PAW,
    head: HEAD,
    down: DOWN,
    frames: frames.map(({ name, duration }) => ({ name, duration })),
    tags,
    /** хагарах эффект: frame бүрийн хугацаа, цохилтын цэг (frame-ийн өргөн/өндрийн хувь: sprite-ийн томруулалтаас үл хамаарна) */
    honey: {
      sheet: 'fx_honey_shatter',
      columns: 3,
      frames: fx.frames.length,
      duration: fx.frames[0].duration,
      pivot: [+fx.frames[0].pivot.x.toFixed(3), +fx.frames[0].pivot.y.toFixed(3)],
    },
  };
  writeFileSync(META, `${JSON.stringify(meta, null, 2)}\n`);
  console.log(`bear_battle: ${frames.length} frame ${frames[0].img.w}×${frames[0].img.h} (${COLS}×${Math.ceil(frames.length / COLS)}), ${Object.keys(tags).length} tag`);
} else {
  const dir = `${process.argv[preview + 1]}/`;
  writePng(`${dir}bear_contact.png`, contact(sheet));
  // boss-ын гэр (lair_0) дээр APNG: газар нь гэрийн 181-р мөр (BossArena-ийн GROUND)
  const lair = source('lair_0');
  const W = 176;
  const H = 110;
  const bg = blank(W, H);
  for (let y = 0; y < H; y++) bg.d.set(lair.d.subarray(at(lair, 20, 196 - H + y), at(lair, 20 + W, 196 - H + y)), at(bg, 0, y));
  const top = 181 - (196 - H) - FEET;
  const shot = (names: string[], name: string, x = 100, mirror = false) =>
    writeApng(
      `${dir}${name}.png`,
      names.map((f) => scale(compose(bg, frames[index(f)].img, x, top, mirror), 4)),
      names.map((f) => frames[index(f)].duration),
    );
  const seq = (t: keyof typeof tags) => {
    const { from, to, direction } = tags[t];
    const f = Array.from({ length: to - from + 1 }, (_, i) => frames[from + i].name);
    return direction === 'pingpong' ? [...f, ...f.slice(1, -1).reverse()] : f;
  };
  shot([...seq('idle'), ...seq('idle')], 'preview_idle');
  shot([...seq('idle'), ...seq('throw'), ...seq('idle')], 'preview_throw');
  shot([...seq('idle'), ...seq('claw'), ...seq('idle')], 'preview_claw');
  shot([...seq('idle'), ...seq('hurt'), ...seq('idle')], 'preview_hurt');
  shot([...seq('run'), ...seq('run')], 'preview_run');
  shot([...seq('hurt'), ...seq('dazeIn'), ...seq('daze'), ...seq('daze')], 'preview_daze');
  shot([...seq('hurt'), ...seq('fall'), 'fall8', 'fall8'], 'preview_fall');
  console.log(`preview: ${dir}`);
}
