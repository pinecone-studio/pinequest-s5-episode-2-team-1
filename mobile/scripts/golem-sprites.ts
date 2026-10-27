/**
 * 2-р бүлгийн дайснууд: Хадан аварга (boss), Сарны хамгаалагч (зүүн гар), Болор шидтэн (баруун гар); 3-р бүлгийн
 * Нарны арслан (boss), Бамбайт ахлагч, Элсэн цох (цэргүүд; эх зураг нь тунгалаг дэвсгэртэй).
 *
 * 1) Эх зургаас (docs/design/pixel-bear/reference/golem_*.png, цагаан дэвсгэртэй AI зураг) жинхэнэ pixel хэмжээтэй
 *    дүр гаргаж 88×88 суурь болгоно: pixellab/golem-<name>-base.png. Түүнийг PixelLab correct_pixelart-аар (0.15)
 *    цэвэрлэсэн нь pixellab/golem-<name>-corrected.png; сул цэгийг арилгасан нь pixellab/golem-<name>.png — animate_image-ийн
 *    эхний frame. Тулаанд дайсан зүүн талд зогсож баруун тийш (баавгай руу) харна: эх зураг нь зүүн тийш харсан шидтэнг
 *    толин тусгалаар эргүүлнэ (MIRROR).
 * 2) PixelLab animate_image-ийн гаргасан strip-үүдийг (pixellab/golem-<name>-<idle|attack|hurt>.png, 88 px нүд,
 *    0 = суурь) нэг sheet болгож, frame бүрийн хугацаа, tag, хөл/онох цэгийг src/lib/pixelBear/golems.json-д бичнэ.
 *
 * Ажиллуулах:  npm run sprites:golem && npm run sprites   (mobile/)
 */
import { existsSync, writeFileSync } from 'node:fs';
import { blank, type Img, readPng, writePng } from './png.ts';
import { at, bbox, crop, flipX, type Frame, groundShadow, has, largest, put, SPRITES, tagOf, toSheet, trim, white } from './sprite-kit.ts';

const REF = new URL('../../docs/design/pixel-bear/reference/', import.meta.url);
const PIXELLAB = new URL('../../docs/design/pixel-bear/pixellab/', import.meta.url);
const META = new URL('../src/lib/pixelBear/golems.json', import.meta.url);
const CELL = 88;
/** дүрийн өндөр (pixel): boss хамгийн том */
const GOLEMS = { boss: 64, left: 54, right: 66, lion: 72, captain: 58, scarab: 44 } as const;
type Name = keyof typeof GOLEMS;

/** цагаан дэвсгэрийг захаас нь үерлэж арилгана (дүрийн доторх цагаан гэрэл үлдэнэ) */
function cutout(img: Img): Img {
  const out = { w: img.w, h: img.h, d: img.d.slice() };
  const bg = (x: number, y: number) => {
    const i = at(img, x, y);
    return img.d[i] > 228 && img.d[i + 1] > 228 && img.d[i + 2] > 228;
  };
  const seen = new Uint8Array(img.w * img.h);
  const stack: number[] = [];
  for (let x = 0; x < img.w; x++) stack.push(x, (img.h - 1) * img.w + x);
  for (let y = 0; y < img.h; y++) stack.push(y * img.w, y * img.w + img.w - 1);
  while (stack.length) {
    const p = stack.pop() as number;
    if (seen[p]) continue;
    const [x, y] = [p % img.w, Math.floor(p / img.w)];
    if (!bg(x, y)) continue;
    seen[p] = 1;
    out.d[p * 4 + 3] = 0;
    if (x > 0) stack.push(p - 1);
    if (x < img.w - 1) stack.push(p + 1);
    if (y > 0) stack.push(p - img.w);
    if (y < img.h - 1) stack.push(p + img.w);
  }
  return out;
}

/**
 * Том зургийг `w×h` pixel руу: нүдний тал нь тунгалаг бол тунгалаг; бараан тойм нүдний 22%-иас их бол тойм (нимгэн
 * тойм тасрахгүй); бусад нь тоймгүй pixel-үүдийн дундаж.
 */
function downsample(img: Img, w: number, h: number): Img {
  const o = blank(w, h);
  const sx = img.w / w;
  const sy = img.h / h;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let n = 0;
      let opaque = 0;
      let dark = 0;
      const sum = [0, 0, 0];
      const darkSum = [0, 0, 0];
      for (let yy = Math.floor(y * sy); yy < Math.floor((y + 1) * sy); yy++)
        for (let xx = Math.floor(x * sx); xx < Math.floor((x + 1) * sx); xx++) {
          n++;
          const i = at(img, xx, yy);
          if (!img.d[i + 3]) continue;
          opaque++;
          const lum = (img.d[i] + img.d[i + 1] + img.d[i + 2]) / 3;
          const acc = lum < 48 ? darkSum : sum;
          if (lum < 48) dark++;
          for (let c = 0; c < 3; c++) acc[c] += img.d[i + c];
        }
      if (opaque < n / 2) continue;
      const light = opaque - dark;
      const [s, k] = dark > n * 0.22 || light === 0 ? [darkSum, dark] : [sum, light];
      put(o, x, y, [Math.round(s[0] / k), Math.round(s[1] / k), Math.round(s[2] / k)]);
    }
  return o;
}

function base(name: Name): Img {
  const src = cutout(readPng(new URL(`golem_${name}.png`, REF)));
  const [x0, y0, x1, y1] = bbox([src]);
  const h = GOLEMS[name];
  const w = Math.round(((x1 - x0) * h) / (y1 - y0));
  const art = downsample(crop(src, x0, y0, x1 - x0, y1 - y0), w, h);
  // 88×88 нүдэнд: хөл нь доороос 4 pixel дээр, хэвтээгээр голд
  const cell = blank(CELL, CELL);
  const ox = Math.round((CELL - w) / 2);
  const oy = CELL - 4 - h;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (has(art, x, y)) cell.d.set(art.d.subarray(at(art, x, y), at(art, x, y) + 4), at(cell, ox + x, oy + y));
  return cell;
}

const NAMES = Object.keys(GOLEMS) as Name[];
/** эх зураг нь зүүн тийш (баавгайгаас холдож) харсан дүр */
const MIRROR: Name[] = ['right'];
for (const n of NAMES) {
  writePng(new URL(`golem-${n}-base.png`, PIXELLAB), base(n));
  const corrected = new URL(`golem-${n}-corrected.png`, PIXELLAB);
  if (existsSync(corrected)) {
    const img = largest(readPng(corrected));
    writePng(new URL(`golem-${n}.png`, PIXELLAB), MIRROR.includes(n) ? flipX(img) : img);
  }
}
console.log(`golem bases: ${NAMES.join(', ')}`);

// ---------- 2) PixelLab strip-үүдээс sheet ----------
const ANIMS = ['idle', 'attack', 'hurt'] as const;
/** амьсгалын давталтад авах нүд (0 = суурь): PixelLab-ийн сүүлийн frame-үүд дүрээсээ холдож (болор алга болох г.м.) эхэлдэг */
const IDLE: Record<Name, number[]> = { boss: [0, 1, 2], left: [1, 2, 3, 4], right: [0, 1, 2], lion: [0, 1, 2, 3], captain: [0, 1, 2, 3], scarab: [0, 1, 2, 3] };
/** цочих нүд: шидтэний 3–4-р frame-д таяг нөгөө гар руу шилждэг (буцах агшинд үсрэлт гарна); ахлагч бамбайгаа өргөөд буулгана; цохын 1–3 нь эргэлттэй, очтой */
const HURT: Record<Name, number[]> = { boss: [1, 2, 3, 4], left: [1, 2, 3, 4], right: [1, 2], lion: [1, 2, 3, 4], captain: [1, 2, 1], scarab: [4] };
/**
 * довтолгооны нүд (1–8; impact = 6-р байр): ахлагчийн 7–8-р frame-д бамбай алга болдог тул өргөх → урагш цохих → буцах;
 * цох 4-өөс хойш эргэж, утаа гаргадаг тул 1–3-аар бөхийх → дайрах
 */
const ATTACK: Partial<Record<Name, number[]>> = { captain: [1, 2, 4, 5, 6, 3, 2, 1], scarab: [1, 2, 3, 2, 3, 3, 2, 1] };
const strip = (n: Name, a: string) => new URL(`golem-${n}-${a}.png`, PIXELLAB);
const ready = NAMES.filter((n) => ANIMS.every((a) => existsSync(strip(n, a))));
const meta: Record<string, unknown> = {};
for (const n of ready) {
  const all: Frame[] = [];
  /** strip-ийн нүднүүд (0 = суурь, animate_image-д өгсөн зураг) */
  const cells = (a: string) => {
    const s = readPng(strip(n, a));
    return Array.from({ length: s.w / CELL }, (_, i) => crop(s, i * CELL, 0, CELL, CELL));
  };
  const idle = IDLE[n].map((i) => cells('idle')[i]);
  idle.forEach((img, i) => all.push({ name: `idle${i}`, duration: 220, img }));
  const attack = ATTACK[n]?.map((i) => cells('attack')[i]) ?? cells('attack').slice(1);
  // 8 frame: бэлдэх (0–3, удаан) → цохих агшин (impact = 5) → буцах
  attack.forEach((img, i) => all.push({ name: i === 5 ? 'impact' : `attack${i}`, duration: [110, 110, 130, 140, 70, 160, 110, 110][i] ?? 110, img }));
  const hurt = HURT[n].map((i) => cells('hurt')[i]);
  all.push({ name: 'flash', duration: 80, img: white(hurt[0]) });
  hurt.forEach((img, i) => all.push({ name: `hurt${i}`, duration: 100, img }));
  // газрын сүүдэр: зогсолтын хөлийн өргөнөөр
  const [sx0, sy0, sx1, sy1] = bbox([all[0].img]);
  for (const f of all) if (f.name !== 'flash') groundShadow(f.img, (sx0 + sx1) / 2, sy1 + 0.5, (sx1 - sx0) / 2 + 2);
  const trimmed = trim(all);
  // frame-ийн өргөн, өндрийг тэгш болгоно (дээд/баруун талд 1 тунгалаг pixel): boss тулаанд 2.5× — бүхэл dp-тэй байна
  const { w: tw, h: th } = trimmed.frames[0].img;
  const [pw, ph] = [tw % 2, th % 2];
  const frames = trimmed.frames.map((f) => ({ ...f, img: crop(f.img, 0, -ph, tw + pw, th + ph) }));
  const { dx } = trimmed;
  const dy = trimmed.dy - ph;
  const tag = tagOf(frames);
  const COLS = 6;
  writePng(new URL(`golem_${n}_sheet.png`, SPRITES), toSheet(frames, COLS));
  meta[n] = {
    sheet: `golem_${n}_sheet`,
    frameSize: { w: frames[0].img.w, h: frames[0].img.h },
    columns: COLS,
    feet: sy1 - dy,
    /** 88×88 нүдээс frame тайрсан зай (scripts/defeat-sprites.ts ялагдлын frame-ийг ижил байрлалд тайрна) */
    dx,
    dy,
    /** зогсож буй биеийн голын x (frame дотор): эффект нэг тал руу сунадаг тул frame-ийн гол биш */
    cx: Math.round((sx0 + sx1) / 2) - dx,
    /** зогсож буй биеийн өргөн: ойроос довтлоход бие нь (frame биш) баавгайд тулна */
    bw: sx1 - sx0,
    /** зогсож буй биеийн орой (frame дотор): газрын зураг дээрх шошго үүнээс дээш */
    head: sy0 - dy,
    frames: frames.map(({ name, duration }) => ({ name, duration })),
    tags: {
      idle: tag('idle0', `idle${idle.length - 1}`, 'pingpong'),
      attack: tag('attack0', `attack${attack.length - 1}`),
      hurt: tag('flash', `hurt${hurt.length - 1}`),
    },
  };
}
// ---------- 3) Довтолгооны эффект (PixelLab vfx_workbench: My effects-д хадгалагдсан) ----------
// болор сум (баруун гар), ягаан болор бөмбөг (boss), сарны хавирган (зүүн гар), онох оч (бүгд)
for (const [from, to] of [
  ['crystal-bolt', 'fx_crystal_bolt'],
  ['golem-orb', 'fx_golem_orb'],
  ['moon-crescent', 'fx_moon_crescent'],
  ['golem-impact', 'fx_golem_impact'],
  // дайсан бүрийн өөрийн skill: нарны галт бөмбөг/дэлбэрэлт (арслан), алтан диск/оч (ахлагч), элсэн бөмбөг/тоос (цох),
  // ногоон сүнсний гал/оч (хулуу)
  ['sun-fireball', 'fx_sun_fireball'],
  ['sun-blast', 'fx_sun_blast'],
  ['sun-disc', 'fx_sun_disc'],
  ['gold-hit', 'fx_gold_hit'],
  ['sand-ball', 'fx_sand_ball'],
  ['sand-dust', 'fx_sand_dust'],
  ['ghost-flame', 'fx_ghost_flame'],
  ['ghost-hit', 'fx_ghost_hit'],
  // 2-р бүлэг: сарны оч (зүүн гар), болор аянга (баруун гар), болор дэлбэрэлт (boss); эцсийн цохилтын алтан KO
  ['moon-hit', 'fx_moon_hit'],
  ['crystal-bolt-strike', 'fx_crystal_strike'],
  ['crystal-blast', 'fx_crystal_blast'],
  ['ko-burst', 'fx_ko_burst'],
  // баавгайн skill: сарвуу, хос сарвуу, балны бөмбөг, газар хагарах, давхих тоос, хүчний дөл
  ...['claw', 'cross', 'boom', 'cracks', 'dust', 'aura'].map((n) => [`bear-${n}`, `fx_bear_${n}`]),
])
  if (existsSync(new URL(`${from}.png`, PIXELLAB))) writePng(new URL(`${to}.png`, SPRITES), readPng(new URL(`${from}.png`, PIXELLAB)));

if (ready.length) {
  writeFileSync(META, `${JSON.stringify(meta, null, 2)}\n`);
  console.log(`golem sheets: ${ready.join(', ')}`);
}
