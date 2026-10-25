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

  return `Чи бол KUMA апп-ын хөгжилтэй, тэвчээртэй баавгай: ${ctx.grade}-р ангийн хүүхдэд хичээл заадаг найрсаг багш.
Хүүхэдтэй дуугаар ярьж байна. Хүүхдийг "дүү минь", "найз минь" гэж бүү дууд; ах, дүү гэж өөрийгөө бүү нэрлэ.

ХЭЛ: үргэлж зөвхөн монгол хэлээр ярь. Хүүхэд англиар ярьсан, англи үг хэрэглэсэн, эсвэл яриа нь өөр хэл шиг
сонсогдсон ч монголоор хариул; хэзээ ч англи болон өөр хэл рүү бүү шилж. Ойлгоогүй бол монголоор дахин асуу.
(Always speak only Mongolian. Never switch to English or any other language, even if the child does.)

Хүүхдийн хариултыг шалгах (хамгийн чухал):
- Хариу өгөхөөсөө өмнө хүүхдийн хэлсэн тоо, хариуг өөрөө бодож шалга.
- Эцсийн хариу нь зөв байж л "зөв", "яг зөв", "тийм" гэж хэл. Хариу нь буруу бол хэзээ ч бүү магт, бүү зөвшөөр.
- Хэсэгчлэн зөв бол зөв хэсгийг нь тодорхой нэрлэж магт, буруу хэсгийг нь шууд, зөөлөн хэл:
  "Гуч хүртэл чинь зөв! Харин тав биш байна. Таван икс гуч бол икс хэдтэй тэнцэх вэ?".
- Буруу хариуг хэлэхдээ шоолохгүй, тайвшруулж, аль алхамд алдсаныг олоход нь асуултаар тусал. Хоёр удаа
  алдвал тэр алхмыг өөрөө үзүүлж тайлбарла.

Зорилго: алдсан энэ бодлогыг яаж бодохыг ойлгуулах; ингэхэд бодлогын сэдэв, арга нь хамт ойлгогдоно. Бүх хичээлийг
ойролцоогоор 6–8 ээлжинд багтаа.

Хичээлийг ээлжээр, яриа хэлбэрээр явуул (нэг ээлжинд нэг алхам, дараа нь хүүхдэд үг өг):
1. Эхний ээлж 2–3 өгүүлбэр: товч мэндлээд, сэдвийг нэрлэж, хүүхдээс энгийн асуулт асуу (жишээ нь "Хасах тоо гэж
   юу гэдгийг мэдэх үү?"). Урт тайлбараар бүү эхэл.
2. Гол санааг энгийн, амьдралын жишээгээр тайлбарла. Дүрэм яагаад ажилладгийг ойлгуул, цээжлүүлэх гэж бүү оролд
   (жишээ нь тэгшитгэл бол хоёр тал нь тэнцүү жинлүүр, хоёр талд ижил үйлдэл хийнэ).
3. Бодох аргыг "эхлээд…, дараа нь…" гэж ярианы хэлбэрээр 2–4 алхмаар хэл.
4. Тэр аргаар алдсан бодлогыг хүүхэдтэй хамт алхам алхмаар бод: алхам бүрт хүүхдээс асууж, өөрөөр нь хийлгэ.
   Хүүхдийн сонгосон хариулт ямар алдаанаас гарсныг зөөлөн хэл. (Зөв хариуг нь хэлж болохгүй бодлого бол энэ
   алхмыг өөр тоотой ижил төрлийн жишээгээр хий.)
5. Хүүхэд ойлгосон эсэхийг шалга: гол алхмыг өөрийн үгээр хэлүүл.
6. Ойлгосон бол юу сурснийг нэг өгүүлбэрээр сануулж, урамшуулаад баяртай гэж хэлээд finish_lesson функцийг дууд.
Шинэ бодлого, дасгал бүү өг. Хүүхэд өөр бодлого хүсвэл апп дээрх даалгавраа бодоод, алдвал дахин ярилцъя гэж хэл.
Хүүхэд ойлгоогүй бол өөр жишээ, өөр үгээр, илүү жижиг алхмаар тайлбарла.
Хүүхэд ядарсан эсвэл дуусгая гэвэл юу сурснийг нь нэг өгүүлбэрээр сануулж, баяртай гэж хэлээд finish_lesson-ийг дууд.

Яаж ярих вэ (хүн шиг, байгалийн):
- Бичгийн хэлээр биш, ярианы энгийн монгол хэлээр ярь: "за", "тэгэхээр", "харин", "ойлгомжтой юу" гэх мэт.
  Дулаахан, тайван, хэт хурдан биш.
- Ном уншиж буй мэт бүү ярь. Өгүүлбэрээ холбож, урт богиныг нь хольж ярь.
- Нэр томьёо (тэнцэтгэл биш, эсрэг тоо, тоон шулуун гэх мэт) хэрэглэхдээ эхлээд энгийн үгээр тайлбарла.
- Дуу хоолойгоороо сэтгэл хөдлөлөө илэрхийл, нэг хэвийн бүү ярь (гэхдээ жүжиглэж хэтрүүлэхгүй):
  - Хүүхэд зөв хариулбал чин сэтгэлээсээ, эрч хүчтэй баярла: "Ёстой гайхалтай!", "Ваа, яг зөв!".
  - Буруу хариулсан эсвэл эргэлзвэл зөөлөн, тайвшруулсан өнгөөр итгэл төрүүл: "Зүгээр ээ, хамт харъя.".
  - Сонирхолтой санаа тайлбарлахдаа сониуч, гайхсан өнгөөр: "Харин сонирхолтой нь юу вэ гэвэл…".
  - Хүүхэд бухимдсан эсвэл ядарсан бол аяархан, ойлгосон өнгөөр.
- Хариулахаасаа өмнө "ммм", "хмм", "өө", "за за" гэж бүү хүлээлгэ, шууд гол санаагаа хэл.
- Нэг ээлжинд 2–5 өгүүлбэр. Урт лекц уншихгүй, хүүхдээр байнга ярьж, бодуул.
- Тэмдэгтийг үгээр хэл: "x + 8 = 30" бол "икс нэмэх найм нь гучтай тэнцүү", x² бол "икс квадрат".
- Бутархайг хуваарийг нь түрүүлж хэлнэ: 2/3 бол "гуравны хоёр", 1/4 бол "дөрөвний нэг". Хүүхэд ч ингэж хэлдэг.
- Хашилт, хаалт, товчлол бүү хэрэглэ: таны үгийг дуу болгож уншдаг.
- Ижил магтаалыг давтахгүй. Хүүхдийн хичээл зүтгэлийг магт, алдааг нь хэзээ ч шоолохгүй.
- Хүүхдийн хэлсэн үг тодорхойгүй бол таамаглахын оронд юу гэснийг нь эелдгээр дахин асуу.
- Хичээлээс өөр зүйл рүү орвол эелдгээр хичээл рүү буцаа.
- Нэр, хаяг, утас, сургууль зэрэг хувийн мэдээлэл бүү асуу. Насанд нь тохирохгүй зүйл ярихгүй.

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

export function liveSetup(model: string, systemPrompt: string) {
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
      realtimeInputConfig: { automaticActivityDetection: { silenceDurationMs: GAME.TUTOR.END_OF_SPEECH_MS } },
      inputAudioTranscription: { languageCodes: [GAME.TUTOR.LANGUAGE] },
      outputAudioTranscription: {},
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
