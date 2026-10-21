// Тоглоомын бүх тогтмол энд төвлөрнө. Логик эдгээрээс л уншина.

export const SUBJECTS = ['math', 'mongolian', 'physics'] as const;
export type Subject = (typeof SUBJECTS)[number];

export const TIERS = [1, 2, 3] as const;
export type Tier = (typeof TIERS)[number];

export const GAME = {
  /** Шинэ хэрэглэгчийн эхлэх оноо (шууд тулалдаж болохоор). */
  START_POINTS: 50,

  XP_PER_CORRECT: 10,
  /** level = floor(xp / XP_PER_LEVEL) + 1 */
  XP_PER_LEVEL: 100,

  /** Зөв хариулт бүрийн суурь оноо; streak үржвэрээр үржигдэнэ. */
  POINTS_PER_CORRECT: 10,
  /** Үржвэр = min(1 + STEP × (streak − 1), MAX) */
  STREAK_MULT_STEP: 0.1,
  STREAK_MULT_MAX: 2.0,

  QUESTIONS_PER_TASK: 5,
  OPTIONS_PER_QUESTION: 4,
  DAILY_TASK_LIMIT: 10,

  /** Өдрийг Asia/Ulaanbaatar (UTC+8, DST байхгүй) цагаар тоолно. */
  TZ_OFFSET_MINUTES: 8 * 60,

  GRADE_MIN: 6,
  GRADE_MAX: 10,
  /** Анги → түвшин */
  GRADE_TO_TIER: { 6: 1, 7: 1, 8: 2, 9: 2, 10: 3 } as Record<number, Tier>,

  SHIELD: {
    PRICE: 50,
    MAX_HELD: 1,
    /** Сүүлд авснаас хойш дахин авахад өнгөрөх ёстой хоног. */
    COOLDOWN_DAYS: 7,
  },

  DUEL: {
    QUESTIONS: 3,
    QUESTION_MS: 20_000,
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

  AUTH: {
    /** Workers-ийн Web Crypto PBKDF2-ийн дээд хязгаар. */
    PBKDF2_ITERATIONS: 100_000,
    USERNAME_MIN: 3,
    USERNAME_MAX: 20,
    PASSWORD_MIN: 6,
    PASSWORD_MAX: 72,
  },
} as const;

/** Бүртгүүлэхэд өмсгөх үнэгүй (price = 0) эд зүйлс. */
export const DEFAULT_EQUIPPED = {
  skin: 'skin_light',
  hair: 'hair_short_black',
  top: 'top_tshirt_blue',
  bottom: 'bottom_pants_navy',
  shoes: 'shoes_sneakers_white',
} as const;
