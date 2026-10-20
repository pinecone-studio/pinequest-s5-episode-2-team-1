import type { Bindings } from '../env';
import { LlmError, QUESTIONS_JSON_SCHEMA } from './types';
import { parseJsonLoose } from './validate';

const BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string; thought?: boolean }> };
    finishReason?: string;
  }>;
}

// Structured output-ийн REST талбар хувилбаруудад өөр өөр байсан тул эхнийх нь 400 өгвөл
// дараагийнхыг туршина; ажилласан хувилбарыг isolate-д санана.
type Variant = 'responseJsonSchema' | 'responseFormat' | 'mimeOnly';
let workingVariant: Variant | null = null;

function generationConfig(variant: Variant, thinkingLevel: string | undefined) {
  const base: Record<string, unknown> = { temperature: 1.0, maxOutputTokens: 8192 };
  if (thinkingLevel) base.thinkingConfig = { thinkingLevel };
  switch (variant) {
    case 'responseJsonSchema':
      return { ...base, responseMimeType: 'application/json', responseJsonSchema: QUESTIONS_JSON_SCHEMA };
    case 'responseFormat':
      return { ...base, responseFormat: { text: { mimeType: 'APPLICATION_JSON', schema: QUESTIONS_JSON_SCHEMA } } };
    default:
      return { ...base, responseMimeType: 'application/json' };
  }
}

// Free tier дээр 429 (минутын хязгаар) ба 503 ("high demand") түр зуур гардаг тул дахин оролдоно.
const RETRYABLE = new Set([429, 500, 503]);

export interface GeminiDeps {
  fetchImpl?: typeof fetch;
  /** Нийт оролдлого (анхдагч 3). */
  attempts?: number;
  /** Дахин оролдох суурь хүлээлт; хариунд retryDelay байвал түүнийг ашиглана. */
  baseDelayMs?: number;
}

function retryDelayMs(body: string): number | null {
  const m = body.match(/"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/);
  return m ? Math.ceil(Number(m[1]) * 1000) : null;
}

async function postWithRetry(url: string, init: RequestInit, deps: Required<GeminiDeps>): Promise<Response> {
  const doFetch = deps.fetchImpl;
  for (let attempt = 1; ; attempt++) {
    const res = await doFetch(url, init);
    if (!RETRYABLE.has(res.status) || attempt >= deps.attempts) return res;
    const body = await res.text();
    const wait = Math.min(retryDelayMs(body) ?? deps.baseDelayMs * 2 ** (attempt - 1), 30_000);
    console.log(`[gemini] ${res.status}, ${wait}ms дараа дахин оролдоно (${attempt}/${deps.attempts})`);
    await new Promise((r) => setTimeout(r, wait));
  }
}

export async function geminiGenerate(
  env: Pick<Bindings, 'GEMINI_API_KEY' | 'GEMINI_MODEL' | 'GEMINI_THINKING_LEVEL'>,
  system: string,
  user: string,
  deps: GeminiDeps = {},
): Promise<unknown> {
  // Workers-д fetch-ийг өөр объектын method болгож дуудвал "Illegal invocation" гардаг тул ороож өгнө.
  const opts: Required<GeminiDeps> = { fetchImpl: (input, init) => fetch(input, init), attempts: 3, baseDelayMs: 4_000, ...deps };
  const key = env.GEMINI_API_KEY;
  if (!key) throw new LlmError('gemini', 0, 'GEMINI_API_KEY тохируулаагүй');
  const model = env.GEMINI_MODEL || 'gemini-3.8-flash';
  const thinkingLevel = env.GEMINI_THINKING_LEVEL || undefined;
  const variants: Variant[] = workingVariant ? [workingVariant] : ['responseJsonSchema', 'responseFormat', 'mimeOnly'];

  let lastError: LlmError | null = null;
  for (const variant of variants) {
    const res = await postWithRetry(
      `${BASE}/${encodeURIComponent(model)}:generateContent`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: 'user', parts: [{ text: user }] }],
          generationConfig: generationConfig(variant, thinkingLevel),
        }),
      },
      opts,
    );
    if (res.status === 400 && variants.length > 1) {
      lastError = new LlmError('gemini', 400, (await res.text()).slice(0, 400));
      continue;
    }
    if (!res.ok) throw new LlmError('gemini', res.status, (await res.text()).slice(0, 400));

    workingVariant = variant;
    const data = (await res.json()) as GeminiResponse;
    const candidate = data.candidates?.[0];
    const text = (candidate?.content?.parts ?? [])
      .filter((p) => !p.thought && typeof p.text === 'string')
      .map((p) => p.text)
      .join('');
    if (!text) throw new LlmError('gemini', 502, `хоосон хариу (finishReason: ${candidate?.finishReason ?? '—'})`);
    return parseJsonLoose(text);
  }
  throw lastError ?? new LlmError('gemini', 400, 'хүсэлтийг хүлээж аваагүй');
}

/** Тестэд: хувилбарын санах ойг цэвэрлэнэ. */
export function resetGeminiVariant() {
  workingVariant = null;
}
