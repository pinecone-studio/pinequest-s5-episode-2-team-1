import { z } from 'zod';
import type { QuestionDraft } from './types';

const rawSchema = z.object({
  prompt: z.string(),
  options: z.array(z.string()),
  solution: z.string().optional(),
  correctIndex: z.number().int(),
  explanation: z.string(),
  topic: z.string().optional(),
});

const CYRILLIC = /[Ѐ-ӿ]/;

/** Кирилл, латин, грекээс өөр бичгийн үсэг (жишээ нь араб "ە") нь LLM-ийн эвдэрсэн гаралт. */
function hasForeignScript(text: string): boolean {
  return /(?![\p{Script=Cyrillic}\p{Script=Latin}\p{Script=Greek}])\p{L}/u.test(text);
}

/**
 * Нэг үг дотор кирилл, латин холилдсон ("зохиolyn") нь LLM-ийн эвдэрсэн гаралт. Физикийн
 * "Eп", "Eк" зэрэг богино тэмдэглэгээг зөвшөөрөхийн тулд 5+ үсэгтэй үгийг л шалгана.
 */
function hasMixedScriptWord(text: string): boolean {
  return (text.match(/[\p{L}]+/gu) ?? []).some(
    (w) => w.length >= 5 && /[\u0400-\u04FF]/.test(w) && /[a-zA-Z]/.test(w),
  );
}
const OPTION_PREFIX = /^\s*(?:[A-DА-Г]|[1-4])\s*[).:]\s+/;
/**
 * Сурагч харахгүй эх сурвалж руу заасан асуулт ("дээрх зураг", "сурах бичгийн 45-р хуудас") нь
 * сангаас үүсгэхэд гардаг алдаа: асуулт дангаараа ойлгогдох ёстой.
 */
const REFERS_TO_SOURCE = /сурах бичг|(дээрх|доорх|өгсөн) (зураг|хүснэгт|график|диаграмм)|зурагт (үзүүл|харуул|өгс)|зураг дээр|\d+-р (дасгал|хуудас)/i;

export interface Rejection {
  reason: string;
  prompt?: string;
}

/** Давхардал шалгах түлхүүр: жижиг үсэг, нэг зай, төгсгөлийн цэг тэмдэггүй. */
export function promptKey(prompt: string): string {
  return prompt
    .normalize('NFC')
    .toLowerCase()
    .replace(/[«»"'“”„?!.,:;]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const clean = (s: string) => s.normalize('NFC').replace(/\s+/g, ' ').trim();

/** Fisher–Yates; LLM-ийн хариу нэг байрлалд төвлөрөхөөс (index bias) сэргийлнэ. */
export function shuffleOptions(d: QuestionDraft, rng: () => number = Math.random): QuestionDraft {
  const order = d.options.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return {
    ...d,
    options: order.map((i) => d.options[i]),
    correctIndex: order.indexOf(d.correctIndex),
  };
}

function checkOne(raw: unknown, topics: readonly string[]): QuestionDraft | Rejection {
  const parsed = rawSchema.safeParse(raw);
  if (!parsed.success) return { reason: 'schema' };
  const q = parsed.data;
  const prompt = clean(q.prompt);
  const explanation = clean(q.explanation);
  const options = q.options.map((o) => clean(o).replace(OPTION_PREFIX, ''));

  if (options.length !== 4) return { reason: 'options!=4', prompt };
  if (q.correctIndex < 0 || q.correctIndex > 3) return { reason: 'correctIndex', prompt };
  if (prompt.length < 8 || prompt.length > 300) return { reason: 'prompt length', prompt };
  if (!CYRILLIC.test(prompt)) return { reason: 'prompt not cyrillic', prompt };
  if (explanation.length < 5 || explanation.length > 300) return { reason: 'explanation length', prompt };
  if (!CYRILLIC.test(explanation)) return { reason: 'explanation not cyrillic', prompt };
  if (options.some((o) => o.length === 0 || o.length > 120)) return { reason: 'option length', prompt };
  if (new Set(options.map((o) => o.toLowerCase())).size !== 4) return { reason: 'duplicate options', prompt };
  if ([prompt, explanation, ...options].some(hasMixedScriptWord)) return { reason: 'mixed script', prompt };
  if ([prompt, explanation, ...options].some(hasForeignScript)) return { reason: 'foreign script', prompt };
  if (REFERS_TO_SOURCE.test(prompt) || REFERS_TO_SOURCE.test(explanation)) return { reason: 'refers to source', prompt };

  // Жагсаалтад байхгүй сэдэвтэй асуултыг хаяхгүй (квот хэмнэнэ), зөвхөн сэдэвгүй хадгална.
  const topic = q.topic?.trim();
  return { prompt, options, correctIndex: q.correctIndex, explanation, ...(topic && topics.includes(topic) ? { topic } : {}) };
}

/**
 * LLM-ийн JSON-ийг шалгана: буруу бүтэцтэй болон багц доторх давхардсан асуултыг хаяж,
 * сонголтуудыг холино.
 */
export function validateDrafts(
  raw: unknown,
  /** Энэ түвшин, хичээлийн зөвшөөрөгдөх сэдвийн id (config/topics.ts); хоосон бол бүх асуулт сэдэвгүй. */
  topics: readonly string[],
  rng: () => number = Math.random,
): { drafts: QuestionDraft[]; rejected: Rejection[] } {
  const list: unknown = Array.isArray(raw) ? raw : (raw as { questions?: unknown } | null)?.questions;
  if (!Array.isArray(list)) return { drafts: [], rejected: [{ reason: 'no questions array' }] };

  const drafts: QuestionDraft[] = [];
  const rejected: Rejection[] = [];
  const seen = new Set<string>();
  for (const item of list) {
    const r = checkOne(item, topics);
    if ('reason' in r) {
      rejected.push(r);
      continue;
    }
    const key = promptKey(r.prompt);
    if (seen.has(key)) {
      rejected.push({ reason: 'duplicate in batch', prompt: r.prompt });
      continue;
    }
    seen.add(key);
    drafts.push(shuffleOptions(r, rng));
  }
  return { drafts, rejected };
}

/** ```json ... ``` хүрээ, урд хойд илүү текстийг алгасаж JSON уншина. */
export function parseJsonLoose(text: string): unknown {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start >= 0 && end > start) return JSON.parse(trimmed.slice(start, end + 1));
    throw new Error('LLM response is not JSON');
  }
}
