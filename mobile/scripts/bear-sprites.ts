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
 * Rig (гар, хөл, renderer): ./bear-rig.ts.
 *
 * Ажиллуулах:  npm run sprites:bear && npm run sprites   (mobile/)
 * Шалгах:      node scripts/bear-sprites.ts --preview <dir>
 */
import { writeFileSync } from 'node:fs';
import {
  ANKLE_Y,
  at,
  bearTurn,
  breathe,
  BX,
  CLAW_UP,
  compose,
  contact,
  down,
  dust,
  FAR_SH,
  FEET,
  FH,
  figure,
  finish,
  FW,
  type Frame,
  glow,
  HIPS,
  IDLE_FAR,
  IDLE_NEAR,
  leg,
  type Legs,
  type Limb,
  NEAR_SH,
  type P,
  scale,
  smear,
  source,
  SPRITES,
  stand,
  tagOf,
  toSheet,
  UP,
} from './bear-rig.ts';
import { blank, type Img, writeApng, writePng } from './png.ts';

const META = new URL('../src/lib/pixelBear/bear.json', import.meta.url);
const COLS = 7;

// ---------- frame-ууд ----------
const straight = source('map_bear');
const base = bearTurn(straight);
const blinkSrc = bearTurn(source('map_bear_blink'));

const frames: Frame[] = [];
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
const tag = tagOf(frames);
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
const sheet = toSheet(frames, COLS);

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
  console.log(`bear_battle: ${frames.length} frame (${COLS}×${Math.ceil(frames.length / COLS)}), ${Object.keys(tags).length} tag`);
} else {
  const dir = `${process.argv[preview + 1]}/`;
  writePng(`${dir}bear_contact.png`, contact(sheet));
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
