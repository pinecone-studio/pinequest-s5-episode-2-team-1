// Сурах замын хичээлүүд: номын «Гарчиг/Агуулга» хуудаснаас бүлэг, хичээл, хуудсыг уншина. Сан дахь
// хамгийн сүүлийн хуудаснаас хойших хичээл замд орохгүй: ном дутуу орсон бол зам тэнд дуусна.
import type { BookLesson, LessonsResponse } from '../../../shared/types';
import type { Subject } from '../config/game';
import type { Bindings } from '../env';

/** Гарчиг хайх эхний хуудсууд (нүүр, хавтасны ар тал, гарчиг). */
const TOC_SCAN_PAGES = 8;
const TOC_HEAD = /ГАРЧИГ|АГУУЛГА/i;
const DOTS = /\.{4,}|…{2,}/;
/** Хичээл биш мөр: өөрийгөө сорих, давтлага, хариу. */
const NOT_LESSON = /^(Өөрийгөө сори|Давтах|Давтлага|ХАРИУ)/i;

interface Entry {
  chapter: boolean;
  text: string;
  page: number | null;
}

function pageEntries(text: string): Entry[] {
  // эхний мөр нь хуудасны дугаар
  const lines = text.split('\n').slice(1).map((l) => l.trim());
  const entries: Entry[] = [];
  const numbers: number[] = [];
  for (const line of lines) {
    if (/^\d{1,3}$/.test(line)) {
      numbers.push(Number(line));
      continue;
    }
    const chapter = /БҮЛЭГ/.test(line);
    if (!chapter && !DOTS.test(line)) continue; // толгой бичиг ('МАТЕМАТИК VIII') гэх мэт
    const m = /^(.*?)[\s.…]*(\d{1,3})?$/.exec(line);
    const body = (m?.[1] ?? line).trim();
    if (body) entries.push({ chapter, text: body, page: m?.[2] ? Number(m[2]) : null });
  }
  // Зарим номд дугаар нь тусдаа баганаар (мөр бүрт нэг тоо) хуудасны төгсгөлд гардаг
  const missing = entries.filter((e) => e.page === null);
  const target = numbers.length === missing.length ? missing : missing.filter((e) => !e.chapter);
  if (numbers.length > 0 && numbers.length === target.length) target.forEach((e, i) => (e.page = numbers[i]));
  return entries;
}

/** Гарчгийн хуудсуудын текстээс (дарааллаар) хичээлүүд. Эхний бүлгийн өмнөх мөр (оршил) орохгүй. */
export function parseToc(pages: string[]): BookLesson[] {
  const start = pages.findIndex((t) => TOC_HEAD.test(t));
  if (start < 0) return [];
  const lessons: BookLesson[] = [];
  let chapter: string | null = null;
  for (const text of pages.slice(start)) {
    const entries = pageEntries(text);
    // гарчиг дууссан: дараагийн хуудас нь хичээлийн агуулга
    if (text !== pages[start] && !entries.some((e) => !e.chapter)) break;
    for (const e of entries) {
      if (/^ХАРИУ/i.test(e.text)) return lessons;
      if (e.chapter) chapter = e.text;
      else if (chapter && !NOT_LESSON.test(e.text)) lessons.push({ chapter, title: e.text, page: e.page });
    }
  }
  return lessons;
}

/** Хэрэглэгчийн ангийн номын хичээлүүд; хамгийн сүүлд хэвлэгдсэн хувилбарыг авна. */
export async function loadLessons(env: Pick<Bindings, 'BOOKS'>, subject: Subject, grade: number): Promise<LessonsResponse> {
  const book = await env.BOOKS.prepare(
    `SELECT b.id, b.title, b.page_offset, MAX(p.seq) AS last_seq
     FROM books b JOIN book_pages p ON p.book_id = b.id
     WHERE b.subject = ? AND b.grade = ? GROUP BY b.id ORDER BY b.year DESC, b.id DESC LIMIT 1`,
  )
    .bind(subject, grade)
    .first<{ id: number; title: string; page_offset: number; last_seq: number }>();
  if (!book) return { book: null, lessons: [] };
  const { results } = await env.BOOKS.prepare('SELECT text_md FROM book_pages WHERE book_id = ? AND seq <= ? ORDER BY seq')
    .bind(book.id, TOC_SCAN_PAGES)
    .all<{ text_md: string | null }>();
  const lastPage = book.last_seq - book.page_offset;
  const lessons = parseToc(results.map((r) => r.text_md ?? '')).filter((l) => l.page === null || l.page <= lastPage);
  return { book: book.title, lessons };
}
