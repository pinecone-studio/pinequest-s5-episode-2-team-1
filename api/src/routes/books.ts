import { Hono } from 'hono';
import type { BookDeleteResponse, BooksResponse, PagesTrimResponse } from '../../../shared/types';
import { BOOK_SLUG, bookMetaSchema, isPageMime, MAX_PAGE_BYTES, MAX_PAGES, PAGE_MIME } from '../config/books';
import type { AppEnv } from '../env';
import { ApiError, readBody } from '../lib/errors';
import { deleteBook, getBook, getPageFile, listBooks, putPage, trimPages, upsertBook } from '../services/books';

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
