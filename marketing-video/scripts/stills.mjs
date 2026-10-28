// Renders preview stills at key frames: node scripts/stills.mjs [KumaVertical|KumaWide] [frame,frame,...]
import { mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition } from '@remotion/renderer';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ids = process.argv[2] ? [process.argv[2]] : ['KumaVertical', 'KumaWide'];
// one frame per beat: hook, strike, flip, reveal, map, bear, duel, value, cta
const frames = process.argv[3] ? process.argv[3].split(',').map(Number) : [24, 40, 75, 150, 290, 410, 530, 650, 860];
const outDir = join(root, 'out/stills');
mkdirSync(outDir, { recursive: true });

const serveUrl = await bundle({ entryPoint: join(root, 'src/index.ts'), rootDir: root, publicDir: join(root, 'public') });
for (const id of ids) {
  const composition = await selectComposition({ serveUrl, id });
  for (const frame of frames) {
    const output = join(outDir, `${id}-${String(frame).padStart(3, '0')}.png`);
    await renderStill({ serveUrl, composition, frame, output });
    console.log('still', output);
  }
}
