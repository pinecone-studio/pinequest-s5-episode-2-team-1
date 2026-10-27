/**
 * Профайлын баавгай (аватар): үс (бор/хар/цагаан) × царай (4) × цээжний цагаан толбо (байгаа/үгүй) = 24 хөрөг.
 *
 * Бие нь bear_idle.png (head_idle яг (6, 14)-т тайрагдсан), царай нь head_*.png-ийг толгойн байранд нь давхарлана. Үсийг
 * pixel бүрийн гэрэлтэлтээр (HSL L) тухайн өнгөний ramp руу буулгана: сүүдэр, гэрэл, хялгас хэвээр үлдэнэ. Нүдний
 * солонгон бүрхүүл (илүү ханасан бор), хацрын ягаан, цагаан гэрэл, ядарсан нүдний ягаан доод зураасыг хөндөхгүй.
 *
 * Ажиллуулах:  npm run sprites:avatar && npm run sprites   (mobile/)
 * Шалгах:      node scripts/avatar-sprites.ts --preview <dir>
 */
import { blank, type Img, writePng } from './png.ts';
import { CL, FUR, FURS, hsl, L, lerp, MUZZLE } from './fur.ts';
import { at, crop, hex, type RGB, ramp, SPRITES, scale, source } from './sprite-kit.ts';

export { FURS };
export { BEAR_FACES as FACES } from '../../shared/bear.ts';
import { BEAR_FACES as FACES } from '../../shared/bear.ts';

// толгой → эх зураг ба bear_idle дээрх байрлал (тохирох байрлалыг pixel харьцуулж олсон)
const HEADS = {
  idle: ['head_idle', 6, 14],
  happy: ['head_happy', 0, 14],
  tired: ['head_tired', 6, 14],
  sleep: ['head_sleep', -7, 13],
} as const satisfies Record<string, readonly [string, number, number]>;
type Head = keyof typeof HEADS;
/** bear_idle-ийн координатаар тэгш өнцөгт [x0, y0, x1, y1) */
type Rect = readonly [number, number, number, number];
const LEFT_EYE: Rect = [19, 38, 36, 55];
const MOUTH: Rect = [32, 58, 51, 69];

// царай = нэг толгой + өөр толгойноос авсан хэсэг (нүд, ам); «гайхсан» нь ам дээр гараар зурсан «о»
const FACE: Record<(typeof FACES)[number], { head: Head; parts?: [Head, Rect][]; o?: true }> = {
  calm: { head: 'idle' },
  happy: { head: 'happy' },
  sleepy: { head: 'tired' },
  smile: { head: 'sleep' },
  wink: { head: 'happy', parts: [['idle', LEFT_EYE]] },
  surprised: { head: 'idle', o: true },
  laugh: { head: 'idle', parts: [['happy', MOUTH]] },
  smug: { head: 'tired', parts: [['idle', MOUTH]] },
};

/** Гайхсан ам (6×5): o = зураас, d = амны дотор, p = хэл */
const O_MOUTH = ['.oooo.', 'oddddo', 'oddddo', 'oddppo', '.oooo.'];
const MOUTH_COLORS: Record<string, RGB> = { o: hex('#2a140a'), d: hex('#6e2a22'), p: hex('#e86a6a') };
/** толгойн доод мөр (bear_idle-ийн координат): доош нь цээж */
const NECK = 74;
/** хөрөгийн хүрээ: чих → цээжний дээд хэсэг */
const [CX, CY, SIZE] = [1, 12, 80];

const PATCH = ramp('#ddd8e2', '#ffffff');

/** нүдний мөрүүд (bear_idle-ийн координат): чихний дотор талын ханасан борыг нүд гэж андуурахгүйн тулд */
const EYES = [41, 56];

type Kind = 'outline' | 'fur' | 'cream' | 'keep';
function kind(c: RGB, y: number): Kind {
  const [h, s, l] = hsl(c);
  if (l < 0.13) return 'outline';
  if (h > 42 || s < 0.2) return 'keep'; // цагаан гэрэл, нил ягаан
  if (h < 5 && y >= EYES[0] && y < NECK) return 'keep'; // ам, хэл (царайн гаднах улаавтар pixel нь үс)
  if (h < 15 && s > 0.85 && l > 0.6) return 'keep'; // хацрын ягаан
  if (s > 0.58 && l < 0.5 && y >= EYES[0] && y < EYES[1]) return 'keep'; // нүдний солонго
  return l > 0.7 ? 'cream' : 'fur';
}

/** Нэг хөрөг (80×80, эх хэмжээ) */
/** bear_idle дээр толгойг давхарласан (өнгө өөрчлөөгүй) */
function withHead(head: Head): Img {
  const body = source('bear_idle');
  const [name, ox, oy] = HEADS[head];
  const img = source(name);
  for (let y = 0; y < img.h; y++)
    for (let x = 0; x < img.w; x++) {
      const i = at(img, x, y);
      // баярласан толгойн доод булангийн даллах сарвууг авахгүй: бие нь өөрийн гартай
      if (!img.d[i + 3] || (name === 'head_happy' && y > 40 && (x < 14 || x > 67))) continue;
      const bx = x + ox;
      const by = y + oy;
      if (bx >= 0 && bx < body.w && by >= 0 && by < body.h) body.d.set(img.d.subarray(i, i + 4), at(body, bx, by));
    }
  return body;
}

/** Нэг хөрөг (80×80, эх хэмжээ) */
export function portrait(fur: (typeof FURS)[number], face: (typeof FACES)[number], patch: boolean): Img {
  const { head, parts = [], o } = FACE[face];
  const body = withHead(head);
  for (const [from, [x0, y0, x1, y1]] of parts) {
    const src = withHead(from);
    for (let y = y0; y < y1; y++) body.d.set(src.d.subarray(at(src, x0, y), at(src, x1, y)), at(body, x0, y));
  }
  if (o) {
    // инээмсэглэлийн зураасыг хошууны өнгөөр (мөрийн зүүн талын хөрш pixel) арилгаад «о» зурна
    for (let y = 58; y < 66; y++)
      for (let x = 32; x < 50; x++) if (hsl([body.d[at(body, x, y)], body.d[at(body, x, y) + 1], body.d[at(body, x, y) + 2]])[2] < 0.6)
        body.d.set(body.d.subarray(at(body, x - 1, y), at(body, x - 1, y) + 4), at(body, x, y));
    O_MOUTH.forEach((row, dy) => [...row].forEach((ch, dx) => ch !== '.' && body.d.set([...MOUTH_COLORS[ch], 255], at(body, 38 + dx, 60 + dy))));
  }
  for (let y = 0; y < body.h; y++)
    for (let x = 0; x < body.w; x++) {
      const i = at(body, x, y);
      if (!body.d[i + 3]) continue;
      const c = [body.d[i], body.d[i + 1], body.d[i + 2]] as const;
      const k = kind(c, y);
      const l = hsl(c)[2];
      let out: RGB | null = null;
      // нүдний мөрийн зураас (хүүхэн хараа) бараан хэвээр
      if (k === 'outline') out = fur === 'brown' || (y >= EYES[0] && y < EYES[1]) ? null : lerp(L, FUR[fur], 0);
      else if (k === 'fur') out = lerp(L, FUR[fur], l);
      else if (k === 'cream' && y >= NECK) out = patch ? lerp(CL, PATCH, l) : lerp(L, FUR[fur], l - 0.2);
      else if (k === 'cream') out = MUZZLE[fur] && lerp(CL, MUZZLE[fur], l);
      if (out) body.d.set(out, i);
    }
  return crop(body, CX, CY, SIZE, SIZE);
}

export const portraitName = (fur: string, face: string, patch: boolean) => `avatar_${fur}_${face}_${patch ? 'patch' : 'plain'}`;

const all = FURS.flatMap((fur) => FACES.flatMap((face) => [true, false].map((patch) => [fur, face, patch] as const)));
const preview = process.argv.indexOf('--preview');
if (preview < 0) {
  for (const [fur, face, patch] of all) writePng(new URL(`${portraitName(fur, face, patch)}.png`, SPRITES), portrait(fur, face, patch));
  console.log(`avatar: ${all.length} хөрөг ${SIZE}×${SIZE}`);
} else {
  // бүх хослол нэг хуудсанд: мөр = үс × толбо, багана = царай
  const sheet = blank(FACES.length * (SIZE + 4), FURS.length * 2 * (SIZE + 4));
  const bg = hex('#c9b8f5');
  for (let i = 0; i < sheet.w * sheet.h; i++) sheet.d.set([...bg, 255], i * 4);
  all.forEach(([fur, face, patch]) => {
    const img = portrait(fur, face, patch);
    const x0 = FACES.indexOf(face) * (SIZE + 4);
    const y0 = (FURS.indexOf(fur) * 2 + (patch ? 0 : 1)) * (SIZE + 4);
    for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) if (img.d[at(img, x, y) + 3]) sheet.d.set(img.d.subarray(at(img, x, y), at(img, x, y) + 4), at(sheet, x0 + x, y0 + y));
  });
  writePng(`${process.argv[preview + 1]}/avatar_contact.png`, scale(sheet, 2));
  console.log(`preview: ${process.argv[preview + 1]}/avatar_contact.png`);
}
