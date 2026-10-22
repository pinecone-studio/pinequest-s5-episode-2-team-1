// Gemini TTS (streamGenerateContent, SSE): баавгайн хэлэх текстийг илүү байгалийн монгол аялгаар дуу болгоно.
// Live загварууд зөвхөн дуу гаргадаг тул routes/tutor.ts нь Live-ийн transcript-ийг энд дамжуулна.
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

/** Markdown тэмдэгт, илүү зай зэргийг хасна (TTS тэдгээрийг чангаар уншиж болзошгүй). */
export function cleanForSpeech(text: string): string {
  return text.replace(/[*#_`]/g, '').replace(/\s+/g, ' ').trim();
}

/** SSE-ийн нэг хэсгээс бүрэн `data:` мөрүүдийг салгана; үлдсэнийг дараагийн хэсэгт залгана. */
export function splitSse(buffer: string): { events: string[]; rest: string } {
  const normalized = buffer.replace(/\r/g, '');
  const parts = normalized.split('\n\n');
  const rest = parts.pop() ?? '';
  const events = parts.flatMap((p) => p.split('\n').filter((l) => l.startsWith('data: ')).map((l) => l.slice(6)));
  return { events, rest };
}

/** Минутын хязгаарт (429) хүрвэл нэг удаа ийм хугацааны дараа дахин оролдоно. */
const RETRY_429_MS = 1_500;

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

/** Текстийг 24 kHz PCM16LE хэсгүүдээр дамжуулна. */
export async function* ttsStream(key: string, model: string, text: string, signal?: AbortSignal): AsyncGenerator<Uint8Array> {
  const request = () =>
    fetch(`${BASE}/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`, {
      method: 'POST',
      signal,
      headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: ttsPrompt(text) }] }],
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: GAME.TUTOR.VOICE } } },
        },
      }),
    });
  let res = await request();
  // Өдрийн квот дууссан бол (PerDay) хүлээх утгагүй.
  if (res.status === 429) {
    const body = await res.text();
    noteQuota(body);
    if (!/PerDay|per_day/i.test(body)) {
      await new Promise((r) => setTimeout(r, RETRY_429_MS));
      res = await request();
    } else {
      res = new Response(body, { status: 429 });
    }
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
        if (p.inlineData?.data) yield fromB64(p.inlineData.data);
      }
    }
  }
}
