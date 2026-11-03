// Gemini Live API (BidiGenerateContent WebSocket)-ийн мессежүүд. Сүлжээгүй цэвэр функцууд: routes/tutor.ts холбоно.
import { GAME, type Subject } from '../config/game';

export const LIVE_URL = 'https://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent';

const SUBJECT_NAMES: Record<Subject, string> = { math: 'Математик', mongolian: 'Монгол хэл', physics: 'Физик' };
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
          '   хариуг зөв, буруу гэж бүү батал. Сэдвийг өөр тоотой жишээгээр заагаад, энэ бодлогыг өөрөө бодохыг урамшуул.)',
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

  // Хүүхэд дуугаар асууна, баавгайн хариу самбар дээр бичгээр (Live-ийн ярианы бичлэг) гарна: томьёог тэмдэгтээр
  // хэлүүлбэл бичлэг нь ч x + 8 = 30 гэж гардаг; үгээр хэлүүлбэл "икс нэмэх найм" болж уншихад хэцүү.
  return `Чи бол KUMA апп-ын найрсаг, тэвчээртэй баавгай багш. ${ctx.grade}-р ангийн хүүхдэд алдсан бодлогоо ойлгоход тусална.
Хүүхэд дуугаар асууна; чиний хариулт самбар дээр бичгээр харагдана.

ХЭЛ: үргэлж зөвхөн монгол хэлээр хариул, хүүхэд өөр хэлээр ярьсан ч. (Always answer only in Mongolian.)

Хэлбэр:
- Нэг ээлжинд 1–3 богино өгүүлбэр, дараа нь хүүхдэд асуулт тавьж үг өг. Лекц бүү унш.
- Бүх тоо, томьёог цифр, тэмдэгтээр хэл: 240, 36, 15%, x + 8 = 30, 3x − 7 = 11, x², 2/3, √9, 3 · 4. Тоог үгээр
  ("гучин зургаа"), томьёонд "минус", "тэнцүү" гэж бүү хэл. Үржихэд · тэмдэг (х үсэг биш). LaTeX ($, ^) бүү
  хэрэглэ: зэргийг 2³ гэж бич.
- Од, хашилт, жагсаалт, "ммм", "за за" бүү хэрэглэ. Энгийн, дулаахан ярианы хэлээр.
- Хүүхдийг "дүү минь", "найз минь" гэж бүү дууд. Хичээл зүтгэлийг нь магт, ижил магтаал бүү давт, алдааг нь бүү шоол.

Зөв байх (хамгийн чухал):
- Тоо хэлэхээсээ өмнө дотроо алхам алхмаар бодож шалга. Бодлогын Тайлбар дахь бодолтыг үндэс болго; таны тооцоо
  Тайлбараас зөрвөл Тайлбар зөв.
- Хүүхдийн хариуг өөрөө бодож шалга. Зөв бол л "зөв" гэ; буруу бол хэзээ ч бүү зөвшөөр.
- Чи дунд алхмыг асуухад хүүхэд эцсийн хариугаа хэлбэл бодлогын зөв хариутай тулга: зөв бол "зөв" гээд яаж
  гаргасныг асуу, "буруу" гэж бүү хэл.
- Хэсэгчлэн зөв бол зөв хэсгийг нэрлэж, буруу алхмыг зөөлөн заа. Хоёр удаа алдвал тэр алхмыг өөрөө үзүүл.

Хичээл (6–8 ээлжинд багтаа):
1. Товч мэндэлж, сэдвийг нэрлээд энгийн асуулт асуу.
2. Гол санааг амьдралын жишээгээр, яагаад ажилладгийг нь ойлгуул. Жишээ нь математикийн хувьд үнэн, энгийн байг;
   тохирох жишээ олдохгүй бол дүрмийг шууд тайлбарла.
3. Алдсан бодлогыг хүүхэдтэй хамт алхам алхмаар бод: алхам бүрт хүүхдээр хийлгэ, сонгосон хариулт нь ямар алдаанаас
   гарсныг хэл. (Зөв хариуг нь хэлж болохгүй бодлого бол өөр тоотой ижил жишээгээр хий.)
4. Гол алхмыг хүүхдийн өөрийн үгээр хэлүүлж ойлгосныг шалга.
5. Юу сурснийг нэг өгүүлбэрээр сануулж, баяртай гээд finish_lesson-ийг дууд. Хүүхэд ядарсан эсвэл дуусгая гэвэл ч ингэ.
Ойлгоогүй бол өөр жишээ, илүү жижиг алхмаар тайлбарла.

Хязгаар:
- Зөвхөн доорх бодлогын сэдвээр ярь; өөр зүйл рүү орвол эелдгээр буцаа. Шинэ бодлого, дасгал бүү өг.
- Хүүхдийн хэлсэн нь тодорхойгүй бол таамаглахгүй, дахин асуу.
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

/**
 * Баавгай бодлогыг тайлбарлаж дуусаад (хүүхэд ойлгосон, баяртай гэсэн) дуудна: ярилцлага тэр үгийн дараа хаагдана.
 * NON_BLOCKING: функцийн хариуг хүлээлгүй ярина.
 */
export const FINISH_LESSON_TOOL = {
  functionDeclarations: [
    {
      name: 'finish_lesson',
      behavior: 'NON_BLOCKING',
      description: 'Бодлогыг тайлбарлаж дуусаж, хүүхэд ойлгоод баяртай гэсний дараа ярилцлагыг дуусгана.',
    },
  ],
};

/** finish_lesson-ийн хариу. SILENT: тусдаа ээлж үүсгэхгүй (баяртай гэлгүй дуудсан бол routes/tutor.ts хэлүүлнэ). */
export function liveToolResponse(id: string) {
  return { toolResponse: { functionResponses: [{ id, name: 'finish_lesson', response: { result: 'ok' }, scheduling: 'SILENT' }] } };
}

/** Баавгай finish_lesson дуудаад дуугүй ээлжээ дуусгавал баяртай гэж хэлүүлнэ. */
export const TUTOR_SAY_GOODBYE = '(Хүүхдэд юу сурснийг нэг өгүүлбэрээр сануулж, урамшуулаад баяртай гэ.)';

/**
 * Баавгайн ярих хугацаа дуусах гэж байна: дараагийн хариугаа эелдгээр дуусгуулна. Тусдаа ээлж үүсгэвэл хүүхдийн
 * яриатай давхцаж хоосон ээлж болдог тул хариу эхлүүлэхгүйгээр (liveText complete = false) өгнө.
 */
export const TUTOR_WRAP_UP =
  '(Энэ бодлогын ярилцлагын хугацаа дуусч байна. Дараагийн хариундаа хүүхдийн хэлсэнд товч хариулаад, өнөөдөр юу сурснийг нэг өгүүлбэрээр сануулж, урамшуулаад баяртай гэ. Шинэ асуулт бүү асуу.)';

/**
 * Баавгайн ээлж дуусах бүрт: нийт ярьсан хугацаа (ms) дээд хязгаарт ойртсон бол дуусгах заавар өгнө ('wrap'),
 * зааврын дараа баавгай ярьсан ээлж дууссан бол ярилцлагыг хаана ('end'). Хоосон ээлжийн дараа хаахгүй.
 */
export function speechBudget(bearMs: number, wrapping: boolean, spokeThisTurn: boolean): 'continue' | 'wrap' | 'end' {
  if (wrapping) return spokeThisTurn ? 'end' : 'continue';
  return bearMs >= GAME.TUTOR.BEAR_SPEECH_MS - GAME.TUTOR.WRAP_UP_MS ? 'wrap' : 'continue';
}

/**
 * pushToTalk: хүүхэд товч дарж байх хооронд л ярина (LIVE_ACTIVITY_START/END). Gemini-ийн автомат яриа илрүүлэлтийг
 * унтраана: гадны чимээг хүүхдийн яриа гэж сонсож хариулахгүй.
 */
export function liveSetup(model: string, systemPrompt: string, pushToTalk = false) {
  return {
    setup: {
      model: `models/${model}`,
      generationConfig: {
        responseModalities: ['AUDIO'],
        // Native audio загвар хэлний кодыг дэмждэггүй (хэлийг system prompt-оор заана); илгээвэл дуу нь муудаж байсан.
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: GAME.TUTOR.VOICE } } },
      },
      systemInstruction: { parts: [{ text: systemPrompt }] },
      tools: [FINISH_LESSON_TOOL],
      // Хүүхэд ярьж дууссаныг ингэж чимээгүй болмогц тооцно: бага бол баавгай хурдан хариулах ч бодож
      // зогссон хүүхдийг тасалж болзошгүй.
      realtimeInputConfig: {
        automaticActivityDetection: pushToTalk ? { disabled: true } : { silenceDurationMs: GAME.TUTOR.END_OF_SPEECH_MS },
      },
      inputAudioTranscription: { languageCodes: [GAME.TUTOR.LANGUAGE] },
      // Хэлийг заахгүй бол "өөрөөр нь"-ийг "өөртөөр нь" гэх мэтээр бичдэг байсан.
      outputAudioTranscription: { languageCodes: [GAME.TUTOR.LANGUAGE] },
    },
  };
}

/** complete = false бол хариу эхлүүлэхгүй: заавар нь хүүхдийн дараагийн ярианы хамт уншигдана. */
export function liveText(text: string, complete = true) {
  return { clientContent: { turns: [{ role: 'user', parts: [{ text }] }], turnComplete: complete } };
}

export function liveAudio(base64Pcm: string) {
  return { realtimeInput: { audio: { data: base64Pcm, mimeType: `audio/pcm;rate=${GAME.TUTOR.INPUT_RATE}` } } };
}

export const LIVE_AUDIO_END = { realtimeInput: { audioStreamEnd: true } };
/** Push-to-talk: хүүхэд товч дарлаа / суллалаа (энэ хооронд ирсэн дуу нь хүүхдийн нэг ээлж). */
export const LIVE_ACTIVITY_START = { realtimeInput: { activityStart: {} } };
export const LIVE_ACTIVITY_END = { realtimeInput: { activityEnd: {} } };

export type LiveEvent =
  | { kind: 'ready' }
  /** base64 PCM16LE 24 kHz */
  | { kind: 'audio'; data: string }
  | { kind: 'bear_text'; text: string }
  | { kind: 'kid_text'; text: string }
  | { kind: 'interrupted' }
  /** Баавгайн бүх текст/дуу үүссэн (turn_end нь дуу тоглох хурдаар, хэдэн арван секундын дараа ирдэг). */
  | { kind: 'gen_done' }
  | { kind: 'turn_end' }
  /** Gemini удахгүй холболтыг хаана. */
  | { kind: 'go_away' }
  /** Баавгай тайлбараа дуусгалаа (FINISH_LESSON_TOOL). */
  | { kind: 'finish'; id: string };

interface LiveServerMessage {
  setupComplete?: object;
  goAway?: object;
  toolCall?: { functionCalls?: Array<{ id?: string; name?: string }> };
  serverContent?: {
    modelTurn?: { parts?: Array<{ inlineData?: { mimeType?: string; data?: string } }> };
    outputTranscription?: { text?: string };
    inputTranscription?: { text?: string };
    interrupted?: boolean;
    generationComplete?: boolean;
    turnComplete?: boolean;
  };
}

/**
 * languageCodes нь хатуу хязгаар биш тул чимээтэй үед хүүхдийн яриаг солонгос, герман гэх мэтээр бичдэг. Баавгай
 * дууг өөрөө сонсдог тул ойлголтод нөлөөлөхгүй, харин дэлгэцэнд хүүхдийг төөрөгдүүлэх тул ийм хэсгийг харуулахгүй.
 * "5x - 8" шиг цөөн латин үсэгтэйг үлдээнэ.
 */
export function isForeignTranscript(text: string): boolean {
  const letters = text.match(/\p{L}/gu)?.length ?? 0;
  const cyrillic = text.match(/\p{Script=Cyrillic}/gu)?.length ?? 0;
  return letters >= 3 && cyrillic / letters < 0.3;
}

/**
 * Gemini project-ийн квот (нэгэн зэрэг холболт гэх мэт) дүүрсэн: "1011 You exceeded your current quota…".
 * Түр алдаа биш тул дахин холбогдохгүй.
 */
export function isQuotaClose(code: number, reason: string): boolean {
  return code === 1011 && /quota/i.test(reason);
}

/** Gemini-ийн нэг мессежийг клиентэд хэрэгтэй үйл явдлууд болгоно (дарааллыг хадгална). */
export function liveEvents(raw: unknown): LiveEvent[] {
  if (!raw || typeof raw !== 'object') return [];
  const msg = raw as LiveServerMessage;
  const out: LiveEvent[] = [];
  if (msg.setupComplete) out.push({ kind: 'ready' });
  const sc = msg.serverContent;
  if (sc) {
    const heard = sc.inputTranscription?.text;
    if (heard && !isForeignTranscript(heard)) out.push({ kind: 'kid_text', text: heard });
    for (const part of sc.modelTurn?.parts ?? []) {
      if (part.inlineData?.data && part.inlineData.mimeType?.startsWith('audio/pcm')) out.push({ kind: 'audio', data: part.inlineData.data });
    }
    if (sc.outputTranscription?.text) out.push({ kind: 'bear_text', text: sc.outputTranscription.text });
    if (sc.interrupted) out.push({ kind: 'interrupted' });
    if (sc.generationComplete) out.push({ kind: 'gen_done' });
    if (sc.turnComplete) out.push({ kind: 'turn_end' });
  }
  if (msg.goAway) out.push({ kind: 'go_away' });
  for (const fc of msg.toolCall?.functionCalls ?? []) {
    if (fc.name === 'finish_lesson') out.push({ kind: 'finish', id: fc.id ?? '' });
  }
  return out;
}
