const DAY_MS = 24 * 60 * 60_000;

/** Нэвтрэлт, session, оролдлогын хязгаар. GAME.AUTH-аар уншина. */
export const AUTH = {
  /** Workers-ийн Web Crypto PBKDF2-ийн дээд хязгаар. */
  PBKDF2_ITERATIONS: 100_000,
  USERNAME_MIN: 3,
  USERNAME_MAX: 20,
  PASSWORD_MIN: 6,
  PASSWORD_MAX: 72,
  /** Session ийм хугацаанд ашиглагдаагүй бол хүчингүй (sliding): идэвхтэй хүүхэд гарахгүй, хаягдсан token үхнэ. */
  SESSION_IDLE_MS: 60 * DAY_MS,
  /** Ашиглагдсан session-ийг хамгийн ихдээ ийм давтамжтай сунгана: хүсэлт бүрт DB-д бичихгүй. */
  SESSION_RENEW_MS: DAY_MS,
  /** Нэвтрэх, бүртгүүлэх оролдлого (services/authLimits): WINDOW_MS-д түлхүүр бүрийн дээд тоо. */
  LIMIT: {
    WINDOW_MS: 15 * 60_000,
    /** Нэг нэрийн буруу нууц үг: таах оролдлогыг минутад ~1 болгоно. */
    USER_FAILS: 10,
    /** Нэг сүлжээний буруу нууц үг: сургуулийн нэг Wi-Fi-аас анги бүхэлдээ алдсан ч хүрэлцэнэ. */
    NETWORK_FAILS: 100,
    /** Нэг сүлжээнээс шинэ бүртгэл: анги бүхэлдээ нэг дор бүртгүүлэхэд хүрэлцэнэ. */
    NETWORK_SIGNUPS: 60,
  },
} as const;
