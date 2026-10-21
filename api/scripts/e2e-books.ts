// Сурах бичгийн сан: түр хавтас → importBook (books:import-тай ижил код) → /admin/books → R2.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { BookDeleteResponse, BookDetailResponse, BooksResponse, PageTextResponse, PageTextsPutResponse } from '../../shared/types';
import { samplePdf, solidPng } from './books-fixtures';
import { importBook } from './books-lib';
import { check, expectError } from './e2e-lib';
import { ADMIN_TOKEN, API_URL, call } from './lib';

const pageFile = (slug: string, seq: number) =>
  fetch(`${API_URL}/admin/books/${slug}/pages/${seq}`, { headers: { 'x-admin-token': ADMIN_TOKEN ?? '' } });

export async function runBooksScenario() {
  console.log('\n— Сурах бичгийн сан');
  const root = mkdtempSync(join(tmpdir(), 'e2e-books-'));
  const slug = `math-7-e2e${Date.now().toString(36).slice(-5)}`;
  const dir = join(root, slug);
  mkdirSync(dir);
  try {
    writeFileSync(join(dir, '01-cover.png'), solidPng(200, 30, 30));
    writeFileSync(join(dir, '02-body.pdf'), await samplePdf(3));
    writeFileSync(join(dir, '10-back.png'), solidPng(30, 30, 200));

    const first = await importBook(dir);
    check(first.metaCreated && first.pages === 5 && first.added === 5, 'Шинэ ном: book.json үүсч, 5 хуудас (2 зураг + PDF-ийн 3 хуудас) орно', first);
    const detail = await call<BookDetailResponse>('GET', `/admin/books/${slug}`, { admin: true });
    check(detail.book.title === 'Математик 7' && detail.book.source === 'scan', 'book.json хавтасны нэрээс: "Математик 7", scan', detail.book);
    check(
      detail.pages.map((p) => p.origin).join(',') === '01-cover.png,02-body.pdf#1,02-body.pdf#2,02-body.pdf#3,10-back.png',
      'Хуудсууд файлын нэрийн (тоон) дарааллаар',
      detail.pages.map((p) => p.origin),
    );

    const text = await call<PageTextResponse>('GET', `/admin/books/${slug}/pages/2/text`, { admin: true });
    check(text.text === 'Page 1' && text.method === 'pdf-text', 'PDF хуудасны текст давхарга санд орно', text);
    check(
      detail.pages[0].textMethod === 'none' && detail.pages[0].textQuality === 'empty' && first.text.empty === 5,
      'Зураг текстгүй (none), богино текст empty гэж тэмдэглэгдэнэ (books:ocr-д үлдэнэ)',
      first.text,
    );
    check(existsSync(join(dir, 'text', '0002.md')) && existsSync(join(dir, 'text', 'index.json')), 'Текст хавтсанд кэшлэгдэнэ (text/0002.md)');
    const stale = await call<PageTextsPutResponse>('PUT', `/admin/books/${slug}/texts`, {
      admin: true,
      body: { pages: [{ seq: 2, sha256: '0'.repeat(64), text: 'хуучин', method: 'manual', quality: 'ok' }] },
    });
    check(stale.updated === 0 && stale.stale[0] === 2, 'Өөр файлын (sha256) текстийг хадгалахгүй', stale);
    const lesson = 'Тооны модул гэдэг нь тоон шулуун дээр тооллын эхээс тухайн тоо хүртэлх зай юм. '.repeat(8);
    await call('PUT', `/admin/books/${slug}/texts`, {
      admin: true,
      body: {
        pages: detail.pages
          .filter((p) => p.seq === 2 || p.seq === 3)
          .map((p) => ({ seq: p.seq, sha256: p.sha256, text: lesson, method: 'manual', quality: 'ok' })),
      },
    });
    const excerpt = await call<{ ref: string; title: string; text: string }>('GET', '/admin/excerpt?tier=1&subject=math', { admin: true });
    check(
      excerpt.ref === `${slug}:2-3` && excerpt.title === 'Математик 7' && excerpt.text.includes('Тооны модул'),
      'Асуулт үүсгэхэд сангаас текст нь хангалттай, дараалсан хуудсуудыг сонгоно (7-р анги → Түвшин 1)',
      excerpt.ref,
    );
    await expectError(
      call('GET', '/admin/excerpt?tier=3&subject=math', { admin: true }),
      'NOT_FOUND',
      '10-р ангийн ном санд алга бол хэсэг сонгогдохгүй (хөтөлбөрийн сэдвээр үүсгэнэ)',
    );
    await expectError(
      call('POST', `/admin/books/${slug}/ocr`, { admin: true, body: { pages: [2] } }),
      'LLM_UNAVAILABLE',
      'GEMINI_API_KEY-гүй сервер OCR-ийг ойлгомжтой алдаагаар татгалзана',
    );

    const res = await pageFile(slug, 3);
    const bytes = new Uint8Array(await res.arrayBuffer());
    check(
      res.headers.get('content-type') === 'application/pdf' && createHash('sha256').update(bytes).digest('hex') === detail.pages[2].sha256,
      '3-р хуудасны файл R2-оос бүтэн буцаж ирнэ',
    );

    const again = await importBook(dir);
    check(again.unchanged === 5 && again.added + again.updated + again.removed === 0, 'Дахин ажиллуулахад юу ч илгээгдэхгүй', again);

    writeFileSync(join(dir, '01-cover.png'), solidPng(10, 160, 10));
    unlinkSync(join(dir, '10-back.png'));
    const changed = await importBook(dir);
    check(
      changed.pages === 4 && changed.updated === 1 && changed.unchanged === 3 && changed.removed === 1,
      'Сольсон зураг шинэчлэгдэж, хассан файлын хуудас сангаас гарна',
      changed,
    );
    check((await pageFile(slug, 5)).status === 404, 'Хассан хуудасны файл R2-оос устсан');

    await expectError(
      call('PUT', `/admin/books/${slug}/pages/1`, { admin: true, raw: { data: new Uint8Array([1, 2, 3]), type: 'image/heic' } }),
      'BAD_REQUEST',
      'Дэмжигдэхгүй төрлийн файлыг татгалзана',
    );
    await expectError(call('GET', '/admin/books'), 'FORBIDDEN', 'Admin token-гүй бол сан руу хандахгүй');

    const list = await call<BooksResponse>('GET', '/admin/books', { admin: true });
    check(list.books.some((b) => b.slug === slug && b.pages === 4 && b.textPages === 4), 'books:list-д 4 хуудастай харагдана');

    const del = await call<BookDeleteResponse>('DELETE', `/admin/books/${slug}`, { admin: true });
    check(del.deletedPages === 4 && (await pageFile(slug, 1)).status === 404, 'Номыг устгахад хуудас, файл нь хамт устна', del);
    await expectError(call('GET', `/admin/books/${slug}`, { admin: true }), 'NOT_FOUND', 'Устгасан ном сан дотор алга');
  } finally {
    rmSync(root, { recursive: true, force: true });
    await call('DELETE', `/admin/books/${slug}`, { admin: true }).catch(() => undefined);
  }
}
