// Асуулт үүсгэхэд сурах бичгийн сангаас (BOOKS) хэсэг сонгоно. Хамгийн бага ашиглагдсан хуудсыг түрүүлж
// сонгодог тул pool өсөх тусам номын бүх сэдэв жигд хамрагдана. Апп-д эх сурвалж харагдахгүй:
// хэсгийн лавлагаа (book_ref) зөвхөн questions-д дотооддоо хадгалагдана.
import { GAME, type Subject, type Tier } from '../config/game';
import type { Bindings } from '../env';

export interface Excerpt {
  /** 'math-7:45-46' — questions.book_ref */
  ref: string;
  /** 'Математик 7' */
  title: string;
  /** номын анги (books.grade) — questions.grade */
  grade: number;
  text: string;
}

/** Нэг номын дараалсан хуудсууд (seq, хоёр захаа оруулаад): сурах замын хичээлийн хуудсууд. */
export interface PageRange {
  slug: string;
  from: number;
  to: number;
}

/** Асуулт үүсгэх хүрээ: зөвхөн энэ ангийн ном, `range` өгвөл зөвхөн тэр хуудсууд. */
export interface Scope {
  grade: number;
  range?: PageRange | null;
}

export interface PageCandidate {
  slug: string;
  seq: number;
}

/** Түвшингийн ангиуд: 1 → [6, 7], 2 → [8, 9], 3 → [10]. */
export function gradesOfTier(tier: Tier): number[] {
  return Object.entries(GAME.GRADE_TO_TIER)
    .filter(([, t]) => t === tier)
    .map(([g]) => Number(g));
}

/** 'math-7:45-46' | 'math-7:45' → ['math-7:45', 'math-7:46'] */
export function refPages(ref: string): string[] {
  const m = /^([a-z0-9-]+):(\d+)(?:-(\d+))?$/.exec(ref);
  if (!m) return [];
  const from = Number(m[2]);
  const to = m[3] ? Number(m[3]) : from;
  return Array.from({ length: Math.max(0, to - from + 1) }, (_, i) => `${m[1]}:${from + i}`);
}

/**
 * Хамгийн бага ашиглагдсан хуудаснаас (санамсаргүйгээр) эхэлж, ижил номын дараагийн хуудсуудыг
 * нэмнэ. Бүтэн цонх (`size` дараалсан чөлөөт хуудас) гарах эхлэлийг түрүүлж сонгоно: дараалсан
 * хуудсуудын сүүлийнхээс эхэлбэл ганц хуудас очих байсан. `taken` — энэ удаад аль хэдийн сонгосон
 * хуудсууд (зэрэг дуудлагууд ижил хэсэг авахгүй).
 */
export function chooseWindow(
  candidates: PageCandidate[],
  usage: Map<string, number>,
  taken: Set<string>,
  rng: () => number = Math.random,
  size: number = GAME.GROUNDING.PAGES,
): PageCandidate[] | null {
  const free = candidates.filter((c) => !taken.has(`${c.slug}:${c.seq}`));
  if (free.length === 0) return null;
  const min = Math.min(...free.map((c) => usage.get(`${c.slug}:${c.seq}`) ?? 0));
  const least = free.filter((c) => (usage.get(`${c.slug}:${c.seq}`) ?? 0) === min);
  const available = new Set(free.map((c) => `${c.slug}:${c.seq}`));
  const fits = (c: PageCandidate) =>
    Array.from({ length: size - 1 }, (_, k) => `${c.slug}:${c.seq + k + 1}`).every((p) => available.has(p));
  const full = least.filter(fits);
  const starts = full.length > 0 ? full : least;
  const start = starts[Math.floor(rng() * starts.length)];
  const window = [start];
  while (window.length < size && available.has(`${start.slug}:${start.seq + window.length}`)) {
    window.push({ slug: start.slug, seq: start.seq + window.length });
  }
  return window;
}

export function windowRef(window: PageCandidate[]): string {
  const first = window[0];
  const last = window[window.length - 1];
  return first.seq === last.seq ? `${first.slug}:${first.seq}` : `${first.slug}:${first.seq}-${last.seq}`;
}

/**
 * `count` хүртэлх ялгаатай хэсэг (LLM-ийн зэрэг дуудлага бүрт нэг). Тухайн хичээл, түвшинд ном
 * байхгүй бол хоосон массив: дуудагч нь хөтөлбөрийн сэдвийн жагсаалтаар үүсгэнэ. `scope` өгвөл зөвхөн тэр ангийн
 * номоос (түвшний бүх ангийнхаас биш).
 */
export async function pickExcerpts(
  env: Pick<Bindings, 'BOOKS' | 'DB'>,
  tier: Tier,
  subject: Subject,
  count: number,
  scope: Scope | null = null,
  rng: () => number = Math.random,
): Promise<Excerpt[]> {
  const grades = scope ? [scope.grade] : gradesOfTier(tier);
  const range = scope?.range;
  const { results: candidates } = await env.BOOKS.prepare(
    `SELECT b.slug, p.seq FROM book_pages p JOIN books b ON b.id = p.book_id
     WHERE b.subject = ? AND b.grade IN (${grades.map(() => '?').join(', ')})
       AND p.text_quality = 'ok' AND length(p.text_md) >= ?
       AND p.text_md NOT LIKE '%ГАРЧИГ%' AND p.text_md NOT LIKE '%АГУУЛГА%' AND p.text_md NOT LIKE '%ISBN%'
       ${range ? 'AND b.slug = ? AND p.seq BETWEEN ? AND ?' : ''}
     ORDER BY b.slug, p.seq`,
  )
    .bind(subject, ...grades, GAME.GROUNDING.MIN_PAGE_CHARS, ...(range ? [range.slug, range.from, range.to] : []))
    .all<PageCandidate>();
  if (candidates.length === 0) return [];

  const { results: used } = await env.DB.prepare(
    'SELECT book_ref, COUNT(*) AS n FROM questions WHERE tier = ? AND subject = ? AND book_ref IS NOT NULL GROUP BY book_ref',
  )
    .bind(tier, subject)
    .all<{ book_ref: string; n: number }>();
  const usage = new Map<string, number>();
  for (const u of used) for (const page of refPages(u.book_ref)) usage.set(page, (usage.get(page) ?? 0) + u.n);

  const taken = new Set<string>();
  const windows: PageCandidate[][] = [];
  for (let i = 0; i < count; i++) {
    const w = chooseWindow(candidates, usage, taken, rng);
    if (!w) break;
    for (const p of w) taken.add(`${p.slug}:${p.seq}`);
    windows.push(w);
  }

  return Promise.all(
    windows.map(async (w) => {
      const { results } = await env.BOOKS.prepare(
        `SELECT b.title, b.grade, p.text_md FROM book_pages p JOIN books b ON b.id = p.book_id
         WHERE b.slug = ? AND p.seq BETWEEN ? AND ? ORDER BY p.seq`,
      )
        .bind(w[0].slug, w[0].seq, w[w.length - 1].seq)
        .all<{ title: string; grade: number; text_md: string }>();
      const text = results.map((r) => r.text_md.trim()).join('\n\n').slice(0, GAME.GROUNDING.MAX_CHARS);
      // анги 0 = хэнд ч гарахгүй
      return { ref: windowRef(w), title: results[0]?.title ?? w[0].slug, grade: results[0]?.grade ?? 0, text };
    }),
  );
}
