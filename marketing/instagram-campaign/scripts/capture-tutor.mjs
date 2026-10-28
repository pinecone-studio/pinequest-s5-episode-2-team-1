// Captures the real "talk with the bear" tutor screen (/tutor) from the LOCAL dev app during a live session.
//
//   KUMA_TOKEN=<local session token> KUMA_USER_ID=<local user id> node scripts/capture-tutor.mjs [questionId]
//
// Needs the local API (:8787) running with a free-tier GEMINI_API_KEY and TUTOR_SPEECH=live, and the web app (:8081).
// Chromium gets a fake microphone and may autoplay, so the bear talks first and then listens. KUMA_MIC_FILE=<wav> feeds that
// file to the fake microphone (it loops), so the bear hears a spoken question. KUMA_PREFIX names the output files.
// Output: assets/screens/tutor-NN.png (390×844 pt at 3x) plus tutor-log.txt with the chalk text of each frame.
import { writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const WEB = process.env.KUMA_WEB ?? 'http://localhost:8081';
const { KUMA_TOKEN: TOKEN, KUMA_USER_ID: USER_ID } = process.env;
if (!TOKEN || !USER_ID) throw new Error('Set KUMA_TOKEN and KUMA_USER_ID (local test account)');
if (!/^http:\/\/(localhost|127\.0\.0\.1)/.test(WEB)) throw new Error('Capture runs against the local dev server only');
const qid = process.argv[2];
const PREFIX = process.env.KUMA_PREFIX ?? 'tutor';
const MIC = process.env.KUMA_MIC_FILE;

const browser = await chromium.launch({
  args: [
    '--use-fake-ui-for-media-stream',
    '--use-fake-device-for-media-stream',
    '--autoplay-policy=no-user-gesture-required',
    ...(MIC ? [`--use-file-for-fake-audio-capture=${MIC}`] : []),
  ],
});
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, locale: 'mn-MN', permissions: ['microphone'] });
await ctx.addInitScript(
  ([token, id]) => {
    localStorage.setItem('surgalt.session', token);
    const key = `pq.bear.${id}`;
    const cur = JSON.parse(localStorage.getItem(key) || '{}');
    localStorage.setItem(key, JSON.stringify({ ...cur, subject: 'math' }));
  },
  [TOKEN, USER_ID],
);
const page = await ctx.newPage();
page.on('console', (m) => m.type() === 'error' && console.log('console:', m.text().slice(0, 200)));
await page.goto(`${WEB}/tutor${qid ? `?questionId=${qid}` : ''}`);

const log = [];
const t0 = Date.now();
for (let i = 0; i < 40; i++) {
  await page.waitForTimeout(i === 0 ? 1200 : 2500);
  const name = `${PREFIX}-${String(i).padStart(2, '0')}.png`;
  await page.screenshot({ path: join(root, 'assets/screens', name) });
  const text = (await page.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ').slice(0, 400);
  log.push(`${name} @${((Date.now() - t0) / 1000).toFixed(1)}s ${text}`);
  console.log(log.at(-1));
  if (/Дахин ярилцах/.test(text)) break; // session ended
}
writeFileSync(join(root, `assets/screens/${PREFIX}-log.txt`), log.join('\n') + '\n');
await browser.close();
