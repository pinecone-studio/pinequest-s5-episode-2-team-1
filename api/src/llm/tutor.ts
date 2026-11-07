// Баавгайн хариулт: хүүхдийн дууг Gemini Flash Lite-д (энгийн HTTP хүсэлт) шууд сонсгож, бичгээр хариулуулна. Live шиг
// холболт барьдаггүй тул олон хүүхэд зэрэг ярилцаж чадна. Ярилцлагын төлөв: routes/tutor.ts.
import { GAME, type Subject } from '../config/game';

const BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const CACHE_BASE = 'https://generativelanguage.googleapis.com/v1beta/cachedContents';

const SUBJECT_NAMES: Record<Subject, string> = { math: 'Математик', mongolian: 'Монгол хэл', physics: 'Физик', social: 'Нийгэм судлал', english: 'Англи хэл' };
const LETTERS = ['A', 'B', 'C', 'D'];

/** Хүүхдийн хариулсан (ихэвчлэн алдсан) бодлого. */
export interface MissedQuestion {
  subject: Subject;
  prompt: string;
  options: string[];
  correctIndex: number;
  /** -1 = "Асуулт буруу байна" гэж алгассан */
  choice: number;
  explanation: string;
  /**
   * Даалгаварт 2+ алдсан тул хүүхэд энэ бодлогыг салаа зам дээр өөрөө дахин бодно (зөв хариуг нь апп ч
   * харуулаагүй). Зөв хариу, тайлбарыг prompt-д огт өгөхгүй: баавгай хэлж чадахгүй.
   */
  hideAnswer?: boolean;
}

export interface TutorContext {
  grade: number;
  questions: MissedQuestion[];
  /** Хүүхэд тодорхой нэг бодлогыг сонгож орсон (эсвэл сүүлд алдсан хэдээс сонгоно). */
  focused: boolean;
}

function describeQuestion(q: MissedQuestion, n: number): string {
  const option = (i: number) => `${LETTERS[i]}) ${q.options[i]}`;
  const picked = q.choice < 0 ? 'алгассан' : `${option(q.choice)}${q.choice === q.correctIndex ? ' (зөв)' : ' (буруу)'}`;
  return [
    `${n}. [${SUBJECT_NAMES[q.subject]}] ${q.prompt}`,
    `   Хувилбарууд: ${q.options.map((_, i) => option(i)).join('; ')}`,
    `   Хүүхдийн хариулт: ${picked}`,
    ...(q.hideAnswer
      ? [
          '   (Хүүхэд энэ бодлогыг давтлага дээр өөрөө дахин бодно. Зөв хариуг нь бүү хэл, бүү бодож өг, хүүхдийн хэлсэн',
          '   хариуг зөв, буруу гэж бүү батал. Сэдвийг өөр тоотой жишээгээр заагаад, энэ бодлогыг өөрөө бодохыг урамшуул.',
          '   Хүүхэд "зөв үү?" гэж асуувал "Давтлага дээрээ өөрөө шалгаарай" гээд өөр тоотой жишээгээр үргэлжлүүл.)',
        ]
      : [`   Зөв хариулт: ${option(q.correctIndex)}`, `   Тайлбар: ${q.explanation}`]),
  ].join('\n');
}

export function tutorSystemPrompt(ctx: TutorContext): string {
  const task =
    ctx.questions.length === 0
      ? 'Хүүхэд сүүлд алдсан бодлого алга. Аль хичээлийн ямар сэдэв хэцүү байгааг асууж, тэр сэдвийг дээрх замаар заа.'
      : ctx.focused
        ? 'Хүүхэд энэ бодлогыг алдсан. Энэ бодлогын сэдвийг заа:\n\n' + describeQuestion(ctx.questions[0], 1)
        : 'Хүүхдийн сүүлд алдсан бодлогууд. Аль сэдвээс эхлэхийг хүүхдээр сонгуулаад тэр сэдвийг заа:\n\n' +
          ctx.questions.map((q, i) => describeQuestion(q, i + 1)).join('\n\n');

  const english = ctx.questions.some((q) => q.subject === 'english')
    ? '\nАнгли хэлний бодлого бол тайлбараа монголоор бичээд, англи үг, өгүүлбэрийг жишээ болгон англиар бич.'
    : '';

  // Баавгайн хариу самбар дээр бичгээр гарна: томьёог тэмдэгтээр бичүүлнэ, "икс нэмэх найм" гэвэл уншихад хэцүү.
  return `Чи бол KUMA апп-ын найрсаг, тэвчээртэй баавгай багш. ${ctx.grade}-р ангийн хүүхдэд алдсан бодлогоо ойлгоход тусална.
Хүүхэд дуугаар асууна; чиний хариулт самбар дээр бичгээр харагдана.

ХЭЛ: үргэлж зөвхөн монгол хэлээр хариул, хүүхэд өөр хэлээр ярьсан ч. (Always answer only in Mongolian.)${english}

Хэлбэр:
- Нэг ээлжинд 1–3 богино өгүүлбэр, дараа нь хүүхдэд асуулт тавьж үг өг. Лекц бүү унш.
- Бүх тоо, томьёог цифр, тэмдэгтээр хэл: 240, 36, 15%, x + 8 = 30, 3x − 7 = 11, x², 2/3, √9, 3 · 4. Тоог үгээр
  ("гучин зургаа"), томьёонд "минус", "тэнцүү" гэж бүү хэл. Үржихэд · тэмдэг (х үсэг биш). LaTeX ($, ^) бүү
  хэрэглэ: зэргийг 2³ гэж бич.
- Цэг, таслал, асуултын тэмдэгтэй, зөв бичгийн дүрмээр бич. Од, хашилт, жагсаалт, "ммм", "за за" бүү хэрэглэ. Энгийн,
  дулаахан ярианы хэлээр.
- Хүүхдийг "дүү минь", "найз минь" гэж бүү дууд. Хичээл зүтгэлийг нь магт, ижил магтаал бүү давт, алдааг нь бүү шоол.

Зөв байх (хамгийн чухал):
- Тоо хэлэхээсээ өмнө дотроо алхам алхмаар бодож шалга. Бодлогын Тайлбар дахь бодолтыг үндэс болго; таны тооцоо
  Тайлбараас зөрвөл Тайлбар зөв.
- Хүүхдийн хариуг өөрөө бодож шалга. Зөв бол л "зөв" гэ; буруу бол хэзээ ч бүү зөвшөөр.
- Хүүхэд хариу хэлбэл (ямар ч алхам дээр) эхлээд бодлогын Зөв хариулттай тулга. Таарч байвал reply-г "Зөв" гэж эхлүүлээд
  яаж гаргасныг асуу. Энэ бол хүүхдийн хамгийн чухал мөч: өмнөх асуултаа үргэлжлүүлж, хариуг нь алгасаж болохгүй.
- Хэсэгчлэн зөв бол зөв хэсгийг нэрлэж, буруу алхмыг зөөлөн заа. Хоёр удаа алдвал тэр алхмыг өөрөө үзүүл.

Хичээл (6–8 ээлжинд багтаа):
1. Товч мэндэлж, сэдвийг нэрлээд энгийн асуулт асуу.
2. Гол санааг амьдралын жишээгээр, яагаад ажилладгийг нь ойлгуул. Жишээ нь математикийн хувьд үнэн, энгийн байг;
   тохирох жишээ олдохгүй бол дүрмийг шууд тайлбарла.
3. Алдсан бодлогыг хүүхэдтэй хамт алхам алхмаар бод: алхам бүрт хүүхдээр хийлгэ, сонгосон хариулт нь ямар алдаанаас
   гарсныг хэл. (Зөв хариуг нь хэлж болохгүй бодлого бол өөр тоотой ижил жишээгээр хий.)
4. Гол алхмыг хүүхдийн өөрийн үгээр хэлүүлж ойлгосныг шалга.
5. Юу сурснийг нэг өгүүлбэрээр сануулж, баяртай гээд done = true болго. Хүүхэд ядарсан эсвэл дуусгая гэвэл ч ингэ.
Ойлгоогүй бол өөр жишээ, илүү жижиг алхмаар тайлбарла. Хүүхэд зөв хариу хэлсэн ч гол алхмыг өөрийн үгээр тайлбарлаагүй
бол done = true бүү болго. Хүүхэд ойлгохгүй гэж хэлсэн эсвэл асуулт асуусан ээлжинд ч done = true бүү болго.

Хязгаар:
- Зөвхөн доорх бодлогын сэдвээр ярь; өөр зүйл рүү орвол эелдгээр буцаа. Шинэ бодлого, дасгал бүү өг.
- Хүүхдийн хэлсэн нь тодорхойгүй бол таамаглахгүй, дахин асуу.

Хариуны талбарууд:
- heard: хүүхдийн энэ ээлжинд яг хэлсэн үгс, хэлсэн хэлээр нь, зөв бичгийн дүрмээр; тоо, томьёог цифр, тэмдэгтээр.
  Бичлэг сонсогдохгүй бол хоосон. Бичлэггүй ээлжинд хоосон.
- verdict: reply бичихээс өмнө шийд. correct = хүүхэд зөв хариу хэлсэн, wrong = буруу хариу хэлсэн, none = хариу хэлээгүй,
  hidden = хүүхэд хариу хэлсэн ч зөв хариуг нь нууцалсан бодлого (зөв, буруу гэж хэлэхгүй).
- reply: баавгайн хариулт, verdict-тэйгээ таарсан.
- done: хичээл дууссан эсэх.
- Нэр, сургууль, утас, хаяг зэрэг хувийн мэдээлэл бүү асуу. Насанд нь тохирохгүй зүйл бүү ярь.

${task}`;
}

/** Холбогдсоны дараа баавгай өөрөө эхэлж ярихын тулд илгээх хэрэглэгчийн ээлж. */
export function tutorKickoff(ctx: TutorContext): string {
  if (ctx.questions.length === 0) return '(Хүүхэд баавгайтай ярих товч дарлаа. Мэндлээд, ямар сэдэв хэцүү байгааг асуу.)';
  return ctx.focused
    ? '(Хүүхэд энэ бодлогын талаар ярих товч дарлаа. 2–3 өгүүлбэрээр мэндлээд, бодлогын сэдвийг нэрлэж, хүүхдээс энгийн асуулт асуу.)'
    : '(Хүүхэд баавгайтай ярих товч дарлаа. Мэндлээд, алдсан бодлогуудын сэдвийг товч дурдаж, алинаас нь эхлэхийг асуу.)';
}

/** Сүүлийн хариулт: хязгаарт хүрсэн тул баавгай энэ ээлжинд хичээлээ дуусгана. */
export const TUTOR_LAST_TURN = 'Энэ бол сүүлийн хариулт: юу сурснийг нэг өгүүлбэрээр сануулж, баяртай гээд done = true болго.';

/**
 * Чимээтэй үед загвар хүүхдийн яриаг солонгос, герман гэх мэтээр бичиж болно. Баавгай дууг өөрөө сонсдог тул
 * ойлголтод нөлөөлөхгүй, харин дэлгэцэнд хүүхдийг төөрөгдүүлэх тул ийм бичвэрийг харуулахгүй.
 * "5x - 8" шиг цөөн латин үсэгтэйг үлдээнэ. Англи хэлний ярилцлагад (latinOk) латин бичвэр нь зөв хариулт.
 */
export function isForeignTranscript(text: string, latinOk = false): boolean {
  const letters = text.match(/\p{L}/gu)?.length ?? 0;
  const known = (text.match(/\p{Script=Cyrillic}/gu)?.length ?? 0) + (latinOk ? (text.match(/\p{Script=Latin}/gu)?.length ?? 0) : 0);
  return letters >= 3 && known / letters < 0.3;
}

/** Хүүхдэд харуулах сонссон үг: түүхэнд бүтнээрээ үлдэнэ, энд зөвхөн дэлгэцийг шүүнэ. */
export function shownHeard(heard: string, questions: readonly MissedQuestion[]): string {
  return isForeignTranscript(heard, questions.some((q) => q.subject === 'english')) ? '' : heard;
}

export type TutorPart = { text: string } | { inlineData: { mimeType: string; data: string } };
export type TutorContent = { role: 'user' | 'model'; parts: TutorPart[] };

/** Сүүлийн ээлжийн зааврыг зөвхөн энэ хүсэлтэд нэмнэ; түүхийг өөрчлөхгүй. */
export function tutorAsked(asked: TutorContent, last: boolean): TutorContent {
  return last ? { ...asked, parts: [...asked.parts, { text: TUTOR_LAST_TURN }] } : asked;
}

export interface TutorReply {
  heard: string;
  reply: string;
  done: boolean;
}

/** verdict нь reply-ээс өмнө: загвар хүүхдийн хариуг эхлээд шалгаж шийдээд, дараа нь бичнэ. */
const REPLY_SCHEMA = {
  type: 'OBJECT',
  properties: {
    heard: { type: 'STRING' },
    verdict: { type: 'STRING', enum: ['correct', 'wrong', 'none', 'hidden'] },
    reply: { type: 'STRING' },
    done: { type: 'BOOLEAN' },
  },
  required: ['heard', 'verdict', 'reply', 'done'],
  propertyOrdering: ['heard', 'verdict', 'reply', 'done'],
};

/** Зөв хариуг нууцалсан бодлогод correct, wrong сонголтыг хасна: загвар хариуг шүүж чадахгүй. */
export function tutorRequest(systemPrompt: string, contents: TutorContent[], hideAnswer = false, cacheName?: string) {
  const verdict = { ...REPLY_SCHEMA.properties.verdict, enum: hideAnswer ? ['hidden', 'none'] : REPLY_SCHEMA.properties.verdict.enum };
  return {
    ...(cacheName ? { cachedContent: cacheName } : { systemInstruction: { parts: [{ text: systemPrompt }] } }),
    contents,
    generationConfig: {
      maxOutputTokens: GAME.TUTOR.MAX_OUTPUT_TOKENS,
      responseMimeType: 'application/json',
      responseSchema: { ...REPLY_SCHEMA, properties: { ...REPLY_SCHEMA.properties, verdict } },
    },
  };
}

/** Gemini system prompt cache: богино prompt зэрэг алдаа гарвал энгийн хүсэлтээр үргэлжлүүлнэ. */
export async function createTutorCache(
  key: string,
  model: string,
  systemPrompt: string,
  ttlSeconds: number,
  fetchImpl: typeof fetch = fetch,
): Promise<string | null> {
  try {
    const res = await fetchImpl(CACHE_BASE, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({ model: `models/${model}`, systemInstruction: { parts: [{ text: systemPrompt }] }, ttl: `${ttlSeconds}s` }),
      signal: AbortSignal.timeout(GAME.TUTOR.TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { name?: unknown };
    return typeof data.name === 'string' && data.name.startsWith('cachedContents/') ? data.name : null;
  } catch {
    return null;
  }
}

/** Cache устгал амжилтгүй болсон ч ярилцлагад нөлөөлөхгүй. */
export async function deleteTutorCache(key: string, name: string, fetchImpl: typeof fetch = fetch): Promise<void> {
  try {
    await fetchImpl(`https://generativelanguage.googleapis.com/v1beta/${name}`, {
      method: 'DELETE',
      headers: { 'x-goog-api-key': key },
      signal: AbortSignal.timeout(GAME.TUTOR.TIMEOUT_MS),
    });
  } catch {
    // TTL дуусахад өөрөө устна
  }
}

/** Mic-ийн PCM16LE mono хэсгүүдийг Gemini-д илгээх WAV болгоно. */
export function pcmToWav(chunks: Uint8Array[], rate: number): Uint8Array {
  const size = chunks.reduce((n, c) => n + c.byteLength, 0);
  const wav = new Uint8Array(44 + size);
  const v = new DataView(wav.buffer);
  const tag = (at: number, s: string) => [...s].forEach((c, i) => wav.set([c.charCodeAt(0)], at + i));
  tag(0, 'RIFF');
  v.setUint32(4, 36 + size, true);
  tag(8, 'WAVEfmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, rate, true);
  v.setUint32(28, rate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  tag(36, 'data');
  v.setUint32(40, size, true);
  let at = 44;
  for (const c of chunks) {
    wav.set(c, at);
    at += c.byteLength;
  }
  return wav;
}

/** Токены хязгаарт таслагдсан JSON: дуусаагүй өгүүлбэрийг хасаад хариуг нь авна. */
function cutReply(raw: string): Partial<TutorReply> {
  const field = (name: string) => raw.match(new RegExp(`"${name}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)`))?.[1]?.replace(/\\(.)/g, '$1') ?? '';
  const reply = field('reply');
  const end = Math.max(reply.lastIndexOf('.'), reply.lastIndexOf('?'), reply.lastIndexOf('!'));
  return { heard: field('heard'), reply: end > 0 ? reply.slice(0, end + 1) : reply };
}

/** Загварын хариуг уншина: JSON эвдэрсэн бол бичвэрийг нь баавгайн хариу гэж үзнэ. */
export function parseTutorReply(raw: string): TutorReply | null {
  let parsed: Partial<TutorReply> | null = null;
  try {
    parsed = JSON.parse(raw) as Partial<TutorReply>;
  } catch {
    parsed = raw.trimStart().startsWith('{') ? cutReply(raw) : { reply: raw };
  }
  const reply = String(parsed?.reply ?? '').replace(/[*#_`]/g, '').trim();
  if (!reply) return null;
  return { heard: String(parsed?.heard ?? '').trim(), reply, done: parsed?.done === true };
}

/** Gemini түр дүүрсэн (429, 503): retry дууссан ч хариу аваагүй. */
export class TutorBusyError extends Error {}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Баавгайн нэг хариулт. Gemini ачаалалтай үед 503 өгдөг тул хэдэн удаа дахин оролдоно. */
export async function askTutor(key: string, model: string, body: ReturnType<typeof tutorRequest>, fetchImpl: typeof fetch = fetch): Promise<TutorReply> {
  const { RETRIES, RETRY_MS, TIMEOUT_MS } = GAME.TUTOR;
  for (let attempt = 1; ; attempt++) {
    let status = 0;
    let detail = '';
    try {
      const res = await fetchImpl(`${BASE}/${encodeURIComponent(model)}:generateContent`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      status = res.status;
      if (res.ok) {
        const data = (await res.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
        const reply = parseTutorReply((data.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? '').join(''));
        if (reply) return reply;
        detail = 'хоосон хариу';
      } else {
        detail = (await res.text().catch(() => '')).slice(0, 200);
      }
    } catch (e) {
      detail = String(e);
    }
    const busy = status === 429 || status === 503 || status === 0;
    if (status !== 200 && !busy) throw new Error(`Gemini: HTTP ${status} ${detail}`);
    if (attempt >= RETRIES) throw new TutorBusyError(`Gemini: HTTP ${status} ${detail}`);
    await wait(RETRY_MS * attempt);
  }
}
