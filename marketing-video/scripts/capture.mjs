// Captures real KUMA UI screenshots from the local dev app (web on :8081, API on :8787).
//
// Usage (local only; never point this at production):
//   KUMA_TOKEN=<local session token> KUMA_USER_ID=<local user id> node scripts/capture.mjs
// Optional: KUMA_BOT_USER=<local username for the duel opponent> (password = duel-bot default)
//
// Output: public/screens/*.png at 390x844 CSS px, device scale 3 (1170x2532).
import { execFileSync, spawn } from 'node:child_process';
import { readdirSync, mkdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '../..');
const out = resolve(here, '../public/screens');
mkdirSync(out, { recursive: true });

const WEB = process.env.KUMA_WEB ?? 'http://localhost:8081';
const TOKEN = process.env.KUMA_TOKEN;
const USER_ID = process.env.KUMA_USER_ID;
const BOT_USER = process.env.KUMA_BOT_USER ?? 'nomin_7';
const ONLY = process.env.ONLY?.split(',');
if (!TOKEN || !USER_ID) throw new Error('Set KUMA_TOKEN and KUMA_USER_ID (local test account)');
if (!/^http:\/\/(localhost|127\.0\.0\.1)/.test(WEB)) throw new Error('Capture runs against the local dev server only');

const LETTERS = ['А', 'Б', 'В', 'Г'];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Correct answers come from the local D1 file so the video shows the real "correct" state.
const d1Dir = join(repo, 'api/.wrangler/state/v3/d1/miniflare-D1DatabaseObject');
const dbFile = readdirSync(d1Dir)
  .filter((f) => f.endsWith('.sqlite') && f !== 'metadata.sqlite')
  .map((f) => join(d1Dir, f))
  .sort((a, b) => statSync(b).size - statSync(a).size)[0];
// The server shuffles options per task, so match the correct option by its text.
const correctIndex = (questionId, shownOptions) => {
  const row = execFileSync('sqlite3', ['-json', `file:${dbFile}?immutable=1`, `SELECT options, correct_index FROM questions WHERE id = ${Number(questionId)}`]).toString();
  const [{ options, correct_index }] = JSON.parse(row);
  const answer = JSON.parse(options)[correct_index];
  const i = shownOptions.indexOf(answer);
  if (i < 0) throw new Error(`answer for question ${questionId} not among shown options`);
  return i;
};

const browser = await chromium.launch();
const newPage = async (authed = true) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, locale: 'mn-MN' });
  if (authed) {
    await ctx.addInitScript(
      ([token, id]) => {
        localStorage.setItem('surgalt.session', token);
        const key = `pq.bear.${id}`;
        const cur = JSON.parse(localStorage.getItem(key) || '{}');
        localStorage.setItem(key, JSON.stringify({ ...cur, subject: 'math' }));
      },
      [TOKEN, USER_ID],
    );
  }
  return ctx.newPage();
};
const shot = async (page, name) => {
  await page.screenshot({ path: join(out, `${name}.png`) });
  console.log('saved', name);
};
const want = (name) => !ONLY || ONLY.includes(name);

if (want('welcome')) {
  const page = await newPage(false);
  await page.goto(`${WEB}/welcome`);
  await sleep(4000);
  await shot(page, 'welcome');
  await page.context().close();
}

if (want('lesson')) {
  const page = await newPage();
  let task = null;
  page.on('response', async (r) => {
    if (!/\/tasks(\/review)?$/.test(new URL(r.url()).pathname) || r.request().method() !== 'POST') return;
    try {
      task = await r.json();
    } catch {}
  });
  await page.goto(`${WEB}/path`);
  await sleep(5000);
  await shot(page, 'path');
  await page.mouse.click(202, 212);
  await sleep(1500);
  await shot(page, 'path-popup');
  await page.getByText(/ЭХЛЭХ/).first().click();
  for (let i = 0; i < 50 && !task; i++) await sleep(200);
  await sleep(2500);
  if (!task?.questions) throw new Error(`no task: ${JSON.stringify(task)}`);
  for (let i = task.answeredCount; i < task.questions.length; i++) {
    const q = task.questions[i];
    const ci = correctIndex(q.id, q.options);
    if (i === task.answeredCount) await shot(page, 'lesson-q');
    await page.getByRole('button', { name: new RegExp(`^${LETTERS[ci]}\\. `) }).click();
    await sleep(500);
    if (i === task.answeredCount) await shot(page, 'lesson-selected');
    await page.getByRole('button', { name: 'ШАЛГАХ' }).click();
    await sleep(1600);
    if (i === task.answeredCount) await shot(page, 'lesson-correct');
    const last = i === task.questions.length - 1;
    await page.getByRole('button', { name: last ? 'ДҮНГЭЭ ХАРАХ' : 'ҮРГЭЛЖЛҮҮЛЭХ' }).click();
    await sleep(2200);
  }
  await shot(page, 'lesson-result');
  await sleep(2500);
  await shot(page, 'lesson-result-2');
  await page.context().close();
}

if (want('home')) {
  const page = await newPage();
  await page.goto(`${WEB}/`);
  await sleep(5000);
  await shot(page, 'home');
  await page.goto(`${WEB}/path`);
  await sleep(5000);
  await shot(page, 'path-after');
  await page.goto(`${WEB}/shop`);
  await sleep(5000);
  await shot(page, 'shop-bg');
  await page.getByText('Хувцас', { exact: true }).click();
  await sleep(3000);
  await shot(page, 'shop-outfit');
  await page.context().close();
}

if (want('onboarding')) {
  const page = await newPage();
  await page.goto(`${WEB}/onboarding`);
  await sleep(4000);
  await page.getByRole('radio', { name: 'Бусад' }).click();
  await page.getByRole('button', { name: 'Үргэлжлүүлэх' }).click();
  await sleep(3000);
  await shot(page, 'onboarding-grade');
  await page.context().close();
}

if (want('duel')) {
  const page = await newPage();
  let code = null;
  const frames = [];
  page.on('response', async (r) => {
    if (new URL(r.url()).pathname !== '/duels' || r.request().method() !== 'POST') return;
    try {
      code = (await r.json()).duel.code;
    } catch {}
  });
  page.on('websocket', (ws) =>
    ws.on('framereceived', (f) => {
      try {
        frames.push(JSON.parse(f.payload));
      } catch {}
    }),
  );
  await page.goto(`${WEB}/duel`);
  await sleep(4000);
  for (let i = 0; i < 4; i++) await page.getByText('+', { exact: true }).click();
  await page.getByText('Найзтайгаа', { exact: true }).click();
  await sleep(600);
  await shot(page, 'duel-create');
  await page.getByText(/^Сорилт үүсгэх · /).click();
  for (let i = 0; i < 50 && !code; i++) await sleep(200);
  await sleep(1500);
  await shot(page, 'duel-code');
  const bot = spawn('npm', ['--prefix', join(repo, 'api'), 'run', 'bot', '--', '--code', code, '--user', BOT_USER, '--min', '8', '--max', '14', '--accuracy', '0.3'], {
    stdio: 'inherit',
  });
  await page.waitForURL(/\/duel\/\d+/, { timeout: 30000 });
  const waitFrame = async (pred, ms = 40000) => {
    for (let t = 0; t < ms; t += 100) {
      const f = frames.find(pred);
      if (f) return f;
      await sleep(100);
    }
    throw new Error('frame timeout');
  };
  await waitFrame((f) => f.type === 'countdown');
  await sleep(700);
  await shot(page, 'duel-countdown');
  for (let q = 0; ; q++) {
    const msg = await waitFrame((f) => (f.type === 'question' && f.q === q) || f.type === 'finished');
    if (msg.type === 'finished') break;
    await sleep(1600);
    await shot(page, `duel-q${q}`);
    const ci = correctIndex(msg.questionId, msg.options);
    await page.getByRole('button', { name: new RegExp(`^${LETTERS[ci]}\\. `) }).click();
    await sleep(900);
    await shot(page, `duel-a${q}`);
    await waitFrame((f) => f.type === 'reveal' && f.q === q);
    await sleep(800);
    await shot(page, `duel-reveal${q}`);
  }
  await sleep(2500);
  await shot(page, 'duel-result');
  bot.kill();
  await page.context().close();
}

await browser.close();
