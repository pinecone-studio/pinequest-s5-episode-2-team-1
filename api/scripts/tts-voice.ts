// Баавгайн TTS дуу "2 өнгөөр" сонсогдох шалтгааныг production-ий кодоор (ttsStream, speechChunkEnd) хэмжинэ:
//   npx tsx scripts/tts-voice.ts                 # gemini-3.8-flash-tts, 3 удаа
//   npx tsx scripts/tts-voice.ts --model gemini-3.8-flash-lite-tts --runs 2
// Түлхүүр: GEMINI_TTS_API_KEY эсвэл GEMINI_API_KEY (env, api/.dev.vars эсвэл ../.env.local). Түлхүүрийг хэвлэхгүй.
// Төлбөртэй: нэг удаа ≈ 3 хүсэлт, ~40 сек дуу (Flash-аар ≈ $0.01).
// Гаралт: хэсэг бүрийн дууны өндөр (F0) ба анхны дуу ирэх хугацаа; WAV файлууд сонсоход tmp хавтаст.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GAME } from '../src/config/game';
import { speechChunkEnd } from '../src/llm/speech';
import { cleanForSpeech, ttsStream } from '../src/llm/tts';
import { arg } from './lib';

const here = dirname(fileURLToPath(import.meta.url));
const RATE = GAME.TUTOR.OUTPUT_RATE;

function readEnvFile(p: string): Record<string, string> {
  if (!existsSync(p)) return {};
  const out: Record<string, string> = {};
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return out;
}
const files = { ...readEnvFile(join(here, '..', '..', '.env.local')), ...readEnvFile(join(here, '..', '.dev.vars')) };
const key = process.env.GEMINI_TTS_API_KEY || process.env.GEMINI_API_KEY || files.GEMINI_TTS_API_KEY || files.GEMINI_API_KEY;
if (!key) {
  console.error('GEMINI_TTS_API_KEY / GEMINI_API_KEY олдсонгүй (.env.local эсвэл api/.dev.vars)');
  process.exit(1);
}
const model = arg('model') ?? 'gemini-3.8-flash-tts';
const runs = Number(arg('runs') ?? 3);

// Баавгайн ердийн нэг ээлж (Live-ийн transcript маягаар).
const TURN =
  'Сайн байна уу! Өнөөдөр бид хоёр бутархайг хэрхэн нэмэхийг хамтдаа харъя. Эхлээд хоёр бутархайн хуваарийг нь ижил болгоно. ' +
  'Жишээ нь нэгийн хоёр дээр нэгийн гурвыг нэмэхэд хоёулангийнх нь хуваарийг зургаа болгоно. Тэгвэл гурвын зургаа дээр хоёрын зургаа нэмэгдэнэ. ' +
  'Одоо чи хэлээд үз дээ, хариу нь хэд гарах вэ?';

/** PCM16LE (24 kHz) → дуут хэсгүүдийн дундаж өндөр (Hz, 70–300 Hz хооронд автокорреляцаар) ба чанга байдал (dBFS). */
function voice(pcm: Uint8Array): { f0: number; db: number; sec: number } {
  const x = new Float32Array(pcm.byteLength >> 1);
  const v = new DataView(pcm.buffer, pcm.byteOffset, pcm.byteLength);
  for (let i = 0; i < x.length; i++) x[i] = v.getInt16(i * 2, true) / 32768;
  const win = Math.round(RATE * 0.04);
  const f0s: number[] = [];
  let energy = 0;
  let voiced = 0;
  for (let i = 0; i + win < x.length; i += win >> 1) {
    let e = 0;
    for (let j = 0; j < win; j++) e += x[i + j] * x[i + j];
    const rms = Math.sqrt(e / win);
    if (rms < 0.02) continue;
    energy += rms;
    voiced++;
    let best = 0;
    let lag = 0;
    for (let l = Math.floor(RATE / 300); l <= Math.floor(RATE / 70); l++) {
      let s = 0;
      for (let j = 0; j + l < win; j++) s += x[i + j] * x[i + j + l];
      if (s > best) [best, lag] = [s, l];
    }
    if (lag && best > 0.3 * e) f0s.push(RATE / lag);
  }
  f0s.sort((a, b) => a - b);
  return { f0: f0s.length ? Math.round(f0s[f0s.length >> 1]) : NaN, db: voiced ? Math.round(20 * Math.log10(energy / voiced) * 10) / 10 : NaN, sec: x.length / RATE };
}

async function synth(text: string): Promise<{ pcm: Uint8Array; firstMs: number; error?: string }> {
  const t0 = Date.now();
  let firstMs = NaN;
  const parts: Uint8Array[] = [];
  try {
    for await (const chunk of ttsStream(key!, model, text)) {
      if (Number.isNaN(firstMs)) firstMs = Date.now() - t0;
      parts.push(chunk);
    }
  } catch (e) {
    // ttsStream: TTS_START_MS-д дуу ирэхгүй эсвэл алдаа → production-д энэ үед баавгай Live-ийн дуу руу шилжинэ
    return { pcm: concat(parts), firstMs, error: String(e instanceof Error ? e.message : e).replace(/\s+/g, " ").slice(0, 120) };
  }
  return { pcm: concat(parts), firstMs };
}

const concat = (parts: Uint8Array[]) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.byteLength, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.byteLength;
  }
  return out;
};

function wav(pcm: Uint8Array): Uint8Array {
  const h = new DataView(new ArrayBuffer(44));
  const s = (o: number, t: string) => [...t].forEach((c, i) => h.setUint8(o + i, c.charCodeAt(0)));
  s(0, 'RIFF');
  h.setUint32(4, 36 + pcm.byteLength, true);
  s(8, 'WAVEfmt ');
  h.setUint32(16, 16, true);
  h.setUint16(20, 1, true);
  h.setUint16(22, 1, true);
  h.setUint32(24, RATE, true);
  h.setUint32(28, RATE * 2, true);
  h.setUint16(32, 2, true);
  h.setUint16(34, 16, true);
  s(36, 'data');
  h.setUint32(40, pcm.byteLength, true);
  return concat([new Uint8Array(h.buffer), pcm]);
}

const out = join(tmpdir(), 'tts-voice');
mkdirSync(out, { recursive: true });
const text = cleanForSpeech(TURN);
const cut = speechChunkEnd(text, true);
console.log(`Загвар: ${model}, ${runs} удаа. Production шиг 2 хэсэг: эхнийх ${cut} тэмдэгт, үлдсэн ${text.length - cut}.`);
console.log(`TTS_START_MS = ${GAME.TUTOR.TTS_START_MS} мс: анхны дуу үүнээс удаан бол production-д Live-ийн дуу руу шилжинэ.\n`);

const rows: string[] = [];
for (let r = 1; r <= runs; r++) {
  // production: хоёр хэсэг зэрэг явна (MAX_IN_FLIGHT = 2)
  const [a, b] = await Promise.all([synth(text.slice(0, cut)), synth(text.slice(cut).trim())]);
  const one = await synth(text);
  const va = voice(a.pcm);
  const vb = voice(b.pcm);
  const vo = voice(one.pcm);
  writeFileSync(join(out, `run${r}_2heseg.wav`), wav(concat([a.pcm, b.pcm])));
  writeFileSync(join(out, `run${r}_1huselt.wav`), wav(one.pcm));
  const ms = (x: { firstMs: number; error?: string }) => (x.error ? `АЛДАА(${x.error})` : `${x.firstMs}мс`);
  rows.push(
    `#${r} 2 хэсэг: 1-р ${va.f0}Hz ${va.db}dB (${ms(a)}) | 2-р ${vb.f0}Hz ${vb.db}dB (${ms(b)}) | зөрүү ${Math.abs(va.f0 - vb.f0)}Hz` +
      `   ||  1 хүсэлт: ${vo.f0}Hz ${vo.db}dB (${ms(one)})`,
  );
  console.log(rows[rows.length - 1]);
}
console.log(`\nWAV файлууд: ${out}  (run*_2heseg = production шиг, run*_1huselt = нэг хүсэлтээр)`);
