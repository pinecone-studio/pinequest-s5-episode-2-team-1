/**
 * PixelLab costumes with motions of their own (the witch, the cyborg, the mummy, the liquid cop, the robot): review sheets and previews in each pilot folder,
 * and the app's sprites. Worn, a costume's frames replace the bear's (LiveBear): each state's sheet in three fur colours
 * (costume_<id>_<state>, `_black`/`_white` beside it for build-sprites), the shop card (outfit_<id>) and
 * mobile/src/lib/pixelBear/bear-costumes.json. A frame sits where the bear's own first frame does: the same bottom row
 * and middle column. A costume without its own `sleep` frames wears home-sprites.ts's fitted overlay on the bear's sleep
 * (under the blanket only the head and shoulders show).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { recolorCostumeFur } from './costume-fur.ts';
import { hsl } from './fur.ts';
import { blank, type Img, readPng, writeApng, writePng } from './png.ts';
import { bbox, crop, SPRITES, toSheet } from './sprite-kit.ts';

const PILOT = new URL('../../docs/design/pixel-bear/costumes/pixellab/pilot/', import.meta.url);
const HOME = new URL('../src/lib/pixelBear/bear-home.json', import.meta.url);
const META = new URL('../src/lib/pixelBear/bear-costumes.json', import.meta.url);

/**
 * `idle`: the dressed bear PixelLab animated, `card`: where the 82×140 shop card is cut from it, `hat`/`cream`: see
 * recolorCostumeFur, `furFrames`: black and white fur have frames of their own (`<fur>/<state>-<i>.png`, PixelLab-animated
 * from a base with only its fur recoloured), since its boots, deel or instrument are fur-like browns a recolour would
 * change too; it keeps the art's own fur (no plainFurOf)
 */
const COSTUMES: Record<string, { idle: string; card: [number, number]; hat: boolean; cream?: false; furFrames?: true }> = {
  // the hat brim's outermost pixel is cut from the card
  witch: { idle: 'idle-84x140.png', card: [1, 0], hat: true },
  // drawn whole from the art, bear_idle's size, standing 4 px above the bottom of a 108×164 canvas
  cyborg: { idle: 'idle-108x164.png', card: [13, 20], hat: false },
  mummy: { idle: 'idle-108x164.png', card: [13, 20], hat: false, cream: false },
  liquid_cop: { idle: 'idle-108x164.png', card: [13, 20], hat: false },
  robot: { idle: 'idle-108x164.png', card: [13, 20], hat: false },
  // drawn whole from the art at the mummy's scale, 4 px above the bottom of a 120×172 canvas
  wrestler: { idle: 'idle-120x172.png', card: [19, 28], hat: false, furFrames: true },
  brown_deel: { idle: 'idle-120x172.png', card: [19, 28], hat: false, furFrames: true },
  khuur: { idle: 'idle-120x172.png', card: [19, 28], hat: false, furFrames: true },
  archer: { idle: 'idle-120x172.png', card: [19, 28], hat: false, furFrames: true },
  leaf_ninja: { idle: 'idle-120x172.png', card: [19, 28], hat: false, furFrames: true },
  shadow_ninja: { idle: 'idle-120x172.png', card: [19, 28], hat: false, furFrames: true },
  blossom_ninja: { idle: 'idle-120x172.png', card: [19, 28], hat: false, furFrames: true },
  police: { idle: 'idle-120x172.png', card: [19, 28], hat: false },
  doctor: { idle: 'idle-120x172.png', card: [19, 28], hat: false },
  glasses_wizard: { idle: 'idle-120x172.png', card: [19, 28], hat: false, furFrames: true },
  book_wizard: { idle: 'idle-120x172.png', card: [19, 28], hat: false, furFrames: true },
  ginger_wizard: { idle: 'idle-120x172.png', card: [19, 28], hat: false, furFrames: true },
};
const STATES = ['thriving', 'happy', 'tired', 'neglected', 'sleep', 'ouch', 'welcome'] as const;
type State = (typeof STATES)[number];
const FURS = ['brown', 'black', 'white'] as const;
const TIMING: Record<State, [first: number, rest: number]> = {
  thriving: [500, 150], happy: [900, 180], tired: [800, 230], neglected: [750, 190],
  sleep: [900, 360], ouch: [600, 160], welcome: [600, 180],
};
/** like the bear's own tags (scripts/home-sprites.ts STATES), over a costume's `n` frames */
type Tag = [from: number, to: number, direction?: 'pingpong'];
const TAGS: Record<State, (n: number) => { in: Tag; loop: Tag }> = {
  thriving: (n) => ({ in: [0, 0], loop: [0, n - 1, 'pingpong'] }),
  happy: (n) => ({ in: [0, 0], loop: [0, n - 1] }),
  tired: (n) => ({ in: [0, 0], loop: [0, n - 1] }),
  neglected: (n) => ({ in: [0, n >> 1], loop: [n >> 1, n - 1, 'pingpong'] }),
  sleep: (n) => ({ in: [0, 0], loop: [0, n - 1, 'pingpong'] }),
  ouch: (n) => ({ in: [0, n - 1, 'pingpong'], loop: [0, 0] }),
  welcome: (n) => ({ in: [0, 0], loop: [0, n - 1, 'pingpong'] }),
};
const tag = ([from, to, direction]: Tag) => ({ from, to, direction: direction ?? 'forward' });
type HomeMeta = { frameSize: { w: number; h: number }; offset: [number, number]; columns: number; frames: { name: string; duration: number }[]; tags: unknown };
const home = JSON.parse(readFileSync(HOME, 'utf8')) as Record<State, HomeMeta>;

/**
 * PixelLab keeps the bear's own fur where the mask kept it (round the eyes and muzzle) but redraws the rest a redder,
 * darker brown, so the kept part shows as a pale patch. Every fur pixel takes the plain bear's own fur colour of the
 * nearest lightness instead (its brown or its cream), so the whole bear is one fur again, as in every other outfit.
 * Brown next to an eye's white is the iris and stays.
 */
const PLAIN = readPng(new URL('bear_idle.png', SPRITES));
const lumOf = (c: ArrayLike<number>) => 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2];
const furKind = (c: ArrayLike<number>): 'brown' | 'cream' | null => {
  const [h, s, l] = hsl([c[0], c[1], c[2]]);
  if (h >= 6 && h <= 30 && s >= 0.25 && l >= 0.13 && l <= 0.62) return 'brown'; // from reddish (not the cables' red)
  if (h >= 22 && h <= 38 && s >= 0.7 && l > 0.62 && l <= 0.92) return 'cream';
  return null;
};
const plainFur = { brown: [] as number[][], cream: [] as number[][] };
for (let p = 0; p < PLAIN.w * PLAIN.h; p++) {
  const c = Array.from(PLAIN.d.subarray(p * 4, p * 4 + 3));
  const kind = PLAIN.d[p * 4 + 3] ? furKind(c) : null;
  if (kind && !plainFur[kind].some((o) => o.join() === c.join())) plainFur[kind].push(c);
}
function plainFurOf(img: Img): Img {
  const out = { w: img.w, h: img.h, d: img.d.slice() };
  const nearWhite = (x: number, y: number) => {
    for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
      const [u, v] = [x + dx, y + dy];
      if (u >= 0 && v >= 0 && u < img.w && v < img.h && img.d[(v * img.w + u) * 4 + 3] && Math.min(...img.d.subarray((v * img.w + u) * 4, (v * img.w + u) * 4 + 3)) > 225) return true;
    }
    return false;
  };
  for (let y = 0; y < img.h; y++)
    for (let x = 0; x < img.w; x++) {
      const i = (y * img.w + x) * 4;
      if (!img.d[i + 3]) continue;
      const c = img.d.subarray(i, i + 3);
      const kind = furKind(c);
      if (!kind || (kind === 'brown' && lumOf(c) < 110 && nearWhite(x, y))) continue;
      const l = lumOf(c);
      const best = plainFur[kind].reduce((a, b) => (Math.abs(lumOf(b) - l) < Math.abs(lumOf(a) - l) ? b : a));
      out.d.set(best, i);
    }
  return out;
}

/** bottom row and middle column of a frame's figure */
function foot(img: Img): [number, number] {
  const [x0, , x1, y1] = bbox([img]);
  return [(x0 + x1) / 2, y1];
}
/** the bear's own sleep frames with the costume's fitted overlay on them (home-sprites.ts costumePixels) */
function fittedSleep(id: string): Img[] {
  const { frameSize: { w, h }, columns, frames } = home.sleep;
  const [bear, fit] = [readPng(new URL('bear_home_sleep.png', SPRITES)), readPng(new URL(`fitted_${id}_sleep.png`, SPRITES))];
  return frames.map((_, i) => {
    const [x0, y0] = [(i % columns) * w, Math.floor(i / columns) * h];
    const out = blank(w, h);
    for (const layer of [bear, fit])
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) {
          const s = ((y0 + y) * layer.w + x0 + x) * 4;
          if (layer.d[s + 3]) out.d.set(layer.d.subarray(s, s + 4), (y * w + x) * 4);
        }
    return out;
  });
}

const meta: Record<string, Record<string, unknown>> = {};
let built = 0;
for (const [id, costume] of Object.entries(COSTUMES)) {
  const furOf = costume.furFrames ? (img: Img) => img : plainFurOf;
  /** a fur's own frames (furFrames), else null: recolour the brown ones */
  const furFrame = (fur: (typeof FURS)[number], name: string) =>
    costume.furFrames && fur !== 'brown' ? readPng(new URL(`${id}/${fur}/${name}`, PILOT)) : null;
  const root = new URL(`${id}/`, PILOT);
  mkdirSync(new URL('sheets/', root), { recursive: true });
  mkdirSync(new URL('previews/', root), { recursive: true });
  meta[id] = {};
  for (const state of STATES) {
    const own = existsSync(new URL(`${state}-0.png`, root));
    if (!own && state !== 'sleep') throw new Error(`${id} ${state}: no frames`);
    const base: Img[] = own ? [] : fittedSleep(id);
    for (let i = 0; own && existsSync(new URL(`${state}-${i}.png`, root)); i++) base.push(furOf(readPng(new URL(`${state}-${i}.png`, root))));
    if (base.length < 5) throw new Error(`${id} ${state}: fewer than five frames`);
    // LiveBear reads the bear's own frame at the costume's frame index
    if (base.length > home[state].frames.length) throw new Error(`${id} ${state}: more frames than the bear's ${home[state].frames.length}`);
    if (base.some((frame) => frame.w !== base[0].w || frame.h !== base[0].h)) throw new Error(`${id} ${state}: frame sizes differ`);
    const cols = base.length <= 5 ? base.length : Math.ceil(base.length / 2);
    const durations = own
      ? base.map((_, i) => (i === base.length - 1 && state === 'welcome' ? 700 : TIMING[state][i === 0 ? 0 : 1]))
      : home.sleep.frames.map((f) => f.duration);
    const cell = { w: base[0].w, h: base[0].h };
    for (const fur of FURS) {
      const frames = furFrame(fur, `${state}-0.png`) ? base.map((_, i) => furFrame(fur, `${state}-${i}.png`)!) : base;
      const named = frames.map((img, i) => ({ img, name: `${state}${i}`, duration: durations[i] }));
      const brown = toSheet(named, cols);
      const sheet = fur === 'brown' || frames !== base ? brown : recolorCostumeFur(brown, fur, cell, costume.hat, costume.cream);
      writePng(new URL(`sheets/${state}-${fur}.png`, root), sheet);
      writeApng(new URL(`previews/${state}-${fur}.png`, root), base.map((_, i) => crop(sheet, (i % cols) * cell.w, Math.floor(i / cols) * cell.h, cell.w, cell.h)), durations);
      writePng(new URL(`costume_${id}_${state}${fur === 'brown' ? '' : `_${fur}`}.png`, SPRITES), sheet);
      built++;
    }
    if (!own) {
      // the bear's own sleep: its frames, timing and place
      meta[id][state] = { ...home.sleep };
      continue;
    }
    // the costume stands where the bear's first frame stands
    const bear = readPng(new URL(`bear_home_${state}.png`, SPRITES));
    const { frameSize, offset } = home[state];
    const [bx, by] = foot(crop(bear, 0, 0, frameSize.w, frameSize.h));
    const [wx, wy] = foot(base[0]);
    const tags = TAGS[state](base.length);
    meta[id][state] = {
      frameSize: cell,
      columns: cols,
      offset: [Math.round(offset[0] + bx - wx), offset[1] + by - wy],
      frames: durations.map((duration, i) => ({ name: `${state}${i}`, duration })),
      tags: { in: tag(tags.in), loop: tag(tags.loop) },
    };
  }
  // the shop card: the idle costume on the bear's 82×140 card, its fur coloured like the sheets
  const card = crop(furOf(readPng(new URL(costume.idle, root))), costume.card[0], costume.card[1], 82, 140);
  for (const fur of FURS) {
    const mine = furFrame(fur, costume.idle);
    const furCard = mine ? crop(mine, costume.card[0], costume.card[1], 82, 140) : fur === 'brown' ? card : recolorCostumeFur(card, fur, card, costume.hat, costume.cream);
    writePng(new URL(`outfit_${id}${fur === 'brown' ? '' : `_${fur}`}.png`, SPRITES), furCard);
  }
}
writeFileSync(META, `${JSON.stringify(meta, null, 2)}\n`);
console.log(`${built} costume sheets (${Object.keys(COSTUMES).join(', ')}), the shop cards and bear-costumes.json`);
