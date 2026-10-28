// Renders the HTML poster sources to PNG.
//
//   npm run render                 # all posters + campaign-preview.png
//   npm run render -- 03 07        # only posters whose file name starts with 03 or 07 (+ preview)
//   npm run preview                # only campaign-preview.png (from the PNGs already in posters/)
//   node scripts/render.mjs --file some.html --out some.png --w 1600 --h 1200   # any page
//
// Each poster is rendered at 2x (2160×2700) and downscaled to 1080×1350 with Lanczos for clean edges on text and UI.
import { mkdirSync, readdirSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import sharp from 'sharp';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const W = 1080;
const H = 1350;
const SS = 2;

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};

const browser = await chromium.launch();

async function shoot(file, out, w, h) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: SS });
  await page.goto(pathToFileURL(file).href);
  await page.evaluate(() => document.fonts.ready);
  // wait for every <img> (screenshots are large)
  await page.evaluate(() => Promise.all([...document.images].map((im) => im.decode().catch(() => {}))));
  await page.evaluate(() => window.kitReady);
  const buf = await page.screenshot({ type: 'png' });
  await page.close();
  await sharp(buf).resize(w, h, { kernel: 'lanczos3' }).withMetadata({ icc: 'srgb' }).png({ compressionLevel: 9 }).toFile(out);
  console.log('ok', basename(out));
}

if (flag('--file')) {
  await shoot(resolve(flag('--file')), resolve(flag('--out')), Number(flag('--w') ?? W), Number(flag('--h') ?? H));
} else {
  const postersDir = join(root, 'posters');
  mkdirSync(postersDir, { recursive: true });
  if (!args.includes('--sheet-only')) {
    const only = args.filter((a) => !a.startsWith('--'));
    const sources = readdirSync(join(root, 'source/posters'))
      .filter((f) => f.endsWith('.html'))
      .filter((f) => !only.length || only.some((o) => f.startsWith(o)))
      .sort();
    for (const f of sources) await shoot(join(root, 'source/posters', f), join(postersDir, f.replace('.html', '.png')), W, H);
  }
  await shoot(join(root, 'source/contact-sheet.html'), join(root, 'campaign-preview.png'), 2400, 2250);
}
await browser.close();
