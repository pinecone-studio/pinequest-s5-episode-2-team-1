// Сурах бичгийн хавтас (api/books/<slug>/) → хуудас бүрийн файл → сан (/admin/books).
// books.ts (CLI), e2e-books.ts, books-lib.test.ts гурав ашиглана.
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PDFDocument } from 'pdf-lib';
import type { BookDetailResponse, BookMeta, PagePutResponse, PagesTrimResponse } from '../../shared/types';
import { BOOK_SLUG, BOOK_SUBJECT_TITLES, bookMetaSchema, MAX_PAGE_BYTES, type PageMime } from '../src/config/books';
import { call, HttpError } from './lib';

export const BOOKS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'books');

const IMAGE_MIME: Record<string, PageMime> = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };
/** Номын хавтсанд байж болох ч хуудас биш файлууд. */
const NOT_PAGES = new Set(['book.json', 'readme.md']);

/** '2.jpg' < '10.jpg': файлын нэр дэх тоог тоогоор нь харьцуулна. */
export function naturalCompare(a: string, b: string): number {
  return a.localeCompare(b, 'en', { numeric: true, sensitivity: 'base' }) || (a < b ? -1 : a > b ? 1 : 0);
}

export interface SourceFile {
  name: string;
  mime: PageMime;
}

/** Хавтасны шууд доторх хуудасны файлууд (нэрийн дарааллаар) ба алгассан зүйлс (дэд хавтас, өөр төрөл). */
export function listSourceFiles(dir: string): { files: SourceFile[]; skipped: string[] } {
  const files: SourceFile[] = [];
  const skipped: string[] = [];
  for (const name of readdirSync(dir).sort(naturalCompare)) {
    if (name.startsWith('.') || NOT_PAGES.has(name.toLowerCase())) continue;
    if (statSync(join(dir, name)).isDirectory()) {
      skipped.push(`${name}/`);
      continue;
    }
    const ext = extname(name).toLowerCase();
    if (ext === '.pdf') files.push({ name, mime: 'application/pdf' });
    else if (IMAGE_MIME[ext]) files.push({ name, mime: IMAGE_MIME[ext] });
    else skipped.push(name);
  }
  return { files, skipped };
}

/** book.json байхгүй үед хавтасны нэрээс таамаглана: 'mongolian-7', 'math-10-2019'. */
export function inferBookMeta(slug: string, files: SourceFile[]): BookMeta | null {
  const m = /^([a-z]+)-(\d{1,2})(?:-(\d{4}))?(?:-|$)/.exec(slug);
  if (!m || !BOOK_SUBJECT_TITLES[m[1]]) return null;
  const grade = Number(m[2]);
  if (grade < 1 || grade > 12) return null;
  const year = m[3] ? Number(m[3]) : null;
  return {
    subject: m[1],
    grade,
    title: `${BOOK_SUBJECT_TITLES[m[1]]} ${grade}`,
    year: year !== null && year >= 1950 && year <= 2100 ? year : null,
    publisher: null,
    source: files.some((f) => f.mime === 'application/pdf') ? 'scan' : 'web',
    pageOffset: 0,
  };
}

const BOOK_JSON_EXAMPLE: BookMeta = {
  subject: 'mongolian',
  grade: 7,
  title: 'Монгол хэл 7',
  year: 2023,
  publisher: null,
  source: 'scan',
  pageOffset: 2,
};

/** book.json-ийг уншиж шалгана; байхгүй бол хавтасны нэрээс үүсгэнэ (`write` үед файлд бичнэ). */
export function loadBookMeta(dir: string, files: SourceFile[], write = true): { meta: BookMeta; created: boolean } {
  const slug = basename(dir);
  const path = join(dir, 'book.json');
  if (!existsSync(path)) {
    const meta = inferBookMeta(slug, files);
    if (!meta) {
      throw new Error(
        `${slug}/book.json алга бөгөөд хавтасны нэрээс таамаглаж чадсангүй. Ийм файл үүсгэнэ үү:\n${JSON.stringify(BOOK_JSON_EXAMPLE, null, 2)}`,
      );
    }
    if (write) writeFileSync(path, `${JSON.stringify(meta, null, 2)}\n`);
    return { meta, created: true };
  }
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(path, 'utf8').replace(/^﻿/, ''));
  } catch (e) {
    throw new Error(`${slug}/book.json JSON биш байна: ${e instanceof Error ? e.message : String(e)}`);
  }
  const parsed = bookMetaSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`${slug}/book.json: ${parsed.error.issues.map((i) => `${i.path.join('.') || 'файл'}: ${i.message}`).join('; ')}`);
  }
  return { meta: parsed.data, created: false };
}

export interface PageFile {
  /** Номын доторх дараалал: 1, 2, 3… */
  seq: number;
  /** 'mongol7.pdf#45' | '045.jpg' */
  origin: string;
  mime: PageMime;
  data: Uint8Array<ArrayBuffer>;
  sha256: string;
}

const sha256 = (data: Uint8Array) => createHash('sha256').update(data).digest('hex');

async function loadPdf(data: Uint8Array, name: string): Promise<PDFDocument> {
  try {
    return await PDFDocument.load(data, { updateMetadata: false });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/encrypt/i.test(msg)) throw new Error(`${name}: нууцлалтай (encrypted) PDF-ийг задлах боломжгүй`);
    throw new Error(`${name}: PDF уншиж чадсангүй (${msg.slice(0, 120)})`);
  }
}

/** PDF-ийн нэг хуудсыг тусдаа PDF болгоно. Огноо бичихгүй тул дахин ажиллуулахад яг ижил байт гарна. */
async function extractPdfPage(src: PDFDocument, index: number): Promise<Uint8Array<ArrayBuffer>> {
  const out = await PDFDocument.create({ updateMetadata: false });
  const [page] = await out.copyPages(src, [index]);
  out.addPage(page);
  return new Uint8Array(await out.save());
}

/** Хавтасны файлуудыг хуудас болгон дараалуулна: зураг = 1 хуудас, PDF-ийн хуудас бүр = тусдаа PDF. */
export async function* readPages(dir: string, files: SourceFile[]): AsyncGenerator<PageFile> {
  let seq = 0;
  for (const f of files) {
    const data = new Uint8Array(readFileSync(join(dir, f.name)));
    if (f.mime !== 'application/pdf') {
      yield { seq: ++seq, origin: f.name, mime: f.mime, data, sha256: sha256(data) };
      continue;
    }
    const pdf = await loadPdf(data, f.name);
    for (let i = 0; i < pdf.getPageCount(); i++) {
      const page = await extractPdfPage(pdf, i);
      yield { seq: ++seq, origin: `${f.name}#${i + 1}`, mime: f.mime, data: page, sha256: sha256(page) };
    }
  }
}

/** Хавтасны нэр = номын slug ('mongolian-7'). */
export function bookSlug(dir: string): string {
  const slug = basename(dir);
  if (!BOOK_SLUG.test(slug)) throw new Error('хавтасны нэр латин жижиг үсэг, тоо, зураастай байна (жишээ нь mongolian-7)');
  return slug;
}

export interface ImportStats {
  slug: string;
  title: string;
  pages: number;
  bytes: number;
  added: number;
  updated: number;
  unchanged: number;
  removed: number;
  /** book.json-ийг хавтасны нэрээс шинээр үүсгэсэн */
  metaCreated: boolean;
  skipped: string[];
}

/**
 * Нэг номын хавтсыг сан руу оруулна. Дахин ажиллуулахад зөвхөн шинэ/өөрчлөгдсөн хуудсыг илгээж,
 * хавтаснаас хассан хуудсыг сангаас устгана.
 */
export async function importBook(
  dir: string,
  opts: { concurrency?: number; onProgress?: (seq: number) => void } = {},
): Promise<ImportStats> {
  const slug = bookSlug(dir);
  const { files, skipped } = listSourceFiles(dir);
  if (files.length === 0) {
    throw new Error(`хуудасны файл алга (pdf, jpg, png, webp)${skipped.length ? `. Алгассан: ${skipped.join(', ')}` : ''}`);
  }
  const { meta, created } = loadBookMeta(dir, files);

  const existing = new Map<number, { sha256: string; origin: string }>();
  try {
    const detail = await call<BookDetailResponse>('GET', `/admin/books/${slug}`, { admin: true });
    for (const p of detail.pages) existing.set(p.seq, p);
  } catch (e) {
    if (!(e instanceof HttpError && e.status === 404 && e.code === 'NOT_FOUND' && e.message.includes('сан дотор алга'))) throw e;
  }
  await call('PUT', `/admin/books/${slug}`, { admin: true, body: meta });

  const stats: ImportStats = { slug, title: meta.title, pages: 0, bytes: 0, added: 0, updated: 0, unchanged: 0, removed: 0, metaCreated: created, skipped };
  const errors: string[] = [];
  const upload = async (p: PageFile) => {
    try {
      const r = await call<PagePutResponse>('PUT', `/admin/books/${slug}/pages/${p.seq}`, {
        admin: true,
        raw: { data: p.data, type: p.mime },
        headers: { 'x-page-origin': encodeURIComponent(p.origin) },
      });
      if (r.sha256 !== p.sha256) throw new Error('sha256 таарсангүй (файл замдаа гэмтсэн)');
      if (existing.has(p.seq)) stats.updated++;
      else stats.added++;
    } catch (e) {
      errors.push(`${p.origin} (${p.seq}-р хуудас): ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const inflight = new Set<Promise<void>>();
  for await (const page of readPages(dir, files)) {
    stats.pages = page.seq;
    stats.bytes += page.data.byteLength;
    const old = existing.get(page.seq);
    if (page.data.byteLength > MAX_PAGE_BYTES) {
      errors.push(`${page.origin}: ${(page.data.byteLength / 1024 / 1024).toFixed(1)}MB — нэг хуудас ${MAX_PAGE_BYTES / 1024 / 1024}MB-аас ихгүй (300 DPI хангалттай)`);
    } else if (old && old.sha256 === page.sha256 && old.origin === page.origin) {
      stats.unchanged++;
    } else {
      const job = upload(page).finally(() => inflight.delete(job));
      inflight.add(job);
      if (inflight.size >= (opts.concurrency ?? 4)) await Promise.race(inflight);
    }
    opts.onProgress?.(page.seq);
  }
  await Promise.all(inflight);
  if (errors.length) {
    throw new Error(`${errors.length} хуудас орсонгүй, дахин ажиллуулна уу:\n    ${errors.slice(0, 10).join('\n    ')}`);
  }
  stats.removed = (await call<PagesTrimResponse>('DELETE', `/admin/books/${slug}/pages?after=${stats.pages}`, { admin: true })).deleted;
  return stats;
}
