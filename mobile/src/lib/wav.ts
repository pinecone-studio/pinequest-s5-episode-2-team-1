/** PCM16LE mono хэсгүүдийг WAV файл болгоно (expo-audio нь түүхий PCM тоглуулдаггүй). */
export function pcmToWav(chunks: Uint8Array[], sampleRate: number): Uint8Array {
  const dataLen = chunks.reduce((n, c) => n + c.byteLength, 0);
  const out = new Uint8Array(44 + dataLen);
  const view = new DataView(out.buffer);
  const ascii = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) out[offset + i] = s.charCodeAt(i);
  };
  ascii(0, 'RIFF');
  view.setUint32(4, 36 + dataLen, true);
  ascii(8, 'WAVE');
  ascii(12, 'fmt ');
  view.setUint32(16, 16, true); // fmt chunk-ийн урт
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bit depth
  ascii(36, 'data');
  view.setUint32(40, dataLen, true);
  let offset = 44;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.byteLength;
  }
  return out;
}
