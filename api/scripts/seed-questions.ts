// Демогийн өмнө (түвшин × хичээл) 9 хослол тус бүрт ~40 асуулт үүсгэнэ.
//   npm run seed:questions                 # LLM-ээр (ажиллаж буй dev сервер рүү /admin/generate)
//   npm run seed:questions -- --target 20  # өөр зорилтот тоо
//   npm run seed:fixtures                  # LLM-гүй: seed/fixtures.json (хослол бүрт 6)
//   --url https://...workers.dev           # deploy хийсэн сервер рүү
//   --model gemini-3.5-flash-lite          # энэ удаад өөр Gemini загвар (хурдан ч монгол бичвэрт алдаа ихтэй)
//   --parallel 2                           # хэдэн хослолыг зэрэг үүсгэх (free tier-ийн минутын хязгаар)
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ADMIN_TOKEN, API_URL, arg, call, flag, HttpError, sleep } from './lib';

const TIERS = [1, 2, 3] as const;
const SUBJECTS = ['math', 'mongolian', 'physics'] as const;
const TARGET = Number(arg('target', '40'));
const DELAY_MS = Number(arg('delay', '4000')); // Gemini free tier-ийн минутын хязгаарт багтаах завсар
const MODEL = arg('model'); // жишээ нь gemini-3.5-flash-lite; үгүй бол серверийн GEMINI_MODEL
const PARALLEL = Number(arg('parallel', '2'));

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
    const want = Math.min(10, TARGET - have);
    try {
      const r = await call<GenerateReport>('POST', '/admin/generate', {
        admin: true,
        body: { tier, subject, count: want, chunk: 5, ...(MODEL ? { model: MODEL } : {}) },
      });
      have += r.inserted;
      failures = r.inserted === 0 ? failures + 1 : 0;
      const extra = r.rejected ? ` [татгалзсан: ${[...new Set(r.rejectReasons)].join(', ')}]` : '';
      console.log(`Т${tier} ${subject}: +${r.inserted} (давхардсан ${r.duplicates}, татгалзсан ${r.rejected}) → ${have}/${TARGET}${extra}`);
      for (const e of r.errors) console.log(`   ⚠ ${e.slice(0, 160)}`);
    } catch (e) {
      failures++;
      const message = e instanceof Error ? e.message : String(e);
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

  if (flag('fixtures')) {
    const questions = JSON.parse(readFileSync(fixturesPath, 'utf8'));
    const r = await call<{ inserted: number; duplicates: number; rejected: number }>('POST', '/admin/import', {
      admin: true,
      body: { source: 'fixture', questions },
    });
    console.log(`Fixture: +${r.inserted} (давхардсан ${r.duplicates}, татгалзсан ${r.rejected})`);
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
  const combos = TIERS.flatMap((tier) => SUBJECTS.map((subject) => ({ tier, subject })));
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
