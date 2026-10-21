// Сурах бичгийн хуудсыг (PDF/зураг) Gemini-ээр Markdown + LaTeX текст болгоно. Зөвхөн Gemini:
// Workers AI-ийн загвар монгол кирилл хуудсыг найдвартай уншдаггүй.
import type { Bindings } from '../env';
import { geminiGenerate } from './gemini';
import { LlmError } from './types';

/** Нэг хүсэлтэд илгээх хуудасны дээд тоо (хариуны token-д багтах, квот хэмнэх тэнцвэр). */
export const OCR_MAX_PAGES = 8;

export const OCR_JSON_SCHEMA = {
  type: 'object',
  properties: {
    pages: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          page: { type: 'integer', description: 'Хавсралтын дараалал: 1, 2, 3…' },
          markdown: { type: 'string', description: 'Хуудасны бүх текст Markdown + LaTeX-ээр' },
        },
        required: ['page', 'markdown'],
      },
    },
  },
  required: ['pages'],
} as const;

const SYSTEM = `You transcribe pages of Mongolian general-education school textbooks (Cyrillic script) into Markdown.

Rules:
- Transcribe verbatim, in reading order. Never translate, summarize, correct spelling or improve the wording: exercises may contain intentional mistakes.
- The page image is the source of truth. An embedded text layer may be corrupted (legacy fonts produce look-alike Latin letters such as "Ìàòåìàòèê"); ignore it where it disagrees with the image.
- Write the Mongolian letters Ө ө Ү ү as Cyrillic characters, never as Latin or other look-alikes.
- Math: every formula in LaTeX, inline as $...$, displayed formulas as $$...$$ on their own line (\\frac{}{}, \\sqrt{}, ^{}, \\angle, ^\\circ, \\cdot, \\times).
- Structure: headings with # or ##, keep exercise numbers and item letters (а., б., в.), tables as Markdown tables.
- Figures, diagrams, photos, charts: one line "[Зураг: <short Mongolian description with every visible label, number and value>]".
- Skip running headers, footers and the printed page number.
- A blank page is an empty string.
Return JSON {"pages": [{"page": 1, "markdown": "..."}]} with exactly one entry per attached file, in attachment order.`;

/** Хариуг шалгаж хавсралтын дарааллаар текстүүдийг буцаана. */
export function parseOcrPages(raw: unknown, count: number): string[] {
  const pages = (raw as { pages?: unknown } | null)?.pages;
  if (!Array.isArray(pages)) throw new LlmError('gemini', 502, 'OCR хариунд pages алга');
  const out: Array<string | undefined> = new Array(count).fill(undefined);
  pages.forEach((p, i) => {
    const item = p as { page?: unknown; markdown?: unknown };
    const index = Number.isInteger(item.page) && (item.page as number) >= 1 && (item.page as number) <= count ? (item.page as number) - 1 : i;
    if (typeof item.markdown === 'string' && index < count && out[index] === undefined) {
      out[index] = item.markdown.replace(/^```(?:markdown|md)?\s*\n/i, '').replace(/\n```\s*$/, '').trim();
    }
  });
  const missing = out.flatMap((t, i) => (t === undefined ? [i + 1] : []));
  if (missing.length) throw new LlmError('gemini', 502, `OCR хариунд ${missing.join(', ')}-р хавсралтын текст алга`);
  return out as string[];
}

/** Workers-д Buffer байхгүй: том файлыг хэсэгчлэн base64 болгоно. */
export function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

export async function ocrPages(
  env: Pick<Bindings, 'GEMINI_API_KEY' | 'GEMINI_MODEL' | 'GEMINI_THINKING_LEVEL'>,
  files: Array<{ mimeType: string; bytes: Uint8Array }>,
  context: string,
): Promise<{ texts: string[]; source: string }> {
  const raw = await geminiGenerate(env, {
    system: SYSTEM,
    user: `Transcribe the ${files.length} attached textbook pages (attachments 1–${files.length}). ${context}`,
    files: files.map((f) => ({ mimeType: f.mimeType, data: toBase64(f.bytes) })),
    schema: OCR_JSON_SCHEMA,
    maxOutputTokens: 65536,
  });
  return { texts: parseOcrPages(raw, files.length), source: `gemini:${env.GEMINI_MODEL || 'gemini-3.8-flash'}` };
}
