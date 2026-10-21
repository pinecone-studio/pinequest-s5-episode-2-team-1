import { Hono } from 'hono';
import { z } from 'zod';
import type { BookDeleteResponse, BookOcrResponse, BooksResponse, PagesTrimResponse, PageTextsPutResponse } from '../../../shared/types';
import { BOOK_SLUG, bookMetaSchema, isPageMime, MAX_PAGE_BYTES, MAX_PAGES, MAX_TEXT_CHARS, PAGE_MIME } from '../config/books';
import type { AppEnv } from '../env';
import { ApiError, readBody } from '../lib/errors';
import { OCR_MAX_PAGES } from '../llm/ocr';
import { LlmError } from '../llm/types';
import {
  deleteBook,
  getBook,
  getPageFile,
  getPageText,
  listBooks,
  ocrBookPages,
  putPage,
  putPageTexts,
  trimPages,
  upsertBook,
} from '../services/books';

// /admin/books/* — сурах бичгийн сан. Admin token-ийг admin.ts-ийн middleware шалгана.
// `npm run books:import | books:list | books:delete` (scripts/books.ts) эдгээрийг дуудна.
export const bookRoutes = new Hono<AppEnv>();

function slugParam(value: string | undefined): string {
  if (!value || !BOOK_SLUG.test(value)) {
    throw new ApiError(400, 'BAD_REQUEST', 'Номын нэр (slug) латин жижиг үсэг, тоо, зураастай байна: mongolian-7');
  }
  return value;
}

function seqParam(value: string | undefined): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > MAX_PAGES) throw new ApiError(400, 'BAD_REQUEST', `Хуудасны дугаар 1–${MAX_PAGES}`);
  return n;
}

/** X-Page-Origin: encodeURIComponent('mongol7.pdf#45') — кирилл файлын нэр header-т шууд орохгүй. */
function originHeader(value: string | undefined, seq: number): string {
  try {
    return decodeURIComponent(value ?? '').slice(0, 300) || String(seq);
  } catch {
    throw new ApiError(400, 'BAD_REQUEST', 'X-Page-Origin буруу кодлогдсон');
  }
}

bookRoutes.get('/', async (c) => c.json<BooksResponse>({ books: await listBooks(c.env) }));

bookRoutes.get('/:slug', async (c) => c.json(await getBook(c.env, slugParam(c.req.param('slug')))));

/** Body = book.json-ийн агуулга. */
bookRoutes.put('/:slug', async (c) => {
  const slug = slugParam(c.req.param('slug'));
  const meta = await readBody(c, bookMetaSchema);
  return c.json(await upsertBook(c.env, slug, meta));
});

bookRoutes.delete('/:slug', async (c) => c.json<BookDeleteResponse>(await deleteBook(c.env, slugParam(c.req.param('slug')))));

/** Body = хуудасны файлын байт, Content-Type = application/pdf | image/jpeg | image/png | image/webp. */
bookRoutes.put('/:slug/pages/:seq', async (c) => {
  const slug = slugParam(c.req.param('slug'));
  const seq = seqParam(c.req.param('seq'));
  const mime = c.req.header('content-type')?.split(';')[0].trim().toLowerCase();
  if (!isPageMime(mime)) throw new ApiError(415, 'BAD_REQUEST', `Хуудасны файл зөвхөн ${Object.keys(PAGE_MIME).join(', ')} байна`);
  const body = await c.req.arrayBuffer();
  if (body.byteLength === 0) throw new ApiError(400, 'BAD_REQUEST', 'Хоосон файл');
  if (body.byteLength > MAX_PAGE_BYTES) throw new ApiError(413, 'BAD_REQUEST', `Нэг хуудас ${MAX_PAGE_BYTES / 1024 / 1024}MB-аас ихгүй байна`);
  return c.json(await putPage(c.env, slug, seq, mime, body, originHeader(c.req.header('x-page-origin'), seq)));
});

bookRoutes.get('/:slug/pages/:seq', async (c) => getPageFile(c.env, slugParam(c.req.param('slug')), seqParam(c.req.param('seq'))));

/** ?after=N — N-ээс хойших хуудсыг устгана. */
bookRoutes.delete('/:slug/pages', async (c) => {
  const slug = slugParam(c.req.param('slug'));
  const after = Number(c.req.query('after'));
  if (!Number.isInteger(after) || after < 0) throw new ApiError(400, 'BAD_REQUEST', 'after нь 0 эсвэл түүнээс их бүхэл тоо');
  return c.json<PagesTrimResponse>(await trimPages(c.env, slug, after));
});

const seqSchema = z.number().int().min(1).max(MAX_PAGES);

/** Хуудсуудын текст (books:import текст давхаргаас, эсвэл кэшээс). */
bookRoutes.put('/:slug/texts', async (c) => {
  const slug = slugParam(c.req.param('slug'));
  const body = await readBody(
    c,
    z.object({
      pages: z
        .array(
          z.object({
            seq: seqSchema,
            sha256: z.string().regex(/^[0-9a-f]{64}$/),
            text: z.string().max(MAX_TEXT_CHARS),
            method: z.string().regex(/^[a-z0-9:.@-]{1,60}$/),
            quality: z.enum(['ok', 'poor', 'empty']),
          }),
        )
        .min(1)
        .max(200),
    }),
  );
  return c.json<PageTextsPutResponse>(await putPageTexts(c.env, slug, body.pages));
});

bookRoutes.get('/:slug/pages/:seq/text', async (c) => c.json(await getPageText(c.env, slugParam(c.req.param('slug')), seqParam(c.req.param('seq')))));

/** Body: { pages: [35, 36, …], model? } — хуудсуудыг Gemini-ээр нэг хүсэлтэд уншуулна (books:ocr). */
bookRoutes.post('/:slug/ocr', async (c) => {
  const slug = slugParam(c.req.param('slug'));
  const body = await readBody(
    c,
    z.object({
      pages: z.array(seqSchema).min(1).max(OCR_MAX_PAGES),
      /** Энэ удаад өөр Gemini загвар (books:ocr --model). */
      model: z.string().regex(/^[a-z0-9.-]+$/).optional(),
    }),
  );
  if (!c.env.GEMINI_API_KEY) throw new ApiError(503, 'LLM_UNAVAILABLE', 'OCR-д GEMINI_API_KEY хэрэгтэй (repo-ийн root дээрх .env.local)');
  const env = body.model ? { ...c.env, GEMINI_MODEL: body.model } : c.env;
  try {
    return c.json<BookOcrResponse>(await ocrBookPages(env, slug, [...new Set(body.pages)]));
  } catch (e) {
    if (e instanceof LlmError) throw new ApiError(502, 'LLM_FAILED', e.message);
    throw e;
  }
});
