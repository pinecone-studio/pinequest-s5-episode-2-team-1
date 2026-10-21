// Хуудасны текст: PDF-ийн текст давхаргаас (pdf.js) гаргаж, хуучин фонтын эвдрэлийг засаад чанарыг үнэлнэ.
// Үр дүн api/books/<slug>/text/-д хадгалагдана (0045.md + index.json): db:reset-ийн дараа ч, Gemini-ээр
// уншсан текст ч квот зарцуулахгүйгээр сан руу дахин орно. .md файлыг гараар засаж болно.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import type { TextQuality } from '../../shared/types';

export const TEXT_DIR = 'text';
export const METHOD_PDF = 'pdf-text';
/** Зураг: текст давхарга байхгүй, Gemini-ээр уншина. */
export const METHOD_NONE = 'none';

const cp1251 = new TextDecoder('windows-1251');
/** Хуучин "Mon" фонтууд cp1251-ийн є/ї байрлалд ө/ү зурдаг. */
const MONGOLIAN_LEGACY: Record<string, string> = { є: 'ө', Є: 'Ө', ї: 'ү', Ї: 'Ү' };
/** Үгэнд эдгээрийн аль нэг байвал тэр үг хуучин фонтоор бичигдсэн (× ÷ ² ³ ° зэрэг тэмдэг ороогүй). */
const LEGACY_LETTER = /[À-ÖØ-öø-ÿ¨¸ªº¯¿]/;

/**
 * Хуучин cp1251 фонтоор бичигдсэн үгсийг ("Ìàòåìàòèê", "Мºíõæàðãàë") кирилл болгоно. Энгийн текст
 * доторх × ÷ ² зэрэг математик тэмдэгт хөндөгдөхгүй. Зураглалгүй үржих цэгийг ("3�4") "·" болгоно.
 */
export function fixLegacyCyrillic(text: string): string {
  return text
    .replace(/[\p{L} -ÿ]+/gu, (word) =>
      LEGACY_LETTER.test(word)
        ? word.replace(/[ -ÿ]/g, (c) => {
            const u = cp1251.decode(Uint8Array.of(c.charCodeAt(0)));
            return MONGOLIAN_LEGACY[u] ?? u;
          })
        : word,
    )
    .replace(/([\p{L}\p{N})])( ?)�( ?)(?=[\p{L}\p{N}(−-])/gu, '$1$2·$3');
}

/** ok | poor: эвдэрсэн тэмдэгт ≥ 1% | empty: 30-аас цөөн үсэг (текст давхаргагүй, эсвэл зураг). */
export function assessText(text: string): { quality: TextQuality; letters: number; bad: number } {
  const letters = (text.match(/\p{L}/gu) ?? []).length;
  const bad = (text.match(/[�-À-ÖØ-öø-ÿ]/gu) ?? []).length;
  const quality: TextQuality = letters < 30 ? 'empty' : bad / letters >= 0.01 ? 'poor' : 'ok';
  return { quality, letters, bad };
}

/** Нэг (эсвэл хэд хэдэн) хуудастай PDF-ийн текст давхаргыг мөр мөрөөр нь. */
export async function extractPdfText(data: Uint8Array): Promise<string> {
  // pdf.js өгсөн buffer-ийг шилжүүлж (detach) болох тул хуулбар өгнө.
  const doc = await getDocument({ data: data.slice(), verbosity: 0 }).promise;
  try {
    const pages: string[] = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const { items } = await (await doc.getPage(i)).getTextContent();
      pages.push(items.map((it) => ('str' in it ? it.str + (it.hasEOL ? '\n' : '') : '')).join(''));
    }
    return pages
      .join('\n')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  } finally {
    await doc.destroy();
  }
}

export interface TextCacheEntry {
  /** Текстийг гаргасан хуудасны файлын sha256 */
  sha256: string;
  method: string;
  quality: TextQuality;
}

/** api/books/<slug>/text/: index.json (seq → мэдээлэл) ба хуудас бүрийн 0045.md. */
export class TextCache {
  private readonly dir: string;
  private readonly index: Record<string, TextCacheEntry>;

  constructor(bookDir: string) {
    this.dir = join(bookDir, TEXT_DIR);
    const path = join(this.dir, 'index.json');
    this.index = existsSync(path) ? (JSON.parse(readFileSync(path, 'utf8')) as Record<string, TextCacheEntry>) : {};
  }

  private file(seq: number) {
    return join(this.dir, `${String(seq).padStart(4, '0')}.md`);
  }

  /** Файл нь ижил (sha256) хуудасны кэш; .md-г гараар зассан бол засварласан нь. */
  get(seq: number, sha256: string): (TextCacheEntry & { text: string }) | null {
    const entry = this.index[seq];
    if (!entry || entry.sha256 !== sha256 || !existsSync(this.file(seq))) return null;
    return { ...entry, text: readFileSync(this.file(seq), 'utf8') };
  }

  set(seq: number, entry: TextCacheEntry, text: string) {
    mkdirSync(this.dir, { recursive: true });
    writeFileSync(this.file(seq), text);
    this.index[seq] = entry;
  }

  save() {
    mkdirSync(this.dir, { recursive: true });
    writeFileSync(join(this.dir, 'index.json'), `${JSON.stringify(this.index, null, 1)}\n`);
  }
}
