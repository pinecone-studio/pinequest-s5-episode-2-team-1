// BossArena-ийн бодит зураг, байрлалаар статик нийлмэл зураг гаргана; browser/аппын тест биш.
// Ажиллуулах: node scripts/santa-bell-preview.ts (mobile/)
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync } from 'node:fs';
import { blank, type Img, readPng, writePng } from './png.ts';
import { compose, crop, hex, put, toSheet } from './sprite-kit.ts';

const OUT = new URL('../../.claude/preview/santa-bell/', import.meta.url);
const ASSETS = new URL('../assets/sprites/', import.meta.url);
const arena = readFileSync(new URL('../src/components/BossArena.tsx', import.meta.url), 'utf8');
const path = readFileSync(new URL('../src/lib/pixelBear/path.ts', import.meta.url), 'utf8');
const task = readFileSync(new URL('../src/app/task/[subject].tsx', import.meta.url), 'utf8');
const bear = JSON.parse(readFileSync(new URL('../src/lib/pixelBear/bear.json', import.meta.url), 'utf8'));
const santa = JSON.parse(readFileSync(new URL('../src/lib/pixelBear/golems.json', import.meta.url), 'utf8')).santa;
const W = 390;
const H = Number(task.match(/height: (\d+) \+ insets.top/)?.[1]);
const constant = (name: string) => Number(arena.match(new RegExp(`const ${name} = (\\d+);`))?.[1]);
const ground = constant('GROUND');
const bearRight = constant('BEAR_RIGHT');
const bossLeft = constant('BOSS_LEFT');
const boss = path.slice(path.indexOf("{ name: 'Хар Цасан өвгөн'"));
const match = boss.match(/impact: \{ id: '([^']+)', frames: (\d+), cols: (\d+), pivot: \[([^,]+), ([^\]]+)\], ms: (\d+) \}/);
assert(match, 'Santa-ийн impact тохиргоо өөрчлөгдсөн');
const fraction = (expression: string) => {
  assert(/^-?\d+(?:\.\d+)?(?:\s*\/\s*\d+)?$/.test(expression.trim()));
  const [n, d = 1] = expression.split('/').map(Number);
  return n / d;
};
const [id, count, cols] = [match[1], Number(match[2]), Number(match[3])];
const pivot = [fraction(match[4]), fraction(match[5])];
const image = (key: string) => readPng(new URL(`${key}.png`, ASSETS));
const sheet = image(id);
const fw = sheet.w / cols;
const fh = sheet.h / Math.ceil(count / cols);
assert.deepEqual([count, cols, fw, fh, Number(match[6])], [6, 3, 103, 96, 90]);
assert.deepEqual([ground, bearRight, bossLeft, H], [300, 44, 28, 402]);
const frame = (sheet: Img, columns: number, rows: number, index: number) =>
  crop(sheet, (index % columns) * sheet.w / columns, Math.floor(index / columns) * sheet.h / rows, sheet.w / columns, sheet.h / rows);
const bearSheet = image(arena.match(/const BEAR_SHEET: SpriteKey = '([^']+)'/)![1]);
const bearFrame = frame(bearSheet, bear.columns, Math.ceil(bear.frames.length / bear.columns), bear.tags.hurt.from + 1);
const px = bearFrame.w / bear.frameSize.w;
const target = { x: W - bearRight - bearFrame.w + bear.paw[0] * px, y: ground - bear.feet * px + bear.paw[1] * px };
const feet = { x: W - bearRight - bearFrame.w / 2, y: ground };
const left = target.x - fw * pivot[0];
const top = target.y - fh * pivot[1];
// Эх зурагт цагирагийн төв 82-р мөрөнд: сарвууны онох цэгээс хөлд буусан эсэхийг шалгана.
assert(Math.abs(left + fw / 2 - feet.x) <= 0.5);
assert.equal(top + 82, feet.y);
assert(Number.isInteger(left) && Number.isInteger(top));
const lair = image(boss.match(/'lair_snow_\d+x\d+'/)![0].slice(1, -1));
const santaSheet = image(boss.match(/'golem_santa_sheet_1200x585'/)![0].slice(1, -1));
const santaFrame = frame(santaSheet, santa.columns, Math.ceil(santa.frames.length / santa.columns), santa.tags.idle.from);
const bg = blank(W, H);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) put(bg, x, y, hex('#18182e'));
let scene = compose(bg, lair, (W - lair.w) / 2, H - lair.h);
scene = compose(scene, santaFrame, bossLeft, ground - santaFrame.h);
scene = compose(scene, bearFrame, W - bearRight - bearFrame.w, ground - bear.feet * px);
const shots = Array.from({ length: count }, (_, i) => compose(scene, frame(sheet, cols, 2, i), left, top));
const guides = shots.map((img, i) => {
  const out = { ...img, d: img.d.slice() };
  for (let x = 0; x < W; x += 4) put(out, x, ground, hex('#ff75cf'));
  for (let d = -5; d <= 5; d++) {
    put(out, feet.x + d, feet.y, hex('#ffe47a'));
    put(out, feet.x, feet.y + d, hex('#ffe47a'));
  }
  return { name: `burst${i}`, duration: 90, img: out };
});
mkdirSync(OUT, { recursive: true });
writePng(new URL('arena_alignment_contact.png', OUT), toSheet(guides, 3));
writePng(new URL('arena_burst_frame3.png', OUT), shots[3]);
console.log(JSON.stringify({ output: OUT.pathname, pivot, frame: [fw, fh], target, feet, left, top, ring: [left + fw / 2, top + 82] }));
