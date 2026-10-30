import type { BEAR_FACES, BEAR_FURS } from './bear';
import type { BagItem, LootKind } from './loot';
import type { HeardFrom, Reason, SelfLevel } from './onboarding';
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
  | 'WRONG_GRADE'
  | 'JUDGE_DUEL'
  | 'OWN_DUEL'
  | 'CODE_NOT_FOUND'
  | 'TEAM_FULL'
  | 'LLM_UNAVAILABLE'
  | 'LLM_FAILED'
  | 'BOSS_LOCKED'
  | 'NODE_LOCKED'
  | 'NO_LIVES'
  | 'CHEST_LOCKED'
  | 'NO_ITEM'
  | 'LIVES_FULL'
  | 'NO_REVIEW'
  | 'REVIEW_DONE'
  | 'STAGE_LOCKED'
  | 'TUTOR_UNAVAILABLE'
  | 'TUTOR_LIMIT'
  | 'PROFILE_NOT_FOUND'
  | 'FRIEND_LIMIT'
  | 'CLAN_NOT_FOUND'
  | 'CLAN_FULL'
  | 'CLAN_MEMBER'
  | 'JUDGE_LIMIT';

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
  /** Профайлын нэр (хоч); тохируулаагүй бол username */
  name: string;
  /** Профайлаа (нэр, баавгай) тохируулсан эсэх: бүртгүүлсний дараах алхмыг нэг л удаа харуулна */
  profileSet: boolean;
  /** Анх орохдоо асуудаг асуултаа (хаанаас сонссон, анги, зорилго, түвшин) бөглөсөн эсэх */
  onboarded: boolean;
  /** Асуулгад сонгосон хичээл (сурах зам): шинэ утас, browser дээр асуулгыг дахин асуулгүй сэргээнэ. Хуучин хэрэглэгчид null. */
  subject: Subject | null;
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
  /** Тоглоомын тогтмолууд (клиент дээр дахин хатуу бичихгүйн тулд). */
  questionsPerTask: number;
  pointsPerCorrect: number;
  xpPerCorrect: number;
  shield: ShieldStatus;
  equipped: Equipped;
  avatar: AvatarLook;
  maxStake: number;
  /** Хичээл бүрийн сурах зам: газрын зураг дээрх байрлал ба ялсан boss хичээлээр тусдаа. */
  paths: Record<Subject, SubjectPath>;
  /** Нүүрэн дээр сонгосон дэвсгэр, хувцас (серверт хадгалагдсан хувилбар): профайл дээр бусдад ингэж харагдана. */
  look: BearLook;
  /** Хариулаагүй найзын хүсэлт (аватар дээр цэг) */
  friendRequests: number;
  today: string;
  /** Хөгжүүлэгч: бүх зангилаа, boss руу орно, давтлагагүй, бүх хувцас эзэмшинэ. */
  admin: boolean;
  /** Шүүгч ("Шүүгчээр орох"): admin шиг бүх боломж нээлттэй (замын газрын зураг цоожгүй), admin-ийн хэрэгсэлгүй. */
  judge: boolean;
  /** Амь: зангилаа руу орох бүрт нэг хасагдана; 0 бол бодлого, давтлага, баавгай хаалттай. */
  lives: number;
  maxLives: number;
  /** Дараагийн амь нөхөгдөх мөч (ms); дүүрэн бол null. */
  nextLifeAt: number | null;
  /** Цүнхний хэрэглэгдэхүүн (нууц хайрцгаас): Хувын болор, Зөгийн балны сав */
  bag: Record<BagItem, number>;
}

export type BearFur = (typeof BEAR_FURS)[number];
export type BearFace = (typeof BEAR_FACES)[number];

/** Баавгайн дэвсгэр, хувцас (mobile catalog-ийн key: 'nimbeg', 'gradcap'…), үс, царай, цээжний цагаан толбо. */
export interface BearLook {
  bg: string;
  outfit: string;
  fur: BearFur;
  face: BearFace;
  chest: boolean;
}

export interface SubjectPath {
  /** Энэ хичээлийн даалгавраас авсан XP (нийт XP-ийн хэсэг). */
  xp: number;
  /** Давсан зангилаа + 1: газрын зураг дээрх зангилаа = level − 1 (даалгаварт 4/5+ зөв бол нэг ахина). */
  level: number;
  /**
   * Дарааллаар давсан тулааны хаалганы (boss, 2-р бүлгийн зүүн/баруун гар) тоо: дараагийнхаа хаалгыг давах хүртэл
   * баавгай түүний дэргэд зогсоно.
   */
  bossesBeaten: number;
  /** Зангилаа → давсан шат (1 Суурь, 2 Дунд, 3 Ахисан); байхгүй бол 0 (shared/path.ts stageDone). */
  stages: Record<number, number>;
  /** Нээсэн нууц хайрцгийн зангилаанууд (shared/path.ts chestNodes) */
  chests: number[];
}

/** Сурах бичгийн гарчгаас гаргасан нэг хичээл (сэдэв). */
export interface BookLesson {
  /** 'II БҮЛЭГ. АРАВТЫН БА ЭНГИЙН БУТАРХАЙ, ПРОЦЕНТ' */
  chapter: string;
  title: string;
  /** хэвлэмэл хуудасны дугаар; гарчигт тодорхойгүй бол null */
  page: number | null;
}

/** GET /me/lessons/:subject — хэрэглэгчийн ангийн номын хичээлүүд, сан дахь хуудсаар тасалсан. */
export interface LessonsResponse {
  /** 'Математик 7'; энэ анги, хичээлд ном байхгүй бол null (апп хуучин сэдвүүдээ харуулна) */
  book: string | null;
  lessons: BookLesson[];
}

export interface AuthResponse {
  token: string;
  me: Me;
}

export interface MeResponse {
  me: Me;
}

// ---------- Профайл хуваалцах ----------

/** Нэг хичээлийн ахиц: сурах зам ба даалгаврын хариултууд. */
export interface SubjectSkill {
  subject: Subject;
  /** Сурах замын шат (SubjectPath.level) */
  level: number;
  /** Ялсан жинхэнэ boss-ын тоо (зүүн/баруун гарыг тооцохгүй) */
  bossesBeaten: number;
  /** Даалгаварт зөв хариулсан асуулт */
  correct: number;
  /** Хариулсан асуулт ("Асуулт буруу байна" гэж алгассаныг тооцохгүй) */
  answered: number;
}

/**
 * Бусдад харагдах профайл: баавгай, шат, ахиц. Оноо, хамгаалалт, нууц үг зэрэг хувийн мэдээлэл орохгүй,
 * хэрэглэгчийн id ч орохгүй (профайлыг зөвхөн кодоор нь олно).
 */
export interface PublicProfile {
  username: string;
  name: string;
  grade: number;
  level: number;
  levelXp: number;
  levelXpNeeded: number;
  streak: number;
  /** Даалгавар дуусгасан өдрийн тоо */
  studyDays: number;
  look: BearLook;
  /** Эзэмшиж буй дэвсгэр, хувцас (үнэгүйг оролцуулна), mobile catalog-ийн key */
  collection: { bgs: string[]; outfits: string[] };
  skills: SubjectSkill[];
  /** Дууссан тулаан (цуцлагдсаныг тооцохгүй) */
  duels: { played: number; won: number };
  /** Бүртгүүлсэн хугацаа (epoch ms) */
  joinedAt: number;
  /** Нэгдсэн Уулын нэр ("Төгсбилэгийн", апп ард нь " Уул" нэмнэ); Уулгүй бол null. Урилгын код орохгүй. */
  clan: string | null;
}

/** GET /me/profile, POST /me/profile/code */
export interface MyProfileResponse {
  profile: PublicProfile;
  /** Профайлын код: үүнийг мэдэх хүн л профайлыг харна. Солибол хуучин код ажиллахаа болино. */
  code: string;
}

/** GET /profiles/:code */
export interface ProfileResponse {
  profile: PublicProfile;
  /** Өөрийнхөө кодыг оруулсан */
  isMe: boolean;
  /** Энэ хүүхэдтэй найз эсэх (өөрийнх бол 'none') */
  friend: FriendStatus;
}

// ---------- Найзууд ----------
// Найзыг профайлын кодоор нь (QR эсвэл бичиж) нэмнэ: нөгөө нь зөвшөөрсөн үед л найз болно. Id ашиглахгүй.

/** none = холбоогүй, outgoing = би хүсэлт илгээсэн, incoming = тэр надад илгээсэн, friends = найзууд */
export type FriendStatus = 'none' | 'outgoing' | 'incoming' | 'friends';

export interface FriendDto {
  /** Профайлын код: /u/<код>, мөн хүсэлт зөвшөөрөх, хасахад */
  code: string;
  username: string;
  name: string;
  grade: number;
  level: number;
  streak: number;
  look: BearLook;
  /** Найз болсон хүний сурах замын ахиц (газрын зураг дээр баавгайг нь харуулна); хүсэлтэд байхгүй. */
  paths?: Partial<Record<Subject, FriendPath>>;
}

/** Найзын нэг хичээлийн замын байрлал: SubjectPath-ын level, bossesBeaten (currentNode-д хангалттай). */
export interface FriendPath {
  level: number;
  bossesBeaten: number;
}

/** GET /friends */
export interface FriendsResponse {
  friends: FriendDto[];
  /** Надад ирсэн, хариулаагүй хүсэлт (шинэ нь эхэндээ) */
  incoming: FriendDto[];
  /** Миний илгээсэн, хүлээгдэж буй хүсэлт */
  outgoing: FriendDto[];
}

/** POST /friends — хүсэлт илгээнэ; тэр надад аль хэдийн илгээсэн бол зөвшөөрнө. */
export interface FriendBody {
  code: string;
}

/** POST /friends, DELETE /friends/:code */
export interface FriendActionResponse {
  friend: FriendStatus;
}

// ---------- Уул (ангийн баг) ----------
// Ангийнхан 6 оронтой кодоор нэг Ууланд нэгдэнэ (дээд тал нь 40). Гишүүдийн XP Уулыг өндөрсгөнө (shared/clan.ts).

/** Уулын гишүүн: найзын мөрийн адил (профайлын кодоор нь /u/<код> нээгдэнэ), дээр нь Уулд нэмсэн метр. */
export interface ClanMemberDto extends Omit<FriendDto, 'paths'> {
  /** Уулыг өндөрсгөсөн нийт метр (XP / XP_PER_METER) */
  meters: number;
  /** Энэ 7 хоногт (Даваа гарагаас) нэмсэн метр */
  weekMeters: number;
  owner: boolean;
  isMe: boolean;
}

export interface ClanDto {
  /** Урилгын код: гишүүн бүр харж, ангийнхандаа өгнө; эзэн нь солино. */
  code: string;
  /** Нэрийн эхний хэсэг: "Төгсбилэгийн" (clanTitle → "Төгсбилэгийн Уул") */
  name: string;
  /** Гишүүдийн нийт метр */
  height: number;
  weekHeight: number;
  maxMembers: number;
  /** Би Уулын эзэн (нэр, код солих, гишүүн хасах) */
  isOwner: boolean;
  /** Энэ 7 хоногт хамгийн их өндөрсгөсөн нь эхэндээ */
  members: ClanMemberDto[];
}

/** GET /clans/mine, POST /clans, POST /clans/:code/join, PATCH /clans/mine, POST /clans/mine/code, POST /clans/mine/leave */
export interface MyClanResponse {
  clan: ClanDto | null;
}

/** Нэгдэхээс өмнө кодоор харах: гишүүдийн жагсаалтгүй, зөвхөн баавгайнуудын харагдац. */
export interface ClanPreview {
  code: string;
  name: string;
  members: number;
  maxMembers: number;
  height: number;
  /** Эзний нэр */
  owner: string;
  /** Эхний гишүүдийн баавгай (Уулын зурган дээр) */
  looks: BearLook[];
}

/**
 * Лиг дээрх Уул. Өөр Уулын хувьд урилгын код, username, профайлын код, гишүүдийн нэр БАЙХГҮЙ (docs/design/clan-league.md §7):
 * зөвхөн нэр, тоо, нэргүй баавгайн хөрөг.
 */
export interface LeagueClanDto {
  /** clans.public_id (урилгын код биш) */
  id: string;
  name: string;
  members: number;
  rank: number;
  /** Энэ 7 хоногт гишүүдийн нэмсэн метр (тоглолтын оноо гартал эрэмбэ үүгээр) */
  weekHeight: number;
  /** Нийт өндөр (тэнцвэл) */
  height: number;
  isMine: boolean;
  looks: BearLook[];
}

/** GET /league. no_clan = Уулгүй, too_small = 5-аас цөөн гишүүнтэй (лигт ороогүй), placed = лигт байна. */
export interface LeagueResponse {
  season: { week: string; endsAt: number };
  me: { state: 'no_clan' | 'too_small' | 'placed'; tier: number; members: number; minMembers: number; isOwner: boolean; clanName: string | null; grade: number | null };
  /** Өөрийн бүлэг (ижил лиг, ижил анги); лигт ороогүй бол хоосон */
  standings: LeagueClanDto[];
}

/** GET /clans/:code. member = энэ Ууланд байна, elsewhere = өөр Ууланд байна (эхлээд гарах ёстой). */
export interface ClanPreviewResponse {
  clan: ClanPreview;
  status: 'member' | 'elsewhere' | 'none';
}

/** POST /clans (name байхгүй бол үүсгэгчийн нэрээс: "Төгсбилэгийн"), PATCH /clans/mine */
export interface ClanBody {
  name?: string;
}

/** PUT /me/look */
export type LookBody = Pick<BearLook, 'bg' | 'outfit'>;

/** PUT /me/onboarding: анги нь зөвхөн анх бөглөхөд хэрэгжинэ (дараа нь өөрчлөгдвөл зам эвдэрнэ) */
export interface OnboardingBody {
  grade: number;
  subject: Subject;
  /** Хуучин клиентүүд илгээж болно; шинэ богино onboarding-д заавал биш. */
  heardFrom?: HeardFrom;
  reason?: Reason;
  level?: SelfLevel;
}

/** PUT /me/avatar: профайлын нэр ба баавгайн төрх */
export type AvatarBody = { name: string } & Pick<BearLook, 'fur' | 'face' | 'chest'>;

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
  /** Өнөөдрийн хичээл бол давтаж буй хичээлийн нэр (номгүй бол null). */
  title?: string | null;
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
  /** Энэ даалгавраар сурах замын дараагийн зангилаа нээгдсэн (4/5+ зөв эсвэл boss ялсан). */
  nodeUp: boolean;
  /** Тулааны хаалганы даалгавар бол тэр хаалга (boss, гар, цэрэг), бусад нь null; энэ удаа анх давсан эсэх. */
  gate: number | null;
  gateBeaten: boolean;
  /** Зангилааны шатны даалгавар бол тэр шат (тулаан бол null), давсан эсэх. */
  stage: number | null;
  stagePassed: boolean;
  /** Өнөөдрийн хичээл (өмнөх хичээлээс давтах дасгал): замд нөлөөлөхгүй. */
  review: boolean;
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

// ---------- Нууц хайрцаг, цүнх ----------

/** POST /me/chests: нээсэн хайрцгийн шагнал (дахин нээхэд ижил, fresh = false). */
export interface ChestOpenResponse {
  node: number;
  kind: LootKind;
  qty: number;
  fresh: boolean;
  me: Me;
}

/** POST /tasks/:id/hint: Хувын болор нуусан 2 буруу хариулт. */
export interface HintResponse {
  hide: number[];
  bag: Record<BagItem, number>;
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

/** 'public' = ижил түвшний лобби дээр гарна, 'private' = зөвхөн урилгын кодоор орно. */
export type DuelVisibility = 'public' | 'private';

/** Багийн тулааны хоёр тал: 'a' = үүсгэгчийн баг (цэнхэр), 'b' = эсрэг баг (ягаан). 1 vs 1-д ч мөн адил. */
export type DuelTeam = 'a' | 'b';

export interface DuelPlayerDto {
  id: number;
  username: string;
  /** Профайлын нэр (хоч) */
  name: string;
  level: number;
  avatar: AvatarLook;
  /** Баавгайн хөрөг (үс, царай): VS дэлгэц, багийн слот дээр. */
  look: BearLook;
}

export interface DuelMemberDto extends DuelPlayerDto {
  team: DuelTeam;
}

export interface DuelSummary {
  id: number;
  subject: Subject;
  stake: number;
  status: DuelStatus;
  visibility: DuelVisibility;
  /** Багийн хэмжээ: 1 = 1 vs 1, 2–5 = багийн тулаан (2 vs 2 … 5 vs 5). */
  teamSize: number;
  /** Бүх оролцогч багаар нь (үүсгэгч 'a'-д). 1 vs 1-д үүсгэгч ба өрсөлдөгч. */
  members: DuelMemberDto[];
  /** Харж буй хэрэглэгчийн баг (оролцогч биш бол null). */
  myTeam: DuelTeam | null;
  /** Урилгын код: зөвхөн оролцогчдод (бусдад null), нээлттэй үед. */
  code: string | null;
  createdAt: number;
  creator: DuelPlayerDto;
  opponent: DuelPlayerDto | null;
  winnerId: number | null;
  endReason: string | null;
  creatorScore: number | null;
  opponentScore: number | null;
}

export interface LobbyResponse {
  /** Нэгдэх боломжтой сорилтууд: ижил түвшин, 'public', үүсгэгч нь яг одоо хүлээж байгаа. */
  open: DuelSummary[];
  /** Миний нээлттэй эсвэл явагдаж буй тулаан. */
  mine: DuelSummary | null;
  maxStake: number;
  points: number;
}

export interface DuelResponse {
  duel: DuelSummary;
}

/** POST /duels */
export interface CreateDuelBody {
  subject: Subject;
  stake: number;
  visibility?: DuelVisibility;
  /** 1 (анхдагч) … 5 */
  teamSize?: number;
}

/** POST /duels/join — урилгын кодоор орно. Багийн тулаанд `team` өгөхгүй бол дутуу баг руу орно. */
export interface JoinDuelBody {
  code: string;
  team?: DuelTeam;
}

/** POST /duels/:id/accept, POST /duels/:id/team */
export interface DuelTeamBody {
  team?: DuelTeam;
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
  name: string;
  avatar: AvatarLook;
  look: BearLook;
  team: DuelTeam;
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
  /** Энэ асуултыг (хамгийн түрүүнд) авсан тоглогч, эсвэл null (хэн ч аваагүй). */
  winnerId: number | null;
  /** Зөв хариулсан бүх тоглогч (багийн тулаанд хүн бүр хариулна). */
  correct: number[];
  scores: Record<number, number>;
  teamScores: Record<DuelTeam, number>;
}

export interface DuelOutcome {
  /** 1 vs 1-ийн ялагч; багийн тулаанд null (winnerTeam-ийг үз). */
  winnerId: number | null;
  /** Ялсан баг, тэнцээ/цуцлалт бол null. */
  winnerTeam: DuelTeam | null;
  reason: 'score' | 'draw' | 'forfeit' | 'no_show' | 'stale';
  scores: Record<number, number>;
  teamScores: Record<DuelTeam, number>;
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
      teamSize: number;
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
  /** Өөр тоглогч (өрсөлдөгч эсвэл багийн нөхөр) хариуллаа. */
  | { type: 'opponent_answered'; q: number; correct: boolean; userId: number }
  | ({ type: 'reveal'; nextAt: number; serverNow: number } & RevealInfo)
  | { type: 'finished'; outcome: DuelOutcome }
  | { type: 'cancelled'; outcome: DuelOutcome }
  | { type: 'error'; code: string };

// ---------- Баавгайтай ярилцах (GET /tutor/ws, Gemini Live) ----------
// Binary frame: клиент → сервер PCM16LE mono 16 kHz (mic), сервер → клиент PCM16LE mono 24 kHz (баавгайн дуу).
// Text frame: доорх JSON.

export type TutorClientMsg =
  /** Mic-ийг унтраалаа (баавгай ярих гэж байна): Gemini-ийн VAD-д сонссоноо дуусгахыг мэдэгдэнэ. */
  | { type: 'mic_off' }
  /** Push-to-talk (`?ptt=1`): хүүхэд товч дарж ярьж эхэллээ / суллалаа: баавгай суллахад хариулна. */
  | { type: 'talk_start' }
  | { type: 'talk_end' }
  /** Хүүхэд "Тасал" дарлаа: энэ ээлжийн үлдсэн яриаг (TTS) үүсгэхээ болино; ээлжийн төгсгөлд turn_end ирнэ. */
  | { type: 'interrupt' };

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
  /** done = баавгай бодлогыг тайлбарлаж дуусгаад баяртай гэсэн. */
  | { type: 'end'; reason: 'time' | 'done' | 'error'; message?: string };

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

/** GET /dashboard/stats?days=30 — нийтэд нээлттэй dashboard (/dashboard). Зөвхөн нэгтгэсэн тоо; өдрүүд UB цагаар. */
export interface DashboardStatsResponse {
  /** UB өдөр, 'YYYY-MM-DD' */
  today: string;
  generatedAt: number;
  totals: {
    users: number;
    /** Сүүлийн 7 / 30 өдөрт (өнөөдрийг оруулаад) дор хаяж нэг удаа орсон хүн */
    active7d: number;
    active30d: number;
  };
  /** Хуучнаас шинэ рүү, `days` урттай; сүүлийнх нь өнөөдөр. */
  daily: Array<{
    day: string;
    signups: number;
    /** Тэр өдөр апп ашигласан хүн */
    active: number;
    /** active-ийн дотроос өмнөх өдрүүдэд бүртгүүлсэн нь */
    returning: number;
    /** Тэр өдөр эхэлж дуусгасан даалгавар */
    tasks: number;
    /** Дууссан тулаан */
    duels: number;
    /** Баавгайтай ярилцсан удаа */
    tutor: number;
  }>;
  grades: Array<{ grade: number; users: number; activeToday: number }>;
}

export interface BookOcrResponse {
  model: string;
  pages: Array<{ seq: number; sha256: string; text: string }>;
}
