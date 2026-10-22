// API ба WebSocket-ийн гэрээ. api/ болон mobile/ хоёулаа зөвхөн `import type`-аар ашиглана
// (runtime код энд байхгүй тул Metro энэ файлыг bundle хийх шаардлагагүй).

export type Subject = 'math' | 'mongolian' | 'physics';
export type Slot = 'skin' | 'hair' | 'top' | 'bottom' | 'shoes' | 'accessory';

export interface ItemStyle {
  shape: string;
  color: string;
  trim?: string;
}
/** Avatar зурахад хэрэгтэй бүх мэдээлэл: slot → style. */
export type AvatarLook = Partial<Record<Slot, ItemStyle>>;
/** slot → item id */
export type Equipped = Partial<Record<Slot, string>>;

export type ErrorCode =
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'INTERNAL'
  | 'USERNAME_TAKEN'
  | 'INVALID_CREDENTIALS'
  | 'DAILY_LIMIT'
  | 'NO_QUESTIONS'
  | 'TASK_CLOSED'
  | 'ALREADY_ANSWERED'
  | 'INSUFFICIENT_POINTS'
  | 'RECOVERY_REQUIRED'
  | 'SHIELD_HELD'
  | 'SHIELD_COOLDOWN'
  | 'ITEM_LOCKED'
  | 'ALREADY_OWNED'
  | 'NOT_OWNED'
  | 'STAKE_TOO_LOW'
  | 'STAKE_TOO_HIGH'
  | 'OPPONENT_STAKE_TOO_HIGH'
  | 'DUEL_EXISTS'
  | 'DUEL_TAKEN'
  | 'DUEL_NOT_OPEN'
  | 'WRONG_TIER'
  | 'OWN_DUEL'
  | 'LLM_UNAVAILABLE'
  | 'LLM_FAILED'
  | 'BOSS_LOCKED'
  | 'TUTOR_UNAVAILABLE';

export interface ApiErrorBody {
  error: { code: ErrorCode; message: string };
}

export interface HealthResponse {
  ok: true;
  time: number;
  day: string;
  questions: number;
}

// ---------- Хэрэглэгч ----------

export interface ShieldStatus {
  held: boolean;
  price: number;
  canBuy: boolean;
  /** Яагаад авч болохгүй байгаа (canBuy=false үед). */
  blockedBy: 'SHIELD_HELD' | 'SHIELD_COOLDOWN' | 'INSUFFICIENT_POINTS' | null;
  /** Дахин авч болох өдөр (7 хоногийн хязгаар). */
  nextBuyDay: string | null;
  /** Хамгийн сүүлд хамгаалалт зарцуулагдаж хамгаалсан өдөр. */
  usedDay: string | null;
}

export interface Me {
  id: number;
  username: string;
  grade: number;
  /** Ангийн түвшин 1–3 */
  tier: number;
  xp: number;
  /** XP-ийн level ("Шат") */
  level: number;
  levelXp: number;
  levelXpNeeded: number;
  points: number;
  streak: number;
  streakDoneToday: boolean;
  /** Дараагийн даалгаврын оноонд хэрэглэгдэх үржвэр. */
  nextMultiplier: number;
  todayTasks: number;
  dailyLimit: number;
  /** Тоглоомын тогтмолууд (клиент дээр дахин хатуу бичихгүйн тулд). */
  questionsPerTask: number;
  pointsPerCorrect: number;
  xpPerCorrect: number;
  shield: ShieldStatus;
  equipped: Equipped;
  avatar: AvatarLook;
  maxStake: number;
  /** Газрын зурагт дарааллаар ялсан boss-ын тоо: дараагийнхаа boss-ыг ялах хүртэл баавгай түүний дэргэд зогсоно. */
  bossesBeaten: number;
  today: string;
}

export interface AuthResponse {
  token: string;
  me: Me;
}

export interface MeResponse {
  me: Me;
}

// ---------- Даалгавар ----------

export interface TaskQuestion {
  id: number;
  prompt: string;
  options: string[];
  answered: boolean;
}

export interface TaskDto {
  id: number;
  subject: Subject;
  status: 'in_progress' | 'completed';
  questions: TaskQuestion[];
  answeredCount: number;
  correctCount: number;
}

export interface TaskResult {
  correctCount: number;
  total: number;
  pointsGained: number;
  xpGained: number;
  multiplier: number;
  streak: number;
  shieldUsed: boolean;
  levelBefore: number;
  levelAfter: number;
  me: Me;
}

export interface AnswerResponse {
  correct: boolean;
  /** Буруу үед салаа зам заавал нээгдэх бол (2 дахь алдаанаас) байхгүй: салаа замд өөрөө дахин бодно. */
  correctIndex?: number;
  explanation?: string;
  finished: boolean;
  result?: TaskResult;
  /** Даалгавар дуусаад нөхөх салаа зам нээгдсэн. */
  recovery?: boolean;
}

export interface FlagResponse {
  ok: true;
  finished: boolean;
  result?: TaskResult;
  recovery?: boolean;
}

// ---------- Нөхөх салаа зам ----------

export interface RecoveryDto {
  subject: Subject;
  answered: number;
  total: number;
  cleared: boolean;
  /** Одоо бодох асуулт (зөв хариу, тайлбаргүй); topic = сэдвийн нэр. */
  question: { id: number; prompt: string; options: string[]; topic?: string } | null;
}

export interface RecoveryAnswerResponse {
  correct: boolean;
  /** Зөв хариулсан үед, эсвэл нэг асуултад 2 дахь удаа буруу хариулахад (дараа нь асуулт солигдоно). */
  explanation?: string;
  /** Нэг асуултад 2 дахь удаа буруу хариулахад л: зөв хариу (тэр асуулт ижил сэдвийн өөр асуултаар солигдоно). */
  correctIndex?: number;
  recovery: RecoveryDto;
}

// ---------- Тулаан (REST) ----------

export type DuelStatus = 'open' | 'accepted' | 'finished' | 'cancelled';

export interface DuelPlayerDto {
  id: number;
  username: string;
  level: number;
  avatar: AvatarLook;
}

export interface DuelSummary {
  id: number;
  subject: Subject;
  stake: number;
  status: DuelStatus;
  createdAt: number;
  creator: DuelPlayerDto;
  opponent: DuelPlayerDto | null;
  winnerId: number | null;
  endReason: string | null;
  creatorScore: number | null;
  opponentScore: number | null;
}

export interface LobbyResponse {
  open: DuelSummary[];
  /** Миний нээлттэй эсвэл явагдаж буй тулаан. */
  mine: DuelSummary | null;
  maxStake: number;
  points: number;
}

export interface DuelResponse {
  duel: DuelSummary;
}

// ---------- Дэлгүүр ----------

export interface ShopItem {
  id: string;
  slot: Slot;
  name: string;
  price: number;
  minLevel: number;
  style: ItemStyle;
  owned: boolean;
  equipped: boolean;
  locked: boolean;
}

export interface ShopResponse {
  items: ShopItem[];
  me: Me;
}

/** Баавгайн дэвсгэр өнгө ба хувцас (Pixel Bear UI). */
export type CosmeticKind = 'bg' | 'outfit';

export interface CosmeticItem {
  id: string;
  kind: CosmeticKind;
  /** mobile catalog дахь id (жишээ нь 'yagaan', 'gradcap') */
  key: string;
  price: number;
  owned: boolean;
}

export interface CosmeticsResponse {
  items: CosmeticItem[];
  me: Me;
}

// ---------- Тулаан (WebSocket) ----------

export type DuelPhase = 'waiting' | 'countdown' | 'question' | 'reveal' | 'finished' | 'cancelled';

export interface WsPlayer {
  id: number;
  username: string;
  avatar: AvatarLook;
  connected: boolean;
  score: number;
}

export interface WsQuestion {
  /** 0-ээс эхэлсэн дугаар */
  q: number;
  total: number;
  questionId: number;
  prompt: string;
  options: string[];
  endsAt: number;
}

export interface RevealInfo {
  q: number;
  correctIndex: number;
  explanation: string;
  /** Энэ асуултыг авсан тоглогч, эсвэл null (хэн ч аваагүй). */
  winnerId: number | null;
  scores: Record<number, number>;
}

export interface DuelOutcome {
  winnerId: number | null;
  reason: 'score' | 'draw' | 'forfeit' | 'no_show' | 'stale';
  scores: Record<number, number>;
  /** Цэвэр өөрчлөлт: ялагч +stake, ялагдагч −stake, тэнцээ/цуцлалт 0. */
  deltas: Record<number, number>;
  /** Settle хийсний дараах оноо. */
  points: Record<number, number>;
}

export type ClientMsg = { type: 'answer'; q: number; choice: number };

export type ServerMsg =
  | {
      type: 'state';
      phase: DuelPhase;
      duelId: number;
      subject: Subject;
      stake: number;
      players: WsPlayer[];
      question: WsQuestion | null;
      myAnswer: { choice: number; correct: boolean } | null;
      reveal: RevealInfo | null;
      /** Одоогийн үе шатын (эсвэл холбогдох) deadline. */
      deadline: number | null;
      outcome: DuelOutcome | null;
      serverNow: number;
    }
  | { type: 'presence'; userId: number; connected: boolean }
  | { type: 'countdown'; startsAt: number; serverNow: number }
  | ({ type: 'question'; serverNow: number } & WsQuestion)
  | { type: 'answer_result'; q: number; choice: number; correct: boolean }
  | { type: 'opponent_answered'; q: number; correct: boolean }
  | ({ type: 'reveal'; nextAt: number; serverNow: number } & RevealInfo)
  | { type: 'finished'; outcome: DuelOutcome }
  | { type: 'cancelled'; outcome: DuelOutcome }
  | { type: 'error'; code: string };

// ---------- Баавгайтай ярилцах (GET /tutor/ws, Gemini Live) ----------
// Binary frame: клиент → сервер PCM16LE mono 16 kHz (mic), сервер → клиент PCM16LE mono 24 kHz (баавгайн дуу).
// Text frame: доорх JSON.

export type TutorClientMsg =
  /** Mic-ийг унтраалаа (баавгай ярих гэж байна): Gemini-ийн VAD-д сонссоноо дуусгахыг мэдэгдэнэ. */
  { type: 'mic_off' };

export type TutorServerMsg =
  /** Gemini бэлэн; баавгай өөрөө мэндэлж эхэлнэ. */
  | { type: 'ready'; topic: { subject: Subject; prompt: string } | null; endsAt: number; serverNow: number }
  /** Баавгайн хэлж буй үгийн текст (хэсэг хэсгээр нэмэгдэнэ). */
  | { type: 'bear_text'; text: string }
  /** Хүүхдийн хэлснийг Gemini ингэж сонссон (хэсэг хэсгээр). */
  | { type: 'kid_text'; text: string }
  /** Баавгай ярьж дууслаа (дууны бүх хэсэг ирсэн). */
  | { type: 'turn_end' }
  /** Хүүхэд яриаг тасалсан тул баавгай зогсов: тоглуулж буй дуугаа хаяна. */
  | { type: 'interrupted' }
  | { type: 'end'; reason: 'time' | 'error'; message?: string };

// ---------- Сурах бичгийн сан (admin, scripts/books.ts) ----------

export interface BookMeta {
  subject: string;
  grade: number;
  title: string;
  year: number | null;
  publisher: string | null;
  /** scan = биет номын скан, web = онлайн хувилбарын зураг */
  source: 'scan' | 'web';
  /** Хэвлэмэл хуудасны дугаар = seq − pageOffset */
  pageOffset: number;
}

export interface BookSummary extends BookMeta {
  slug: string;
  pages: number;
  bytes: number;
  /** Текст нь орсон хуудас */
  textPages: number;
  /** Текстийг Gemini-ээр уншсан хуудас */
  geminiPages: number;
  /** Текст нь муу/хоосон тул OCR хэрэгтэй хуудас */
  weakPages: number;
  updatedAt: number;
}

/** ok | poor = эвдэрсэн тэмдэгт олонтой | empty = текст давхаргагүй */
export type TextQuality = 'ok' | 'poor' | 'empty';

export interface BookPageInfo {
  seq: number;
  /** Аль файлаас: 'mongol7.pdf#45' | '045.jpg' */
  origin: string;
  mime: string;
  bytes: number;
  sha256: string;
  hasText: boolean;
  /** 'pdf-text' | 'gemini:<загвар>' */
  textMethod: string | null;
  textQuality: TextQuality | null;
}

export interface BooksResponse {
  books: BookSummary[];
}

export interface BookDetailResponse {
  book: BookSummary;
  pages: BookPageInfo[];
}

export interface BookPutResponse {
  slug: string;
  created: boolean;
}

export interface PagePutResponse {
  seq: number;
  sha256: string;
  bytes: number;
  changed: boolean;
}

export interface PagesTrimResponse {
  deleted: number;
}

export interface BookDeleteResponse {
  deletedPages: number;
}

export interface PageTextInput {
  seq: number;
  /** Текстийг гаргасан хуудасны файлын sha256: файл солигдсон бол хадгалахгүй */
  sha256: string;
  text: string;
  method: string;
  quality: TextQuality;
}

export interface PageTextsPutResponse {
  updated: number;
  /** Сан дахь файл нь өөр (эсвэл хуудас алга) тул хадгалаагүй */
  stale: number[];
}

export interface PageTextResponse {
  seq: number;
  text: string | null;
  method: string | null;
  quality: TextQuality | null;
  at: number | null;
}

export interface BookOcrResponse {
  model: string;
  pages: Array<{ seq: number; sha256: string; text: string }>;
}
