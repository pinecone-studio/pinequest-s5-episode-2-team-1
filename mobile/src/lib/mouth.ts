/** Амны хөдөлгөөний алхам (сек): дуу бүрийг ийм цонхонд хувааж чанга байдлыг хэмжинэ. */
export const MOUTH_STEP = 0.06;

/** 0 = хаалттай, 1 = хагас нээлттэй, 2 = нээлттэй */
export type MouthLevel = 0 | 1 | 2;

/**
 * PCM16 дууны цонх бүрийн чанга байдал (RMS) → амны нээлт. Gemini-ийн яриа ойролцоогоор 0.05–0.2 RMS тул
 * нам гүм/амьсгаа хаалттай, сул авиа хагас, чанга авиа бүтэн нээлттэй.
 */
export function mouthLevels(pcm: Int16Array, rate: number): MouthLevel[] {
  const n = Math.max(1, Math.round(rate * MOUTH_STEP));
  const out: MouthLevel[] = [];
  for (let i = 0; i < pcm.length; i += n) {
    const end = Math.min(pcm.length, i + n);
    let sum = 0;
    for (let j = i; j < end; j++) sum += pcm[j] * pcm[j];
    const rms = Math.sqrt(sum / (end - i)) / 32768;
    out.push(rms < 0.02 ? 0 : rms < 0.08 ? 1 : 2);
  }
  return out;
}
