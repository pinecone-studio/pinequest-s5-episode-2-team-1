// Демогийн өмнө (түвшин × хичээл) 9 хослол тус бүрт ~40 асуулт үүсгэнэ.
//   npm run seed:questions                 # LLM-ээр (ажиллаж буй dev сервер рүү /admin/generate)
//   npm run seed:questions -- --target 20  # өөр зорилтот тоо
//   npm run seed:fixtures                  # LLM-гүй: seed/fixtures.json (хослол бүрт 6)
//   npm run questions:export / questions:import   # шалгасан сангаа seed/questions.json-д хадгалах / сэргээх
//   npm run lessons:import                 # сурах замын хичээлийн бодлого: seed/lesson-questions.json (bookRef-тэй)
//   --url https://...workers.dev           # deploy хийсэн сервер рүү
//   --model gemini-3.6-flash,gemini-3.5-flash-lite
//                                          # загвар(ууд): эхнийх нь өдрийн квот дуусахад дараагийнх руу
//   --chunk 10                             # нэг LLM хүсэлтэд хэдэн асуулт (free tier-ийн өдрийн квотыг хэмнэнэ)
//   --tier 1                               # зөвхөн нэг түвшин
//   --subject math,physics                 # зөвхөн эдгээр хичээл
//   --parallel 2                           # хэдэн хослолыг зэрэг үүсгэх (free tier-ийн минутын хязгаар)
//   --no-books                             # сурах бичгийн сангүйгээр, хөтөлбөрийн сэдвийн жагсаалтаар
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ADMIN_TOKEN, API_URL, arg, call, flag, HttpError, sleep } from './lib';

const TIERS = [1, 2, 3] as const;
const SUBJECTS = ['math', 'mongolian', 'physics'] as const;
const TARGET = Number(arg('target', '40'));
const DELAY_MS = Number(arg('delay', '4000')); // Gemini free tier-ийн минутын хязгаарт багтаах завсар
// Таслалаар хэд хэдэн загвар: эхнийх нь өдрийн квот (free tier) дуусахад дараагийнх руу шилжинэ.
const MODELS = (arg('model') ?? '').split(',').map((m) => m.trim()).filter(Boolean);
let modelIndex = 0;
const PARALLEL = Number(arg('parallel', '2'));
const CHUNK = Number(arg('chunk', '10'));
const ONLY_TIER = arg('tier') ? Number(arg('tier')) : null;
const ONLY_SUBJECTS = arg('subject')?.split(',') ?? null;

let overloaded = 0; // одоогийн загварын дараалсан 503 ("high demand")

function nextModel(reason: string): boolean {
  if (modelIndex < MODELS.length - 1) {
    modelIndex++;
    overloaded = 0;
    console.log(`⇒ ${reason}. ${MODELS[modelIndex]} загвар руу шилжлээ.`);
    return true;
  }
  return false;
}

/**
 * Өдрийн квот дууссан эсвэл загвар дараалан 2 удаа "high demand" (503) буцаавал дараагийн
 * загвар руу шилжинэ. Шилжсэн бол true.
 */
function switchModelIfStuck(message: string): boolean {
  if (/PerDay/i.test(message)) {
    if (nextModel('Өдрийн квот дууслаа')) return true;
    console.log('⇒ Бүх загварын өдрийн квот дууслаа. Маргааш эсвэл өөр загвараар (--model) дахин ажиллуулна уу.');
    process.exit(1);
  }
  if (/\b503\b|high demand|UNAVAILABLE/i.test(message)) {
    overloaded++;
    return overloaded >= 2 && nextModel('Загвар ачаалалтай (503)');
  }
  return false;
}

interface PoolRow {
  tier: number;
  subject: string;
  active: number;
  flagged: number;
}
interface GenerateReport {
  inserted: number;
  duplicates: number;
  rejected: number;
  rejectReasons: string[];
  errors: string[];
  grounded: string[];
}

const fixturesPath = join(dirname(fileURLToPath(import.meta.url)), '..', 'seed', 'fixtures.json');

async function pool() {
  return call<{ provider: string | null; pool: PoolRow[] }>('GET', '/admin/pool', { admin: true });
}

function count(rows: PoolRow[], tier: number, subject: string): number {
  return rows.find((r) => r.tier === tier && r.subject === subject)?.active ?? 0;
}

function printPool(rows: PoolRow[]) {
  for (const tier of TIERS) {
    console.log(`  Түвшин ${tier}: ` + SUBJECTS.map((s) => `${s} ${count(rows, tier, s)}`).join(', '));
  }
}

async function seedCombo(tier: number, subject: string, start: number) {
  let have = start;
  let failures = 0; // дараалсан амжилтгүй оролдлого
  while (have < TARGET && failures < 6) {
    const want = Math.min(Math.max(10, CHUNK), TARGET - have);
    const model = MODELS[modelIndex];
    try {
      const r = await call<GenerateReport>('POST', '/admin/generate', {
        admin: true,
        body: { tier, subject, count: want, chunk: CHUNK, books: !flag('no-books'), ...(model ? { model } : {}) },
      });
      have += r.inserted;
      failures = r.inserted === 0 ? failures + 1 : 0;
      if (r.inserted > 0) overloaded = 0;
      const extra =
        (r.rejected ? ` [татгалзсан: ${[...new Set(r.rejectReasons)].join(', ')}]` : '') +
        (r.grounded.length ? ` · сан: ${r.grounded.join(', ')}` : '');
      console.log(`Т${tier} ${subject}: +${r.inserted} (давхардсан ${r.duplicates}, татгалзсан ${r.rejected}) → ${have}/${TARGET}${extra}${model ? ` · ${model}` : ''}`);
      for (const e of r.errors) {
        console.log(`   ⚠ ${e.slice(0, 160)}`);
        if (switchModelIfStuck(e)) failures = 0;
      }
    } catch (e) {
      failures++;
      const message = e instanceof Error ? e.message : String(e);
      if (switchModelIfStuck(message)) {
        failures = 0;
        continue;
      }
      const rateLimited = /\b429\b|RESOURCE_EXHAUSTED|quota|\b503\b|UNAVAILABLE/i.test(message);
      const wait = rateLimited ? 60_000 : 5_000;
      console.log(`Т${tier} ${subject}: алдаа — ${message.slice(0, 200)}; ${wait / 1000} сек хүлээнэ`);
      if (e instanceof HttpError && e.status === 503 && /LLM_UNAVAILABLE/.test(e.code)) process.exit(1);
      await sleep(wait);
    }
    await sleep(DELAY_MS);
  }
}

async function main() {
  if (!ADMIN_TOKEN) throw new Error('ADMIN_TOKEN олдсонгүй: api/.dev.vars-д ADMIN_TOKEN=... байх ёстой');
  console.log(`API: ${API_URL}`);

  const exportPath = arg('export');
  if (exportPath) {
    const { questions } = await call<{ questions: unknown[] }>('GET', '/admin/export', { admin: true });
    writeFileSync(exportPath, `${JSON.stringify(questions, null, 1)}\n`);
    console.log(`${questions.length} идэвхтэй асуултыг ${exportPath}-д хадгаллаа`);
    return;
  }

  if (flag('fixtures')) {
    const file = arg('file') ?? fixturesPath;
    const questions = JSON.parse(readFileSync(file, 'utf8'));
    const r = await call<{ inserted: number; duplicates: number; rejected: number }>('POST', '/admin/import', {
      admin: true,
      body: { source: arg('source') ?? (file === fixturesPath ? 'fixture' : 'import'), questions },
    });
    console.log(`${file}: +${r.inserted} (давхардсан ${r.duplicates}, татгалзсан ${r.rejected})`);
    printPool((await pool()).pool);
    return;
  }

  const status = await pool();
  if (!status.provider) {
    console.error('LLM тохируулаагүй байна. GEMINI_API_KEY-ээ root .env.local эсвэл api/.dev.vars-д нэмээд `npm run dev`-ээ дахин асаана уу.');
    console.error('Түр зуур LLM-гүй ажиллуулах бол: npm run seed:fixtures');
    process.exit(1);
  }
  console.log(`Provider: ${status.provider}, зорилт: хослол бүрт ${TARGET}`);

  // Хослолуудыг --parallel ширхэгээр зэрэг ажиллуулна (Gemini free tier-ийн хурдаас хамаарна).
  const combos = TIERS.filter((t) => ONLY_TIER === null || t === ONLY_TIER).flatMap((tier) =>
    SUBJECTS.filter((s) => !ONLY_SUBJECTS || ONLY_SUBJECTS.includes(s)).map((subject) => ({ tier, subject })),
  );
  let next = 0;
  const worker = async () => {
    while (next < combos.length) {
      const { tier, subject } = combos[next++];
      await seedCombo(tier, subject, count(status.pool, tier, subject));
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, PARALLEL) }, worker));

  console.log('Дууслаа. Асуултын сан:');
  printPool((await pool()).pool);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
