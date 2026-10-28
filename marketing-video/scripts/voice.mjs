// Voice-over: turns VOICE lines (src/config.ts) into speech with ONE Gemini TTS request, then splits it per line.
//
//   node scripts/voice.mjs            # new TTS request (free tier allows ~10 a day), then split
//   node scripts/voice.mjs --resplit  # re-split public/voice/full.wav without a new request
//
// Key: GEMINI_API_KEY from the environment, ../api/.dev.vars or ../.env.local (free-tier key; never a billing key).
// Output: public/voice/full.wav, public/voice/line-N.wav, src/voice-manifest.json (durations in frames).
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FPS, SCENES, SCENE_ORDER, VOICE, VOICE_STYLE } from '../src/config.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public/voice');
mkdirSync(outDir, { recursive: true });
const full = join(outDir, 'full.wav');
const ff = (...args) => execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args]);

if (!process.argv.includes('--resplit')) {
  // Same lookup order as the API's dev script; GEMINI_TTS_API_KEY (billing) is deliberately not used.
  const fromFile = (f) => (existsSync(f) ? readFileSync(f, 'utf8').match(/^GEMINI_API_KEY=(.+)$/m)?.[1]?.trim() : undefined);
  const key = process.env.GEMINI_API_KEY || fromFile(join(root, '../api/.dev.vars')) || fromFile(join(root, '../.env.local'));
  if (!key) throw new Error('GEMINI_API_KEY not found');
  const prompt = `# AUDIO PROFILE: Kuma the bear, presenting the KUMA learning app in a short promo video
### DIRECTOR'S NOTES
Style: ${VOICE_STYLE.notes}
Read every TRANSCRIPT line exactly as written, in order. Leave a clear pause of about one second after each line.
#### TRANSCRIPT
${VOICE.map((v) => v.text).join('\n')}`;
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${VOICE_STYLE.model}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE_STYLE.voice } } },
      },
    }),
  });
  if (!res.ok) throw new Error(`TTS ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const json = await res.json();
  const part = json.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
  if (!part) throw new Error(`TTS returned no audio: ${JSON.stringify(json).slice(0, 300)}`);
  const pcm = join(outDir, 'full.pcm');
  writeFileSync(pcm, Buffer.from(part.inlineData.data, 'base64'));
  // Gemini TTS returns 24 kHz mono PCM16LE
  ff('-f', 's16le', '-ar', '24000', '-ac', '1', '-i', pcm, full);
  execFileSync('rm', [pcm]);
  console.log('tts ok', full);
}
if (!existsSync(full)) throw new Error('public/voice/full.wav missing; run without --resplit first');

// Speech segments = gaps between silences. Merge across the shortest gaps until there is one segment per line.
const probe = (f) => Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString());
const total = probe(full);
const silences = [];
const stderr = execFileSync('sh', ['-c', `ffmpeg -hide_banner -i "${full}" -af silencedetect=noise=-38dB:d=0.15 -f null - 2>&1`]).toString();
for (const m of stderr.matchAll(/silence_start: ([\d.]+)[\s\S]*?silence_end: ([\d.]+)/g)) {
  const [s, e] = [Number(m[1]), Number(m[2])];
  // a breath between two quiet stretches is still one pause
  const last = silences[silences.length - 1];
  if (last && s - last[1] < 0.06) last[1] = e;
  else silences.push([s, e]);
}
let segs = [];
let cur = 0;
for (const [s, e] of silences) {
  if (s > cur + 0.05) segs.push([cur, s]);
  cur = e;
}
if (total > cur + 0.05) segs.push([cur, total]);
while (segs.length > VOICE.length) {
  let best = 1;
  for (let i = 1; i < segs.length; i++) if (segs[i][0] - segs[i - 1][1] < segs[best][0] - segs[best - 1][1]) best = i;
  segs.splice(best - 1, 2, [segs[best - 1][0], segs[best][1]]);
}
if (segs.length !== VOICE.length) throw new Error(`found ${segs.length} speech segments for ${VOICE.length} lines; adjust the pause or re-run`);

const starts = {};
SCENE_ORDER.reduce((n, k) => ((starts[k] = n), n + SCENES[k]), 0);
const manifest = [];
segs.forEach(([s, e], i) => {
  const a = Math.max(0, s - 0.06);
  const b = Math.min(total, e + 0.12);
  const file = join(outDir, `line-${i}.wav`);
  ff('-ss', String(a), '-to', String(b), '-i', full, '-af', 'afade=t=in:d=0.02,areverse,afade=t=in:d=0.06,areverse,loudnorm=I=-16:TP=-1.5:LRA=7', '-ar', '48000', file);
  const frames = Math.ceil(probe(file) * FPS);
  const from = starts[VOICE[i].scene] + VOICE[i].at;
  manifest.push({ file: `voice/line-${i}.wav`, from, frames, text: VOICE[i].text });
  console.log(`line ${i}: ${(b - a).toFixed(2)}s @${from}f  ${VOICE[i].text}`);
});
manifest.forEach((m, i) => {
  const next = manifest[i + 1]?.from ?? SCENE_ORDER.reduce((n, k) => n + SCENES[k], 0);
  if (m.from + m.frames > next) console.warn(`! line ${i} overruns by ${m.from + m.frames - next} frames`);
});
writeFileSync(join(root, 'src/voice-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log('manifest', manifest.length, 'lines');
