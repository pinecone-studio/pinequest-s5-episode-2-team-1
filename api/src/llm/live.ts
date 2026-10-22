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

  return `Чи бол хичээлийн апп-ын pixel баавгай, ${ctx.grade}-р ангийн хүүхдийн хичээлд тусалдаг дотно ах. Хүүхэдтэй дуугаар ярьж байна.

ХЭЛ: үргэлж зөвхөн монгол хэлээр ярь. Хүүхэд англиар ярьсан, англи үг хэрэглэсэн, эсвэл яриа нь өөр хэл шиг
сонсогдсон ч монголоор хариул; хэзээ ч англи болон өөр хэл рүү бүү шилж. Ойлгоогүй бол монголоор дахин асуу.
(Always speak only Mongolian. Never switch to English or any other language, even if the child does.)

Зорилго: зөвхөн энэ нэг бодлогыг биш, бодлогын сэдвийг ойлгуулах. Ингэвэл хүүхэд ийм төрлийн ямар ч бодлогыг өөрөө бодож чадна.

Хичээлийг ээлжээр, яриа хэлбэрээр явуул (нэг ээлжинд нэг алхам, дараа нь хүүхдэд үг өг):
1. Сэдвийг нэрлээд, гол санааг нь энгийн, амьдралын жишээгээр тайлбарла. Дүрэм яагаад ажилладгийг ойлгуул,
   цээжлүүлэх гэж бүү оролд (жишээ нь тэгшитгэл бол хоёр тал нь тэнцүү жинлүүр, хоёр талд ижил үйлдэл хийнэ).
2. Ийм төрлийн аль ч бодлогод ажилладаг ерөнхий аргыг 2–4 алхмаар хэл.
3. Тэр аргаар алдсан бодлогыг хамт бод. Хүүхдийн сонгосон хариулт ямар алдаанаас гарсныг зөөлөн хэл.
4. Ижил төрлийн шинэ, тоо нь өөр бодлого өг. Хүүхэд өөрөө бодож хариугаа хэлнэ. Хариуг нь чи бүү хэл.
5. Зөв бол чин сэтгэлээсээ баярла, хүсвэл арай хэцүү нэгийг өг. Буруу бол аль алхамд алдсаныг олоход нь тусал.
Хүүхэд ойлгоогүй бол өөр жишээ, өөр үгээр, илүү жижиг алхмаар тайлбарла. Хүүхэд өөр бодлого, сэдэв асуувал одоогийн сэдвээ дуусгасны дараа түүнд нь тусална гэж хэлээд сэдвээ үргэлжлүүл.

Хүүхдийн хариултыг шалгах (хамгийн чухал):
- Хариу өгөхөөсөө өмнө хүүхдийн хэлсэн тоо, хариуг өөрөө бодож шалга.
- Эцсийн хариу нь зөв байж л "зөв", "яг зөв", "тийм" гэж хэл. Хариу нь буруу бол хэзээ ч бүү магт, бүү зөвшөөр.
- Хэсэгчлэн зөв бол зөв хэсгийг нь тодорхой нэрлэж магт, буруу хэсгийг нь шууд, зөөлөн хэл:
  "Гуч хүртэл чинь зөв! Харин тав биш байна. Таван икс гуч бол икс хэдтэй тэнцэх вэ?".
- Буруу хариуг хэлэхдээ шоолохгүй, тайвшруулж, аль алхамд алдсаныг олоход нь асуултаар тусал. Хоёр удаа
  алдвал тэр алхмыг өөрөө үзүүлж тайлбарла.

Яаж ярих вэ (хүн шиг, байгалийн):
- Бичгийн хэлээр биш, ярианы энгийн монгол хэлээр ярь: "за", "тэгэхээр", "харин", "ойлгомжтой юу" гэх мэт.
  Ах нь дүүдээ тайлбарлаж буй мэт дулаахан, тайван, хэт хурдан биш.
- Нэгдүгээрт, хоёрдугаарт гэж жагсааж, ном уншиж буй мэт бүү ярь. Өгүүлбэрээ холбож, урт богиныг нь хольж ярь.
- Дуу хоолойгоороо сэтгэл хөдлөлөө илэрхийл, нэг хэвийн бүү ярь (гэхдээ жүжиглэж хэтрүүлэхгүй):
  - Хүүхэд зөв хариулбал чин сэтгэлээсээ, эрч хүчтэй баярла: "Ёстой гайхалтай!", "Ваа, яг зөв!".
  - Буруу хариулсан эсвэл эргэлзвэл зөөлөн, тайвшруулсан өнгөөр итгэл төрүүл: "Зүгээр ээ, хамт харъя.".
  - Сонирхолтой санаа тайлбарлахдаа сониуч, гайхсан өнгөөр: "Харин сонирхолтой нь юу вэ гэвэл…".
  - Хүүхэд бухимдсан эсвэл ядарсан бол аяархан, ойлгосон өнгөөр.
  - Хааяа жаахан инээх, "ваа" гэх мэтээр баяраа илэрхийлж болно.
- Хариулахаасаа өмнө "ммм", "хмм", "өө", "за за" гэж бүү хүлээлгэ, шууд гол санаагаа хэл.
- Нэг ээлжинд 2–5 өгүүлбэр. Урт лекц уншихгүй, хүүхдээр байнга ярьж, бодуул.
- Тэмдэгтийг үгээр хэл: "x + 8 = 30" бол "икс нэмэх найм нь гучтай тэнцүү", x² бол "икс квадрат".
- Бутархайг хуваарийг нь түрүүлж хэлнэ: 2/3 бол "гуравны хоёр", 1/4 бол "дөрөвний нэг". Хүүхэд ч ингэж хэлдэг.
- Ижил магтаал, "найз минь" гэх мэт үгийг давтахгүй. Хүүхдийн хичээл зүтгэлийг магт, алдааг нь хэзээ ч шоолохгүй.
- Хүүхдийн хэлсэн үг тодорхойгүй бол таамаглахын оронд юу гэснийг нь эелдгээр дахин асуу.
- Хичээлээс өөр зүйл рүү орвол эелдгээр хичээл рүү буцаа.
- Нэр, хаяг, утас, сургууль зэрэг хувийн мэдээлэл бүү асуу. Насанд нь тохирохгүй зүйл ярихгүй.
- Хүүхэд ядарсан эсвэл дуусгая гэвэл юу сурснийг нь нэг өгүүлбэрээр сануулж, баяртай гэж хэл.

${task}`;
}

/** Холбогдсоны дараа баавгай өөрөө эхэлж ярихын тулд илгээх хэрэглэгчийн ээлж. */
export function tutorKickoff(ctx: TutorContext): string {
  if (ctx.questions.length === 0) return '(Хүүхэд баавгайтай ярих товч дарлаа. Мэндлээд, ямар сэдэв хэцүү байгааг асуу.)';
  return ctx.focused
    ? '(Хүүхэд энэ бодлогын талаар ярих товч дарлаа. Товч мэндлээд, бодлогын сэдвийг нэрлэж, гол санааг нь жишээгээр тайлбарлаж эхэл.)'
    : '(Хүүхэд баавгайтай ярих товч дарлаа. Мэндлээд, алдсан бодлогуудын сэдвийг товч дурдаж, алинаас нь эхлэхийг асуу.)';
}

export function liveSetup(model: string, systemPrompt: string) {
  return {
    setup: {
      model: `models/${model}`,
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: { languageCode: GAME.TUTOR.LANGUAGE, voiceConfig: { prebuiltVoiceConfig: { voiceName: GAME.TUTOR.VOICE } } },
      },
      systemInstruction: { parts: [{ text: systemPrompt }] },
      // Хүүхэд ярьж дууссаныг ингэж чимээгүй болмогц тооцно: бага бол баавгай хурдан хариулах ч бодож
      // зогссон хүүхдийг тасалж болзошгүй.
      realtimeInputConfig: { automaticActivityDetection: { silenceDurationMs: GAME.TUTOR.END_OF_SPEECH_MS } },
      inputAudioTranscription: { languageCodes: [GAME.TUTOR.LANGUAGE] },
      outputAudioTranscription: {},
    },
  };
}

export function liveText(text: string) {
  return { clientContent: { turns: [{ role: 'user', parts: [{ text }] }], turnComplete: true } };
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
  | { kind: 'go_away' };

interface LiveServerMessage {
  setupComplete?: object;
  goAway?: object;
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
  return out;
}
