import { GAME } from '../config/game';

// Амь: зангилаа руу орох (шинэ даалгавар эхлүүлэх) бүрт нэг хасагдана, REGEN_MS тутамд нэг нөхөгдөнө (MAX хүртэл).
// Амьгүй бол нөхөгдтөл бодлого, давтлага, баавгайтай ярилцах хаалттай. users.lives_at = нөхөгдөлтийн тоолуурын эхлэл.
const { MAX, REGEN_MS } = GAME.LIVES;

export interface Lives {
  lives: number;
  /** нөхөгдөлтийн тоолуур эхэлсэн мөч (ms); дүүрэн бол null */
  at: number | null;
}

/** `now` мөчийн амь: өнгөрсөн REGEN_MS бүрт нэг нэмэгдэнэ. */
export function livesNow(s: Lives, now: number): Lives {
  if (s.lives >= MAX || s.at === null) return { lives: Math.min(s.lives, MAX), at: null };
  const gained = Math.max(0, Math.floor((now - s.at) / REGEN_MS));
  const lives = Math.min(MAX, s.lives + gained);
  return lives >= MAX ? { lives, at: null } : { lives, at: s.at + gained * REGEN_MS };
}

/** Нэг амь зарцуулсны дараах төлөв (`s` = livesNow-ийн үр дүн, lives > 0). Дүүрэн байсан бол тоолуур одоо эхэлнэ. */
export const spendLife = (s: Lives, now: number): Lives => ({ lives: s.lives - 1, at: s.at ?? now });

/** Дараагийн амь нөхөгдөх мөч (ms); дүүрэн бол null. */
export const nextLifeAt = (s: Lives): number | null => (s.at === null ? null : s.at + REGEN_MS);
