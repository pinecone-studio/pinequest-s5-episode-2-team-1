/** Build review sheets and animated previews from PixelLab's witch pilot frames. Not app assets. */
import { existsSync, mkdirSync } from 'node:fs';
import { recolorCostumeFur } from './costume-fur.ts';
import { type Img, readPng, writeApng, writePng } from './png.ts';
import { toSheet } from './sprite-kit.ts';

const ROOT = new URL('../../docs/design/pixel-bear/costumes/pixellab/pilot/witch/', import.meta.url);
const SHEETS = new URL('sheets/', ROOT);
const PREVIEWS = new URL('previews/', ROOT);
mkdirSync(SHEETS, { recursive: true });
mkdirSync(PREVIEWS, { recursive: true });

const STATES = ['thriving', 'happy', 'tired', 'neglected', 'sleep', 'ouch', 'welcome'] as const;
const FURS = ['brown', 'black', 'white'] as const;
const TIMING: Record<(typeof STATES)[number], [first: number, rest: number]> = {
  thriving: [500, 150], happy: [900, 180], tired: [800, 230], neglected: [750, 190],
  sleep: [900, 360], ouch: [600, 160], welcome: [600, 180],
};
let built = 0;
for (const state of STATES) {
  if (!existsSync(new URL(`${state}-0.png`, ROOT))) continue;
  const base: Img[] = [];
  for (let i = 0; existsSync(new URL(`${state}-${i}.png`, ROOT)); i++) base.push(readPng(new URL(`${state}-${i}.png`, ROOT)));
  if (base.length < 5) throw new Error(`${state}: fewer than five frames`);
  if (base.some((frame) => frame.w !== base[0].w || frame.h !== base[0].h)) throw new Error(`${state}: frame sizes differ`);
  for (const fur of FURS) {
    const frames = fur === 'brown' ? base : base.map((frame) => recolorCostumeFur(frame, fur));
    const named = frames.map((img, i) => ({ img, name: `${state}-${i}`, duration: i === frames.length - 1 && state === 'welcome' ? 700 : TIMING[state][i === 0 ? 0 : 1] }));
    writePng(new URL(`${state}-${fur}.png`, SHEETS), toSheet(named, state === 'welcome' ? 4 : 5));
    writeApng(new URL(`${state}-${fur}.png`, PREVIEWS), frames, named.map((f) => f.duration));
    built++;
  }
}
console.log(`${built} witch pilot sheets and previews`);
