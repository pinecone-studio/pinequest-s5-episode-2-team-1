// Сурах бичгийн сан: api/books/<хичээл-анги>/ хавтас бүрийн файлуудыг хуудас болгон сан руу оруулна.
// Сервер ажиллаж байх ёстой (өөр terminal-д `npm run dev`).
//   npm run books:import                          # api/books/ доторх бүх ном
//   npm run books:import -- --book mongolian-7    # зөвхөн нэг ном
//   npm run books:import -- --dry                 # юу ч оруулахгүй, хуудасны дарааллыг л харуулна
//   npm run books:list                            # сан дахь номууд
//   npm run books:page -- --book mongolian-7 --page 45   # сангаас нэг хуудсыг гаргаж нээнэ (--no-open: зөвхөн хадгална)
//   npm run books:delete -- --book mongolian-7    # номыг сангаас устгана (хавтас хэвээр үлдэнэ)
//   --dir <хавтас>                                # api/books-ийн оронд өөр хавтас
//   --url https://...workers.dev                  # (дараа нь) багийн Cloudflare дээрх сан руу
import { spawn } from 'node:child_process';
import { existsSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, relative, resolve } from 'node:path';
import type { ApiErrorBody, BookDeleteResponse, BooksResponse } from '../../shared/types';
import { isPageMime, PAGE_MIME } from '../src/config/books';
import { BOOKS_DIR, bookSlug, importBook, listSourceFiles, loadBookMeta, naturalCompare, readPages } from './books-lib';
import { ADMIN_TOKEN, API_URL, arg, call, flag, HttpError } from './lib';

const ROOT = resolve(arg('dir') ?? BOOKS_DIR);
const ONLY = arg('book');

const mb = (n: number) => `${(n / 1024 / 1024).toFixed(1)} MB`;
/** api/ доторх замыг товчоор, гаднахыг бүтнээр нь. */
const rel = (p: string) => {
  const r = relative(process.cwd(), p);
  return r.startsWith('..') ? p : r || '.';
};
const SKIPPED_HINT = 'зөвхөн pdf, jpg, png, webp; tiff/heic бол jpg болгож хөрвүүлнэ';

function message(e: unknown): string {
  if (e instanceof TypeError && /fetch failed/i.test(e.message)) {
    return `${API_URL}-д холбогдсонгүй. Эхлээд өөр terminal-д \`npm run dev\` ажиллуулна уу.`;
  }
  if (e instanceof HttpError) {
    if (e.code === 'FORBIDDEN') return 'ADMIN_TOKEN таарахгүй байна (api/.dev.vars ба серверийнх ижил байх ёстой).';
    if (e.status === 404 && /Олдсонгүй/.test(e.message)) return 'Сервер хуучин кодоор ажиллаж байна: `npm run dev`-ийг зогсоогоод дахин асаана уу.';
    if (e.status >= 500) return `${e.message}\n  → \`npm run db:migrate\` хийсэн эсэх, серверийг дахин асаасан эсэхийг шалгана уу.`;
    return e.message.replace(/^\d{3} [A-Z_]+: /, '');
  }
  return e instanceof Error ? e.message : String(e);
}

function bookDirs(): string[] {
  if (ONLY) {
    const dir = join(ROOT, ONLY);
    if (!existsSync(dir)) throw new Error(`${rel(dir)}/ хавтас алга`);
    return [dir];
  }
  if (!existsSync(ROOT)) return [];
  return readdirSync(ROOT)
    .filter((n) => !n.startsWith('.') && statSync(join(ROOT, n)).isDirectory())
    .sort(naturalCompare)
    .map((n) => join(ROOT, n));
}

/** --dry: оруулахгүйгээр book.json-ийн утга ба хуудасны дарааллыг харуулна. */
async function dryRun(dir: string) {
  const slug = bookSlug(dir);
  const { files, skipped } = listSourceFiles(dir);
  const { meta, created } = loadBookMeta(dir, files, false);
  console.log(`\n${slug}: "${meta.title}" (${meta.subject}, ${meta.grade}-р анги${created ? ', book.json-ийг хавтасны нэрээс үүсгэнэ' : ''})`);
  const lines: string[] = [];
  let bytes = 0;
  for await (const p of readPages(dir, files)) {
    bytes += p.data.byteLength;
    lines.push(`  ${String(p.seq).padStart(4)}-р хуудас ← ${p.origin}`);
  }
  if (lines.length) console.log((lines.length > 12 ? [...lines.slice(0, 8), '   …', ...lines.slice(-3)] : lines).join('\n'));
  console.log(`  Нийт ${lines.length} хуудас, ${mb(bytes)}`);
  if (skipped.length) console.log(`  ⚠ Алгасна: ${skipped.join(', ')} (${SKIPPED_HINT})`);
}

async function runImport() {
  const dirs = bookDirs();
  if (dirs.length === 0) {
    console.log(`${rel(ROOT)}/ дотор номын хавтас алга. Жишээ нь ${rel(join(ROOT, 'mongolian-7'))}/ хавтас үүсгээд файлаа хийнэ үү.`);
    return;
  }
  const dry = flag('dry');
  if (!dry && !ADMIN_TOKEN) throw new Error('ADMIN_TOKEN алга: api/.dev.vars-д ADMIN_TOKEN=... гэж бичнэ үү.');
  if (!dry) console.log(`Сан: ${API_URL}`);
  let failed = 0;
  for (const dir of dirs) {
    if (dry) {
      await dryRun(dir).catch((e) => {
        failed++;
        console.log(`\n✗ ${basename(dir)}: ${message(e)}`);
      });
      continue;
    }
    console.log(`→ ${basename(dir)}`);
    try {
      const s = await importBook(dir, {
        onProgress: (seq) => {
          if (seq % 25 === 0) console.log(`  … ${seq} хуудас`);
        },
      });
      if (s.metaCreated) console.log(`  ✎ ${rel(join(dir, 'book.json'))} үүсгэлээ. Гарчиг, он, pageOffset-ийг шалгаж засаад дахин ажиллуулна уу.`);
      console.log(
        `✓ ${s.slug} "${s.title}": ${s.pages} хуудас (${mb(s.bytes)}) — шинэ ${s.added}, шинэчилсэн ${s.updated}, ` +
          `өөрчлөгдөөгүй ${s.unchanged}${s.removed ? `, хассан ${s.removed}` : ''}`,
      );
      if (s.skipped.length) console.log(`  ⚠ Алгассан: ${s.skipped.join(', ')} (${SKIPPED_HINT})`);
    } catch (e) {
      failed++;
      console.log(`✗ ${basename(dir)}: ${message(e)}`);
    }
  }
  if (failed) process.exit(1);
}

async function runList() {
  const { books } = await call<BooksResponse>('GET', '/admin/books', { admin: true });
  if (books.length === 0) {
    console.log(`Сан хоосон (${API_URL}). api/books/<хичээл-анги>/ хавтсанд файлаа хийгээд \`npm run books:import\`.`);
    return;
  }
  console.log(`Сурах бичгийн сан (${API_URL}):`);
  for (const b of books) {
    const title = `${b.title}${b.year ? ` (${b.year})` : ''}`;
    console.log(`  ${b.slug.padEnd(16)} ${title.padEnd(22)} ${String(b.pages).padStart(4)} хуудас ${mb(b.bytes).padStart(9)}   OCR ${b.ocrPages}/${b.pages}`);
  }
}

async function runDelete() {
  if (!ONLY) throw new Error('Аль номыг: npm run books:delete -- --book mongolian-7');
  const r = await call<BookDeleteResponse>('DELETE', `/admin/books/${ONLY}`, { admin: true });
  console.log(`✓ ${ONLY} сангаас устгагдлаа (${r.deletedPages} хуудас). ${rel(join(ROOT, ONLY))}/ хавтас хэвээр.`);
}

/** Сангаас нэг хуудасны файлыг татаж түр хавтсанд хадгалаад нээнэ. */
async function runPage() {
  const seq = Number(arg('page'));
  if (!ONLY || !Number.isInteger(seq) || seq < 1) throw new Error('Жишээ: npm run books:page -- --book mongolian-7 --page 45');
  const res = await fetch(`${API_URL}/admin/books/${ONLY}/pages/${seq}`, { headers: { 'x-admin-token': ADMIN_TOKEN ?? '' } });
  if (!res.ok) {
    const err = ((await res.json().catch(() => null)) as ApiErrorBody | null)?.error;
    throw new HttpError(res.status, err?.code ?? 'HTTP', err?.message ?? res.statusText);
  }
  const mime = res.headers.get('content-type') ?? undefined;
  const file = join(tmpdir(), `${ONLY}-p${String(seq).padStart(4, '0')}.${isPageMime(mime) ? PAGE_MIME[mime] : 'bin'}`);
  writeFileSync(file, new Uint8Array(await res.arrayBuffer()));
  console.log(`✓ ${ONLY}, ${seq}-р хуудас: ${file}`);
  if (flag('no-open')) return;
  const opener = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'explorer' : 'xdg-open';
  spawn(opener, [file], { stdio: 'ignore', detached: true }).on('error', () => undefined).unref();
}

const commands: Record<string, () => Promise<void>> = { import: runImport, list: runList, page: runPage, delete: runDelete };
const run = commands[process.argv[2]];
if (!run) {
  console.log('Хэрэглээ: npm run books:import | books:list | books:page | books:delete');
  process.exit(1);
}
run().catch((e) => {
  console.log(`✗ ${message(e)}`);
  process.exit(1);
});
