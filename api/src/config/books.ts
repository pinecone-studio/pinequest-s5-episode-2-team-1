// Сурах бичгийн сангийн тогтмол ба book.json-ийн schema. Worker ба scripts/books*.ts хоёулаа
// ашигладаг тул энд Workers-ийн төрөл (D1, R2) орохгүй.
import { z } from 'zod';

/** Номын хавтасны нэр = slug: 'mongolian-7', 'math-10-2019'. */
export const BOOK_SLUG = /^[a-z0-9][a-z0-9-]{1,47}$/;

/** Хуудасны файлын төрөл → R2 түлхүүрийн өргөтгөл. */
export const PAGE_MIME = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
} as const;
export type PageMime = keyof typeof PAGE_MIME;

export function isPageMime(value: string | undefined): value is PageMime {
  return value !== undefined && Object.hasOwn(PAGE_MIME, value);
}

/** Нэг хуудасны файлын дээд хэмжээ (300 DPI өнгөт скан ч үүнд багтана). */
export const MAX_PAGE_BYTES = 30 * 1024 * 1024;
export const MAX_PAGES = 2000;

/** Хавтасны нэрээс book.json үүсгэхэд: хичээл → гарчиг. */
export const BOOK_SUBJECT_TITLES: Record<string, string> = {
  math: 'Математик',
  mongolian: 'Монгол хэл',
  physics: 'Физик',
};

/** api/books/<slug>/book.json */
export const bookMetaSchema = z.object({
  subject: z.string().regex(/^[a-z][a-z-]{1,29}$/, 'латин жижиг үсгээр, жишээ нь "mongolian"'),
  grade: z.number().int().min(1).max(12),
  title: z.string().trim().min(1).max(100),
  year: z.number().int().min(1950).max(2100).nullable().default(null),
  publisher: z.string().trim().max(100).nullable().default(null),
  source: z.enum(['scan', 'web']),
  pageOffset: z.number().int().min(-100).max(100).default(0),
});
export type BookMetaInput = z.input<typeof bookMetaSchema>;

/** R2 түлхүүр: 'mongolian-7/p0045.jpg' */
export function pageKey(slug: string, seq: number, mime: PageMime): string {
  return `${slug}/p${String(seq).padStart(4, '0')}.${PAGE_MIME[mime]}`;
}
