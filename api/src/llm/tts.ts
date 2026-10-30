// Gemini TTS (streamGenerateContent, SSE): баавгайн хэлэх текстийг илүү байгалийн монгол аялгаар дуу болгоно.
// Live загварууд зөвхөн дуу гаргадаг тул routes/tutor.ts нь Live-ийн transcript-ийг энд дамжуулна.
import { fixTranscript } from '../../../shared/transcript';
import { fromB64 } from '../lib/auth';
import { GAME } from '../config/game';
import { LlmError } from './types';

const BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

/**
 * Аялгын заавар. Энгийн "…унш:" угтварыг TTS чангаар уншчихдаг байсан тул Gemini-ийн зөвлөдөг бүтцээр
 * (DIRECTOR'S NOTES ба TRANSCRIPT) тусгаарлана: зөвхөн TRANSCRIPT-ийг уншина.
 */
export function ttsPrompt(text: string): string {
  return `# AUDIO PROFILE: Bear, a kind older brother who tutors kids
### DIRECTOR'S NOTES
Style: warm, calm, encouraging. Natural native Mongolian intonation.
Pace: relaxed, not fast.
#### TRANSCRIPT
${text}`;
}

/** Баавгайн дууны горим: env-ийн TUTOR_SPEECH ('tts' | 'live') нь GAME.TUTOR.SPEECH-ийг дарна; бусад утга тоохгүй. */
export function speechMode(value: string | undefined): 'tts' | 'live' {
  return value === 'tts' || value === 'live' ? value : GAME.TUTOR.SPEECH;
}

const LETTER = 'А-Яа-яЁёӨөҮүA-Za-z';

/**
 * Хувьсагчийг үгээр бичнэ: transcript-д "2x" гэж бичигдсэнийг TTS "хорин икс" мэтээр уншдаг байсан. Тоо ба x-ийг
 * салгаж ("2 икс"), ганц x/х-ийг "икс" болгоно ("x-ийг" → "иксийг"). Самбар дээр "2x" хэвээр харагдана.
 */
export function speakMath(text: string): string {
  return text
    .replace(new RegExp(`(\\d)\\s*[xх](?=$|[^${LETTER}])`, 'g'), '$1 икс')
    .replace(new RegExp(`(^|[^${LETTER}])[xх](?=$|[^${LETTER}])`, 'g'), '$1икс')
    .replace(/икс-(?=[А-Яа-яЁёӨөҮү])/g, 'икс');
}

/** Markdown тэмдэгт, илүү зай зэргийг хасаж, transcript-ийн алдаа, хувьсагчийг засна (TTS чангаар уншина). */
export function cleanForSpeech(text: string): string {
  return speakMath(fixTranscript(text.replace(/[*#_`]/g, '').replace(/\s+/g, ' ').trim()));
}

/** SSE-ийн нэг хэсгээс бүрэн `data:` мөрүүдийг салгана; үлдсэнийг дараагийн хэсэгт залгана. */
export function splitSse(buffer: string): { events: string[]; rest: string } {
  const normalized = buffer.replace(/\r/g, '');
  const parts = normalized.split('\n\n');
  const rest = parts.pop() ?? '';
  const events = parts.flatMap((p) => p.split('\n').filter((l) => l.startsWith('data: ')).map((l) => l.slice(6)));
  return { events, rest };
}

/** Өдрийн квот дууссан бол (PerDay 429) хэзээ хүртэл TTS-ийг оролдохгүй (isolate-д). */
let blockedUntil = 0;

export function ttsAvailable(now = Date.now()): boolean {
  return now >= blockedUntil;
}

/** 429-ийн хариунаас өдрийн квот дууссан эсэхийг уншиж, retryDelay хүртэл TTS-ийг хаана. */
export function noteQuota(body: string, now = Date.now()) {
  if (!/PerDay|per_day/i.test(body)) return;
  const delay = /"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/.exec(body);
  blockedUntil = now + (delay ? Number(delay[1]) * 1000 : 60 * 60_000);
}

/**
 * Текстийг 24 kHz PCM16LE хэсгүүдээр дамжуулна. Алдаа (429 ч) гарвал дахин оролдож хүлээлгэхгүй, шууд шиднэ:
 * routes/tutor.ts тэр хэсгийг дуугүй үлдээнэ. Өдрийн квот дууссан бол (ttsAvailable) хүсэлт ч явуулахгүй. Анхны дуу
 * GAME.TUTOR.TTS_START_MS-д ирэхгүй бол мөн таслана (баавгай удаан чимээгүй байхгүй).
 */
export async function* ttsStream(key: string, model: string, text: string, signal?: AbortSignal): AsyncGenerator<Uint8Array> {
  if (!ttsAvailable()) throw new LlmError('gemini', 429, `${model}: өдрийн квот дууссан`);
  const ctrl = new AbortController();
  const stop = () => ctrl.abort();
  signal?.addEventListener('abort', stop);
  const timer = setTimeout(stop, GAME.TUTOR.TTS_START_MS);
  try {
    let res = await fetch(`${BASE}/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`, {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: ttsPrompt(text) }] }],
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: GAME.TUTOR.VOICE } } },
        },
      }),
    });
    if (res.status === 429) {
      // Өдрийн квот дууссан бол (PerDay) дараагийн хүсэлтүүдийг явуулахгүй (ttsAvailable).
      const body = await res.text();
      noteQuota(body);
      res = new Response(body, { status: 429 });
    }
    if (!res.ok || !res.body) throw new LlmError('gemini', res.status, `${model}: ${(await res.text()).slice(0, 200)}`);

    const decoder = new TextDecoder();
    let buffer = '';
    for await (const part of res.body) {
      buffer += decoder.decode(part, { stream: true });
      const { events, rest } = splitSse(buffer);
      buffer = rest;
      for (const data of events) {
        const msg = JSON.parse(data) as { candidates?: Array<{ content?: { parts?: Array<{ inlineData?: { data?: string } }> } }> };
        for (const p of msg.candidates?.[0]?.content?.parts ?? []) {
          if (!p.inlineData?.data) continue;
          clearTimeout(timer);
          yield fromB64(p.inlineData.data);
        }
      }
    }
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', stop);
  }
}
