// Бодлогын загвар: сурах замын нэг зангилааны (номын хичээлийн) нэг төрлийн бодлогыг тоо, нөхцөлийг нь сольж
// хязгааргүй үүсгэнэ. Хариуг код тооцох тул Gemini-гийн алдаа орохгүй; давтлага ч ижил төрлийн шинэ хувилбар авна.
import type { QuestionDraft } from '../llm/types';
import { shuffleOptions } from '../llm/validate';
import type { PageRange } from '../services/grounding';
import { MATH6 } from './math6';
import { MATH7 } from './math7';
import { MATH8, MATH9, MATH10 } from './mathAdvanced';
import { MATH6_MORE, MATH7_MORE } from './mathCurriculum';

export type Rng = () => number;
/** Зангилааны шат = бодлогын хүнд: 1 Суурь, 2 Дунд, 3 Ахисан (shared/path.ts STAGES). */
export type Level = 1 | 2 | 3;
/** Даалгаврын шатны бодлогын хүнд; шатгүй (тулаан, хуучин даалгавар) бол Дунд. Давтлага ижил хүндээр. */
export const levelOf = (stage: number | null): Level => (stage === 1 || stage === 3 ? stage : 2);

export interface Template {
  /** номын хичээлийн хуудас = questions.book_ref ('math-6:5-6') */
  ref: string;
  id: string;
  topic?: string;
  /** Санд тухайн хичээлийн асуулт хүрэлцэхгүй үед л ашиглах ерөнхий загвар. */
  preferStored?: boolean;
  /** `level` түвшний нэг хувилбар: options[0] нь зөв хариу (дараа нь холино). */
  make(rng: Rng, level: Level): Omit<QuestionDraft, 'correctIndex' | 'topic'>;
}

const ALL: readonly Template[] = [...MATH6, ...MATH7, ...MATH6_MORE, ...MATH7_MORE, ...MATH8, ...MATH9, ...MATH10];

export const templateById = (id: string): Template | undefined => ALL.find((t) => t.id === id);

/** Template bookRef ('math-7:5-6' эсвэл 'math-7:19') → асуулт сонгох хуудасны хүрээ. */
export function templateRange(ref: string): PageRange | null {
  const m = /^([a-z0-9-]+):(\d+)(?:-(\d+))?$/.exec(ref);
  return m ? { slug: m[1], from: Number(m[2]), to: Number(m[3] ?? m[2]) } : null;
}

/** 'math-6:5-6' → { slug: 'math-6', from: 5 } */
function refStart(ref: string): { slug: string; from: number } | null {
  const m = /^([a-z0-9-]+):(\d+)/.exec(ref);
  return m ? { slug: m[1], from: Number(m[2]) } : null;
}

/** Хуудасны хүрээнд (зангилааны хичээлүүд) эхэлдэг загварууд. */
export function templatesFor(range: PageRange): Template[] {
  return ALL.filter((t) => {
    const s = refStart(t.ref);
    return s !== null && s.slug === range.slug && s.from >= range.from && s.from <= range.to;
  });
}

/**
 * `templates`-ээс ээлжлэн `level` түвшний `count` ялгаатай бодлого. Хариуг холино; давхардсан текстийг дахин үүсгэнэ.
 * Буцаах бодлого бүрт ямар загвараас (тэгэхээр аль хуудаснаас) гарсан нь хамт.
 */
export function generate(
  templates: readonly Template[],
  count: number,
  level: Level = 2,
  rng: Rng = Math.random,
): { template: Template; draft: QuestionDraft }[] {
  const out: { template: Template; draft: QuestionDraft }[] = [];
  const seen = new Set<string>();
  for (let tries = 0; out.length < count && templates.length > 0 && tries < count * 20; tries++) {
    const template = templates[out.length % templates.length];
    const q = template.make(rng, level);
    if (seen.has(q.prompt)) continue;
    seen.add(q.prompt);
    out.push({
      template,
      draft: shuffleOptions(
        {
          ...q,
          correctIndex: 0,
          ...(template.topic ? { topic: template.topic } : {}),
          difficulty: level,
        },
        rng,
      ),
    });
  }
  return out;
}

/**
 * Зангилааны шатны эх үүсвэр: Суурь хадгалсан асуултыг ашиглана (дутвал template), Дунд/Ахисан template.
 * Шатгүй урсгалд хуучин дүрэм хэвээр: тусгай template үргэлж, ерөнхий template зөвхөн DB дутвал.
 */
export function shouldGenerateTemplates(templates: readonly Template[], storedCount: number, needed: number, stage: number | null = null) {
  if (templates.length === 0) return false;
  if (stage === 1) return storedCount < needed;
  if (stage === 2 || stage === 3) return true;
  return !templates.every((template) => template.preferStored) || storedCount < needed;
}
