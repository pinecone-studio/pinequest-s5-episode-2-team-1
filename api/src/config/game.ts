import { CLAN_CODE_LENGTH, CLAN_MAX_MEMBERS } from '../../../shared/clan';
import { GATE_COUNT, UNITS } from '../../../shared/path';
import { AUTH } from './auth';
import { TUTOR } from './tutor';

// Тоглоомын бүх тогтмол энд төвлөрнө. Логик эдгээрээс л уншина.

export const SUBJECTS = ['math', 'mongolian', 'physics', 'social', 'english'] as const;
export type Subject = (typeof SUBJECTS)[number];

/** Шинэ public урсгалууд зөвхөн эдгээрийг авна. */
export const ACTIVE_SUBJECTS = ['math', 'mongolian', 'physics', 'social', 'english'] as const;
/** Монгол хэлийг тулаанаас тусдаа нуусан. */
export const DUEL_SUBJECTS = ['math'] as const;

export const TIERS = [1, 2, 3] as const;
export type Tier = (typeof TIERS)[number];

export const GAME = {
  /** Шинэ хэрэглэгчийн эхлэх оноо (шууд тулалдаж болохоор). */
  START_POINTS: 50,

  XP_PER_CORRECT: 10,
  /** level = floor(xp / XP_PER_LEVEL) + 1 */
  XP_PER_LEVEL: 100,
  /** Сурах замын ердийн даалгаварт ийм олон зөв бол дараагийн зангилаа нээгдэнэ (XP-ийн үлдэгдэл тооцохгүй). */
  PATH_PASS_CORRECT: 4,

  /** Зөв хариулт бүрийн суурь оноо; streak үржвэрээр үржигдэнэ. */
  POINTS_PER_CORRECT: 10,
  /** Үржвэр = min(1 + STEP × (streak − 1), MAX) */
  STREAK_MULT_STEP: 0.1,
  STREAK_MULT_MAX: 2.0,

  QUESTIONS_PER_TASK: 5,
  OPTIONS_PER_QUESTION: 4,
  /** Даалгаврын 5 асуулт дуусахад үүнээс цөөнгүй алдсан бол нөхөх салаа зам нээгдэнэ. */
  RECOVERY_MIN_WRONG: 2,
  /** Давтлагын нийт асуулт: алдааны тооноос үл хамааран тэр зангилааны хичээлийн (номгүй бол хамгийн их алдсан нэг
   * сэдвийн) өөр асуулт; хүрэлцэхгүй бол алдсан асуултаа давтана. */
  RECOVERY_PRACTICE: 3,
  /** Өнөөдрийн хичээл: өмнө хийсэн хичээлээс давтах бодлогын тоо. */
  REVIEW_QUESTIONS: 3,
  /** Өнөөдрийн хичээлийг хичээл бүрт өдөрт хэд дуусгаж болох вэ (амь зарцуулдаггүй тул оноо цуглуулах хязгаар). */
  REVIEW_PER_DAY: 1,
  /** Салаа замын нэг асуултад ингэж олон буруу хариулбал зөв хариу, тайлбарыг үзүүлж ижил сэдвийн өөр асуултаар солино. */
  RECOVERY_MAX_MISSES: 2,

  /** Өдрийг Asia/Ulaanbaatar (UTC+8, DST байхгүй) цагаар тоолно. */
  TZ_OFFSET_MINUTES: 8 * 60,

  GRADE_MIN: 6,
  GRADE_MAX: 12,
  /** Анги → түвшин */
  GRADE_TO_TIER: { 6: 1, 7: 1, 8: 2, 9: 2, 10: 3, 11: 3, 12: 3 } as Record<number, Tier>,

  SHIELD: {
    PRICE: 50,
    MAX_HELD: 1,
    /** Сүүлд авснаас хойш дахин авахад өнгөрөх ёстой хоног. */
    COOLDOWN_DAYS: 7,
  },

  /** Адал явдлын газрын зураг (mobile/src/lib/pixelBear/world.json-тэй ижил): бүлэг бүрийн сүүлийн зангилаа boss. */
  BOSS: {
    COUNT: UNITS,
    /** Дарааллаар давах тулааны хаалганы тоо (shared/path.ts gateNodes) */
    GATES: GATE_COUNT,
  },

  DUEL: {
    QUESTIONS: 3,
    QUESTION_MS: 30_000,
    REVEAL_MS: 2_000,
    /** Хоёулаа холбогдсоны дараах 3-2-1. */
    COUNTDOWN_MS: 3_000,
    /** Хүлээн авснаас хойш хоёулаа холбогдох хугацаа; үгүй бол цуцалж буцаана. */
    CONNECT_TIMEOUT_MS: 30_000,
    /** Тоглолтын дунд үүнээс удаан салсан тоглогч хожигдоно. */
    DISCONNECT_GRACE_MS: 10_000,
    /** Бооцоо ≤ одоогийн онооны 20% (бүхэл тоонд доош тоймлоно). */
    STAKE_MAX_PERCENT: 20,
    STAKE_MIN: 1,
    /** Үүнээс удаан "accepted" төлөвт гацсан тулааныг цуцалж бооцоог буцаана. */
    STALE_ACCEPTED_MS: 10 * 60_000,
    /** Урилгын кодын орон (зөвхөн цифр). */
    CODE_LENGTH: 6,
    /** Үүсгэгч лобби-гоо (3 сек тутам poll) үүнээс удаан нээгээгүй бол сорилт нь бусдын лобби дээр харагдахгүй. */
    LOBBY_PRESENCE_MS: 15_000,
    /** Үүсгэгч үүнээс удаан алга бол нээлттэй сорилтыг цуцална (кодоор ч орохгүй). Оноо хөдлөхгүй. */
    OPEN_TTL_MS: 10 * 60_000,
    /** Багийн хэмжээ: 1 = 1 vs 1, 5 = 5 vs 5. */
    TEAM_SIZE_MAX: 5,
    /** Багийн тулаанд хүн бүр хариулдаг тул арай олон асуулт. */
    TEAM_QUESTIONS: 5,
  },

  PROFILE: {
    /** Профайлын кодын орон (зөвхөн цифр; тулааны 6 оронтой кодтой андуурагдахгүй). */
    CODE_LENGTH: 8,
  },

  FRIENDS: {
    /** Нэг хүүхдийн найз ба хүлээгдэж буй хүсэлтийн нийт дээд тоо (хүсэлтээр spam хийхээс сэргийлнэ). */
    MAX: 100,
  },

  CLAN: {
    /** Нэг Ууланд хамгийн ихдээ (нэг анги). */
    MAX_MEMBERS: CLAN_MAX_MEMBERS,
    /** Урилгын кодын орон (тулааны кодын адил; профайлын 8 оронтой кодоос ялгагдана). */
    CODE_LENGTH: CLAN_CODE_LENGTH,
  },

  POOL: {
    /** Background нөхөлт нэг удаад үүсгэх асуулт. */
    REFILL_BATCH: 20,
    /** Нэг LLM дуудлагад үүсгэх асуулт (зэрэг дуудна). Free tier-ийн өдрийн хүсэлтийн квотыг хэмнэнэ. */
    LLM_CHUNK: 10,
    /** Хэрэглэгчийн хараагүй асуулт үүнээс цөөрвөл нөхнө. */
    MIN_UNSEEN: 15,
    /** (түвшин, хичээл)-ийн нийт идэвхтэй асуулт үүнээс цөөрвөл нөхнө. */
    MIN_TOTAL: 30,
    /** seed:questions скриптийн зорилтот тоо. */
    SEED_TARGET: 40,
    /** Нэг хослолыг зэрэг нөхөхөөс сэргийлэх түгжээ. */
    LOCK_MS: 3 * 60_000,
    /** Даалгавар эхлэхэд замын хичээлийн асуулт үүсэхийг хүлээх дээд хугацаа; удвал бусад асуултаар эхэлнэ. */
    LESSON_WAIT_MS: 15_000,
  },

  /** Асуулт үүсгэхэд сурах бичгийн сангаас (BOOKS) авах хэсэг. */
  GROUNDING: {
    /** Нэг LLM дуудлагад өгөх дараалсан хуудас. */
    PAGES: 2,
    /** Ийм богино текстгүй хуудас (нүүр, зурагт хуудас) алгасна. */
    MIN_PAGE_CHARS: 400,
    /** Prompt-д орох текстийн дээд урт. */
    MAX_CHARS: 6000,
  },

  /** Амь: бодлогод буруу хариулах бүрт нэг хасагдана, 2 цаг тутамд нэг нөхөгдөнө. */
  LIVES: {
    MAX: 5,
    REGEN_MS: 2 * 60 * 60_000,
  },

  /** Багцын төлбөр: нэг хэрэглэгч цагт хэдэн нэхэмжлэл үүсгэж болох (төлбөрийн систем рүү spam хийлгэхгүй). */
  PAYMENTS: {
    MAX_PER_HOUR: 10,
  },

  TUTOR,
  AUTH,
} as const;

/** Бүртгүүлэхэд өмсгөх үнэгүй (price = 0) эд зүйлс. */
export const DEFAULT_EQUIPPED = {
  skin: 'skin_light',
  hair: 'hair_short_black',
  top: 'top_tshirt_blue',
  bottom: 'bottom_pants_navy',
  shoes: 'shoes_sneakers_white',
} as const;
