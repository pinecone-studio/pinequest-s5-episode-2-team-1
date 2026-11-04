// Тогтмол roadmap-тай хичээлийн (нийгэм судлал) зангилаа бүрийн 3 шатанд (Суурь, Дунд, Ахисан) номын
// хуудсаар асуулт үүсгэж, дараа нь seed файлд export хийнэ. Аль хэдийн хүрэлцсэн шатыг алгасна (дахин ажиллуулж болно).
//   npm run dev:books                                  # local DB + багийн сурах бичгийн сан (GEMINI_API_KEY хэрэгтэй)
//   npm run seed:lessons                               # social 7–11, шат бүрт 9 асуулт
//   npm run seed:lessons -- --per 6 --grade 7 --parallel 3
//   npm run social:import -- --url https://...           # бэлэн seed/social-lesson-questions.json-ийг оруулах
import { writeFileSync } from 'node:fs';
import { GAME } from '../src/config/game';
import { roadmapNodes } from '../src/config/roadmap';
import { arg, call, HttpError, sleep } from './lib';

const SUBJECT = 'social' as const;
const PER = Number(arg('per', '9'));
const PARALLEL = Number(arg('parallel', '2'));
const GRADES = arg('grade') ? [Number(arg('grade'))] : [7, 8, 9, 10, 11];
const OUT = arg('out', `seed/${SUBJECT}-lesson-questions.json`)!;

interface Exported {
  bookRef?: string;
  difficulty?: number;
}
interface GenerateReport {
  inserted: number;
  rejected: number;
  errors: string[];
}

/** 'social-7:12-15' → slug, хуудасны хүрээ (src/templates-ийн templateRange; тэр нь Worker-ийн төрөл татдаг) */
const templateRange = (ref: string) => {
  const m = /^([a-z0-9-]+):(\d+)(?:-(\d+))?$/.exec(ref);
  return m ? { slug: m[1], from: Number(m[2]), to: Number(m[3] ?? m[2]) } : null;
};
const pageOf = (ref: string) => {
  const r = templateRange(ref);
  return r ? { slug: r.slug, page: r.from } : null;
};

async function exportAll(): Promise<Exported[]> {
  return (await call<{ questions: Exported[] }>('GET', `/admin/export?subject=${SUBJECT}`, { admin: true })).questions;
}

async function main() {
  const existing = await exportAll();
  const jobs = GRADES.flatMap((grade) =>
    roadmapNodes(SUBJECT, grade).flatMap((node) => {
      const range = templateRange(node.ref!)!;
      return ([1, 2, 3] as const).map((difficulty) => {
        const have = existing.filter((q) => {
          const p = q.bookRef ? pageOf(q.bookRef) : null;
          return q.difficulty === difficulty && p?.slug === range.slug && p.page >= range.from && p.page <= range.to;
        }).length;
        return { grade, node, difficulty, want: PER - have };
      });
    }),
  ).filter((j) => j.want > 0);
  console.log(`${jobs.length} (зангилаа × шат) үүсгэнэ, шат бүрт ${PER} асуулт`);

  let done = 0;
  const run = async () => {
    for (let job = jobs.shift(); job; job = jobs.shift()) {
      const { grade, node, difficulty } = job;
      let want = job.want;
      for (let attempt = 0; want > 0 && attempt < 4; attempt++) {
        try {
          const r = await call<GenerateReport>('POST', '/admin/generate', {
            admin: true,
            body: { tier: GAME.GRADE_TO_TIER[grade], subject: SUBJECT, count: want, chunk: Math.min(want, 10), ref: node.ref, difficulty },
          });
          want -= r.inserted;
          if (r.inserted === 0) await sleep(3000);
        } catch (e) {
          // 429/503: квот, ачаалал; бусад алдааг дахин оролдохгүй
          if (!(e instanceof HttpError) || ![429, 502, 503].includes(e.status)) throw e;
          await sleep(15_000);
        }
      }
      done++;
      console.log(`${done}. ${node.ref} шат ${difficulty}: ${want > 0 ? `${want} дутуу` : 'бэлэн'} — ${node.title}`);
    }
  };
  await Promise.all(Array.from({ length: PARALLEL }, run));

  const questions = await exportAll();
  writeFileSync(OUT, `${JSON.stringify(questions, null, 1)}\n`);
  console.log(`${questions.length} асуултыг ${OUT}-д хадгаллаа`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
