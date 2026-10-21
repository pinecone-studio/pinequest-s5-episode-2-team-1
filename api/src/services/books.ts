// Сурах бичгийн сан: ном ба хуудсын мэдээлэл D1 (BOOKS)-д, хуудас бүрийн эх файл R2 (BOOK_FILES)-д.
// Бүх үйлдэл давтагдаж болно (idempotent): books:import-ийг дахин ажиллуулахад зөвхөн өөрчлөгдсөн нь шинэчлэгдэнэ.
import type { BookDetailResponse, BookMeta, BookPutResponse, BookSummary, PagePutResponse } from '../../../shared/types';
import { type PageMime, pageKey } from '../config/books';
import type { Bindings } from '../env';
import { sha256Hex } from '../lib/auth';
import { ApiError } from '../lib/errors';

type BooksEnv = Pick<Bindings, 'BOOKS' | 'BOOK_FILES'>;

interface BookRow {
  id: number;
  slug: string;
  subject: string;
  grade: number;
  title: string;
  year: number | null;
  publisher: string | null;
  source: 'scan' | 'web';
  page_offset: number;
  updated_at: number;
  pages: number;
  bytes: number;
  ocr_pages: number;
}

const SUMMARY_SQL = `
  SELECT b.id, b.slug, b.subject, b.grade, b.title, b.year, b.publisher, b.source, b.page_offset,
         MAX(b.updated_at, COALESCE(MAX(p.updated_at), 0)) AS updated_at,
         COUNT(p.seq) AS pages, COALESCE(SUM(p.bytes), 0) AS bytes,
         COALESCE(SUM(p.text_md IS NOT NULL), 0) AS ocr_pages
  FROM books b LEFT JOIN book_pages p ON p.book_id = b.id`;

function toSummary(r: BookRow): BookSummary {
  return {
    slug: r.slug,
    subject: r.subject,
    grade: r.grade,
    title: r.title,
    year: r.year,
    publisher: r.publisher,
    source: r.source,
    pageOffset: r.page_offset,
    pages: r.pages,
    bytes: r.bytes,
    ocrPages: r.ocr_pages,
    updatedAt: r.updated_at,
  };
}

const notFound = (slug: string) => new ApiError(404, 'NOT_FOUND', `"${slug}" ном сан дотор алга`);

async function bookId(env: BooksEnv, slug: string): Promise<number> {
  const row = await env.BOOKS.prepare('SELECT id FROM books WHERE slug = ?').bind(slug).first<{ id: number }>();
  if (!row) throw notFound(slug);
  return row.id;
}

export async function listBooks(env: BooksEnv): Promise<BookSummary[]> {
  const { results } = await env.BOOKS.prepare(`${SUMMARY_SQL} GROUP BY b.id ORDER BY b.subject, b.grade, b.slug`).all<BookRow>();
  return results.map(toSummary);
}

export async function getBook(env: BooksEnv, slug: string): Promise<BookDetailResponse> {
  const book = await env.BOOKS.prepare(`${SUMMARY_SQL} WHERE b.slug = ? GROUP BY b.id`).bind(slug).first<BookRow>();
  if (!book) throw notFound(slug);
  const { results } = await env.BOOKS.prepare(
    `SELECT seq, origin, mime, bytes, sha256, text_md IS NOT NULL AS has_text
     FROM book_pages WHERE book_id = ? ORDER BY seq`,
  )
    .bind(book.id)
    .all<{ seq: number; origin: string; mime: string; bytes: number; sha256: string; has_text: number }>();
  return {
    book: toSummary(book),
    pages: results.map((p) => ({ seq: p.seq, origin: p.origin, mime: p.mime, bytes: p.bytes, sha256: p.sha256, hasText: p.has_text === 1 })),
  };
}

/** Номыг бүртгэнэ эсвэл мэдээллийг нь шинэчилнэ (өөрчлөгдсөн үед л updated_at хөдөлнө). */
export async function upsertBook(env: BooksEnv, slug: string, meta: BookMeta, now = Date.now()): Promise<BookPutResponse> {
  const existed = await env.BOOKS.prepare('SELECT 1 FROM books WHERE slug = ?').bind(slug).first();
  await env.BOOKS.prepare(
    `INSERT INTO books (slug, subject, grade, title, year, publisher, source, page_offset, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (slug) DO UPDATE SET
       subject = excluded.subject, grade = excluded.grade, title = excluded.title, year = excluded.year,
       publisher = excluded.publisher, source = excluded.source, page_offset = excluded.page_offset,
       updated_at = excluded.updated_at
     WHERE books.subject IS NOT excluded.subject OR books.grade IS NOT excluded.grade OR books.title IS NOT excluded.title
        OR books.year IS NOT excluded.year OR books.publisher IS NOT excluded.publisher
        OR books.source IS NOT excluded.source OR books.page_offset IS NOT excluded.page_offset`,
  )
    .bind(slug, meta.subject, meta.grade, meta.title, meta.year, meta.publisher, meta.source, meta.pageOffset, now, now)
    .run();
  return { slug, created: !existed };
}

/**
 * Нэг хуудасны файлыг R2-д хадгалж D1-д бүртгэнэ. Файл солигдвол (sha256 өөр) хуучин OCR текстийг
 * цэвэрлэнэ; төрөл нь солигдвол (pdf → jpg) хуучин R2 объектыг устгана.
 */
export async function putPage(
  env: BooksEnv,
  slug: string,
  seq: number,
  mime: PageMime,
  body: ArrayBuffer,
  origin: string,
  now = Date.now(),
): Promise<PagePutResponse> {
  const id = await bookId(env, slug);
  const sha256 = await sha256Hex(body);
  const key = pageKey(slug, seq, mime);
  const old = await env.BOOKS.prepare('SELECT r2_key, sha256, origin FROM book_pages WHERE book_id = ? AND seq = ?')
    .bind(id, seq)
    .first<{ r2_key: string; sha256: string; origin: string }>();
  const sameFile = old !== null && old.sha256 === sha256 && old.r2_key === key;
  if (sameFile && old.origin === origin) return { seq, sha256, bytes: body.byteLength, changed: false };

  if (!sameFile) await env.BOOK_FILES.put(key, body, { httpMetadata: { contentType: mime }, sha256 });
  await env.BOOKS.prepare(
    `INSERT INTO book_pages (book_id, seq, origin, r2_key, mime, bytes, sha256, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (book_id, seq) DO UPDATE SET
       origin = excluded.origin, r2_key = excluded.r2_key, mime = excluded.mime, bytes = excluded.bytes,
       text_md   = CASE WHEN book_pages.sha256 = excluded.sha256 THEN book_pages.text_md ELSE NULL END,
       ocr_model = CASE WHEN book_pages.sha256 = excluded.sha256 THEN book_pages.ocr_model ELSE NULL END,
       ocr_at    = CASE WHEN book_pages.sha256 = excluded.sha256 THEN book_pages.ocr_at ELSE NULL END,
       sha256 = excluded.sha256, updated_at = excluded.updated_at`,
  )
    .bind(id, seq, origin, key, mime, body.byteLength, sha256, now)
    .run();
  if (old && old.r2_key !== key) await env.BOOK_FILES.delete(old.r2_key);
  return { seq, sha256, bytes: body.byteLength, changed: true };
}

export async function getPageFile(env: BooksEnv, slug: string, seq: number): Promise<Response> {
  const row = await env.BOOKS.prepare(
    'SELECT p.r2_key, p.mime FROM book_pages p JOIN books b ON b.id = p.book_id WHERE b.slug = ? AND p.seq = ?',
  )
    .bind(slug, seq)
    .first<{ r2_key: string; mime: string }>();
  if (!row) throw new ApiError(404, 'NOT_FOUND', `"${slug}" номын ${seq}-р хуудас алга`);
  const obj = await env.BOOK_FILES.get(row.r2_key);
  if (!obj) throw new ApiError(404, 'NOT_FOUND', `${row.r2_key} файл R2-д алга`);
  return new Response(obj.body, { headers: { 'content-type': row.mime, 'content-length': String(obj.size), etag: obj.httpEtag } });
}

/** `after`-аас хойших хуудсыг устгана (хавтаснаас файл хассан, хуудас цөөрсөн үед). */
export async function trimPages(env: BooksEnv, slug: string, after: number): Promise<{ deleted: number }> {
  const id = await bookId(env, slug);
  const { results } = await env.BOOKS.prepare('DELETE FROM book_pages WHERE book_id = ? AND seq > ? RETURNING r2_key')
    .bind(id, after)
    .all<{ r2_key: string }>();
  for (let i = 0; i < results.length; i += 1000) await env.BOOK_FILES.delete(results.slice(i, i + 1000).map((r) => r.r2_key));
  return { deleted: results.length };
}

/** Номыг сангаас бүхэлд нь устгана (R2-д үлдсэн өнчин файлуудыг ч prefix-ээр нь). */
export async function deleteBook(env: BooksEnv, slug: string): Promise<{ deletedPages: number }> {
  const id = await bookId(env, slug);
  const [pages] = await env.BOOKS.batch([
    env.BOOKS.prepare('DELETE FROM book_pages WHERE book_id = ? RETURNING seq').bind(id),
    env.BOOKS.prepare('DELETE FROM books WHERE id = ?').bind(id),
  ]);
  let cursor: string | undefined;
  do {
    const listed = await env.BOOK_FILES.list({ prefix: `${slug}/`, cursor });
    if (listed.objects.length) await env.BOOK_FILES.delete(listed.objects.map((o) => o.key));
    cursor = listed.truncated ? listed.cursor : undefined;
  } while (cursor);
  return { deletedPages: pages.results.length };
}
