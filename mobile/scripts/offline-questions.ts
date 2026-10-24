/**
 * Офлайн дасгалын асуултын сан: api/seed-ийн шалгасан асуултуудыг апп-д багтаана.
 *
 * Сервер зөв хариуг утас руу хэзээ ч явуулдаггүй тул интернэтгүй үед апп өөрийн хуулбараар даалгавар өгнө. Офлайн
 * дасгал XP, оноо, дараалал цуглуулахгүй, сервертэй тааруулахгүй. Эх файлууд repo-д аль хэдийн байгаа (public).
 *
 * Ажиллуулах:  npm run offline:questions   (mobile/)
 * Эх сурвалж:  api/seed/questions.json (бүх түвшин, ангиас үл хамаарна),
 *              api/seed/lesson-questions.json (сурах бичгийн хичээл: зөвхөн `bookRef`-ийн ангид, сервертэй ижил)
 * Гаралт:      mobile/src/lib/offline/questions.json
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const SEED = new URL('../../api/seed/', import.meta.url);
const OUT = new URL('../src/lib/offline/questions.json', import.meta.url);

interface SeedQuestion {
  tier: number;
  subject: string;
  bookRef?: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

const read = (name: string) => JSON.parse(readFileSync(new URL(name, SEED), 'utf8')) as SeedQuestion[];
const seen = new Set<string>();
const out: object[] = [];

for (const q of [...read('questions.json'), ...read('lesson-questions.json')]) {
  if (q.options.length !== 4 || q.correctIndex < 0 || q.correctIndex > 3) throw new Error(`Буруу асуулт: ${q.prompt}`);
  const key = `${q.tier}|${q.subject}|${q.prompt}`;
  if (seen.has(key)) continue;
  seen.add(key);
  // 'math-6:5-6' → 6-р анги
  const grade = q.bookRef ? Number(q.bookRef.split(':')[0].split('-').pop()) : undefined;
  out.push({
    id: out.length + 1,
    tier: q.tier,
    subject: q.subject,
    ...(grade ? { grade } : {}),
    prompt: q.prompt,
    options: q.options,
    correctIndex: q.correctIndex,
    explanation: q.explanation,
  });
}

mkdirSync(new URL('.', OUT), { recursive: true });
// Мөр бүрт нэг асуулт: git diff уншигдахуйц
writeFileSync(OUT, `[\n${out.map((q) => JSON.stringify(q)).join(',\n')}\n]\n`);
console.log(`${out.length} асуулт → ${fileURLToPath(OUT)}`);
