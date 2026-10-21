// Сурах бичгийн сан: api/books/<хичээл-анги>/ хавтас бүрийн файлуудыг хуудас болгон сан руу оруулна.
// Сервер ажиллаж байх ёстой (өөр terminal-д `npm run dev`).
//   npm run books:import                          # api/books/ доторх бүх ном
//   npm run books:import -- --book mongolian-7    # зөвхөн нэг ном
//   npm run books:import -- --dry                 # юу ч оруулахгүй, хуудасны дарааллыг л харуулна
//   npm run books:import -- --retext              # текст давхаргаас текстийг дахин гаргана (Gemini-ийнхийг хөндөхгүй)
//   npm run books:list                            # сан дахь номууд
//   npm run books:page -- --book mongolian-7 --page 45   # сангаас нэг хуудсыг гаргаж нээнэ (--no-open: зөвхөн хадгална)
//   npm run books:page -- --book mongolian-7 --page 45 --text   # тэр хуудасны санд байгаа текст
//   npm run books:ocr -- --book math-6            # текст нь муу/хоосон хуудсыг Gemini-ээр уншуулна
//       --pages 35-37,92 | --all                  # тодорхой хуудсууд | бүх хуудас (квот их зарцуулна)
//       --batch 4 --limit 40 --model gemini-3.8-flash,gemini-3.5-flash-lite --dry
//   npm run books:excerpt -- --tier 1 --subject math   # асуулт үүсгэхэд сангаас ямар хэсэг сонгогдохыг харах
//   npm run books:delete -- --book mongolian-7    # номыг сангаас устгана (хавтас хэвээр үлдэнэ)
//   --dir <хавтас>                                # api/books-ийн оронд өөр хавтас
//   --url https://...workers.dev                  # (дараа нь) багийн Cloudflare дээрх сан руу
import { spawn } from 'node:child_process';
import { existsSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, relative, resolve } from 'node:path';
import type { ApiErrorBody, BookDeleteResponse, BookDetailResponse, BookOcrResponse, BooksResponse, PageTextResponse } from '../../shared/types';
import { isPageMime, PAGE_MIME } from '../src/config/books';
import { BOOKS_DIR, bookSlug, importBook, listSourceFiles, loadBookMeta, naturalCompare, readPages } from './books-lib';
import { TextCache } from './books-text';
import { ADMIN_TOKEN, API_URL, arg, call, flag, HttpError, sleep } from './lib';

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
        retext: flag('retext'),
        onProgress: (seq) => {
          if (seq % 25 === 0) console.log(`  … ${seq} хуудас`);
        },
      });
      if (s.metaCreated) console.log(`  ✎ ${rel(join(dir, 'book.json'))} үүсгэлээ. Гарчиг, он, pageOffset-ийг шалгаж засаад дахин ажиллуулна уу.`);
      console.log(
        `✓ ${s.slug} "${s.title}": ${s.pages} хуудас (${mb(s.bytes)}) — шинэ ${s.added}, шинэчилсэн ${s.updated}, ` +
          `өөрчлөгдөөгүй ${s.unchanged}${s.removed ? `, хассан ${s.removed}` : ''}`,
      );
      const weak = s.text.poor + s.text.empty;
      console.log(
        `  текст: сайн ${s.text.ok}, муу ${s.text.poor}, хоосон ${s.text.empty}, Gemini ${s.text.gemini}` +
          (weak ? ` → ${weak} хуудсыг: npm run books:ocr -- --book ${s.slug}` : ''),
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
    console.log(
      `  ${b.slug.padEnd(16)} ${title.padEnd(22)} ${String(b.pages).padStart(4)} хуудас ${mb(b.bytes).padStart(9)}` +
        `   текст ${b.textPages}/${b.pages}, Gemini ${b.geminiPages}${b.weakPages ? `, OCR хэрэгтэй ${b.weakPages}` : ''}`,
    );
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
  if (flag('text')) {
    const t = await call<PageTextResponse>('GET', `/admin/books/${ONLY}/pages/${seq}/text`, { admin: true });
    console.log(`# ${ONLY}, ${seq}-р хуудас — ${t.method ?? 'текстгүй'}${t.quality ? `, ${t.quality}` : ''}\n`);
    console.log(t.text ?? '');
    return;
  }
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

/** "35-37,92" → [35, 36, 37, 92] */
function parsePages(spec: string, max: number): number[] {
  const out = new Set<number>();
  for (const part of spec.split(',')) {
    const m = /^\s*(\d+)(?:\s*-\s*(\d+))?\s*$/.exec(part);
    const from = m ? Number(m[1]) : NaN;
    const to = m?.[2] ? Number(m[2]) : from;
    if (!m || from < 1 || to < from || to > max) throw new Error(`--pages "${part}" буруу (1–${max}, жишээ нь 35-37,92)`);
    for (let i = from; i <= to; i++) out.add(i);
  }
  return [...out].sort((a, b) => a - b);
}

const pagesLabel = (pages: number[]) =>
  pages.length > 1 && pages.at(-1)! - pages[0] === pages.length - 1 ? `${pages[0]}–${pages.at(-1)}` : pages.join(', ');

/**
 * Текст нь муу/хоосон (эсвэл --pages, --all) хуудсыг Gemini-ээр уншуулна. Үр дүнг санд ба
 * api/books/<slug>/text/-д хадгалдаг тул дахин ажиллуулахад уншсан хуудсаа алгасна.
 */
async function runOcr() {
  if (!ONLY) throw new Error('Аль номыг: npm run books:ocr -- --book math-6');
  const { pages } = await call<BookDetailResponse>('GET', `/admin/books/${ONLY}`, { admin: true });
  const notGemini = pages.filter((p) => !p.textMethod?.startsWith('gemini:'));
  let seqs = arg('pages')
    ? parsePages(arg('pages')!, pages.length)
    : (flag('all') ? notGemini : notGemini.filter((p) => p.textQuality === 'poor' || p.textQuality === 'empty')).map((p) => p.seq);
  seqs = seqs.slice(0, Number(arg('limit', '1000')));
  if (seqs.length === 0) {
    console.log(`${ONLY}: OCR хэрэгтэй хуудас алга (бүгд сайн тексттэй эсвэл Gemini-ээр уншигдсан). Тодорхой хуудсыг: --pages 35-37`);
    return;
  }
  const batch = Math.min(Math.max(Number(arg('batch', '4')), 1), 8);
  const chunks: number[][] = [];
  for (let i = 0; i < seqs.length; i += batch) chunks.push(seqs.slice(i, i + batch));
  console.log(`${ONLY}: ${seqs.length} хуудас, ${chunks.length} хүсэлт (${batch} хуудас/хүсэлт) → ${pagesLabel(seqs)}`);
  if (flag('dry')) return;

  const dir = join(ROOT, ONLY);
  const cache = existsSync(dir) ? new TextCache(dir) : null;
  if (!cache) console.log(`  ⚠ ${rel(dir)}/ хавтас алга: текст зөвхөн санд хадгалагдана`);
  const models = (arg('model') ?? '').split(',').map((m) => m.trim()).filter(Boolean);
  let modelIndex = 0;
  let overloaded = 0;
  let failures = 0;
  let done = 0;
  for (let i = 0; i < chunks.length; ) {
    const model = models[modelIndex];
    const started = Date.now();
    try {
      const r = await call<BookOcrResponse>('POST', `/admin/books/${ONLY}/ocr`, {
        admin: true,
        slow: true,
        body: { pages: chunks[i], ...(model ? { model } : {}) },
      });
      for (const p of r.pages) cache?.set(p.seq, { sha256: p.sha256, method: r.model, quality: 'ok' }, p.text);
      cache?.save();
      done += chunks[i].length;
      failures = 0;
      overloaded = 0;
      console.log(`  ✓ ${pagesLabel(chunks[i])} — ${r.model}, ${Math.round((Date.now() - started) / 1000)} сек (${done}/${seqs.length})`);
      i++;
    } catch (e) {
      const msg = message(e);
      const switchModel = (why: string) => {
        if (modelIndex >= models.length - 1) return false;
        modelIndex++;
        overloaded = 0;
        console.log(`  ⇒ ${why}: ${models[modelIndex]} загвар руу шилжлээ`);
        return true;
      };
      if (/PerDay/i.test(msg)) {
        if (switchModel('Өдрийн квот дууслаа')) continue;
        console.log('  ⇒ Өдрийн квот дууслаа. Маргааш дахин ажиллуулна уу (уншсан хуудсаа алгасна), эсвэл --model-оор өөр загвар.');
        break;
      }
      if (/\b503\b|high demand|UNAVAILABLE/i.test(msg) && ++overloaded >= 2 && switchModel('Загвар ачаалалтай (503)')) continue;
      if (e instanceof HttpError && e.status < 500) throw e;
      if (++failures >= 3) {
        console.log(`  ✗ ${pagesLabel(chunks[i])}: ${msg.slice(0, 300)}`);
        break;
      }
      const wait = /\b(429|503)\b|RESOURCE_EXHAUSTED|UNAVAILABLE/i.test(msg) ? 60_000 : 5_000;
      console.log(`  ⚠ ${pagesLabel(chunks[i])}: ${msg.slice(0, 200)} — ${wait / 1000} сек хүлээгээд дахин оролдоно`);
      await sleep(wait);
    }
  }
  console.log(`${done === seqs.length ? '✓' : '…'} ${ONLY}: ${done}/${seqs.length} хуудсыг Gemini-ээр уншлаа. Харах: npm run books:page -- --book ${ONLY} --page ${seqs[0]} --text`);
  if (done < seqs.length) process.exit(1);
}

/** Gemini-д асуулт зохиолгоход сангаас өгөх дараагийн хэсэг (хамгийн бага ашиглагдсан хуудсууд). */
async function runExcerpt() {
  const tier = arg('tier', '1');
  const subject = arg('subject', 'math');
  const e = await call<{ ref: string; title: string; text: string }>('GET', `/admin/excerpt?tier=${tier}&subject=${subject}`, { admin: true });
  console.log(`# Түвшин ${tier}, ${subject} → ${e.title} (${e.ref}), ${e.text.length} тэмдэгт\n`);
  console.log(e.text);
}

const commands: Record<string, () => Promise<void>> = {
  import: runImport,
  list: runList,
  page: runPage,
  ocr: runOcr,
  excerpt: runExcerpt,
  delete: runDelete,
};
const run = commands[process.argv[2]];
if (!run) {
  console.log('Хэрэглээ: npm run books:import | books:list | books:page | books:ocr | books:excerpt | books:delete');
  process.exit(1);
}
run().catch((e) => {
  console.log(`✗ ${message(e)}`);
  process.exit(1);
});
