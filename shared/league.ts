// Анги tab: миний анги ба ижил ангийн бусад ангитай энэ 7 хоногийн эрэмбэ. 1-р байр эзэлсэн анги дараагийн лиг рүү
// дэвшинэ (доош буухгүй). API ба апп нэг эх.

/**
 * Доороос дээш: модон бамбайгаас тэнгэрийн очир хүртэл. key нь лигийн тэмдгийн sprite (league_<key>_32x32 / _64x64),
 * DB-д зөвхөн дугаар (clans.league_tier) хадгалагдана.
 */
export const LEAGUE_TIERS = [
  { tier: 1, key: 'wood', name: 'Ойн Дайчин' },
  { tier: 2, key: 'stone', name: 'Хадан Бамбай' },
  { tier: 3, key: 'bronze', name: 'Хүрэл Баатар' },
  { tier: 4, key: 'silver', name: 'Мөнгөн Сүлд' },
  { tier: 5, key: 'gold', name: 'Алтан Аварга' },
  { tier: 6, key: 'diamond', name: 'Тэнгэрийн Очир' },
] as const;

/** 1–6 → лиг (хүрээнээс гарвал хамгийн ойрынх). */
export const leagueTier = (tier: number) => LEAGUE_TIERS[Math.min(Math.max(tier, 1), LEAGUE_TIERS.length) - 1];

export const LEAGUE = {
  /** Эрэмбэд харуулах ангийн дээд тоо (миний анги үргэлж орно) */
  GROUP_MAX: 10,
  /** Өөр ангийн картанд харагдах нэргүй баавгайн хөрөг */
  LOOKS: 5,
  /** Уралдааныг харж болох ангиуд (GAME.GRADE_MIN–MAX) */
  GRADES: [6, 7, 8, 9, 10, 11, 12],
} as const;

export type RaceStatus = { kind: 'alone' } | { kind: 'lead'; gap: number } | { kind: 'chase'; rank: number; need: number };

/** Миний ангийн уралдаан: тэргүүлж байвал 2-р байраас хэдэн XP илүү, үгүй бол дээд ангийг давахад хэдэн XP дутуу. */
export function raceStatus(standings: { rank: number; weekXp: number; isMine: boolean }[]): RaceStatus | null {
  const i = standings.findIndex((c) => c.isMine);
  if (i < 0) return null;
  if (standings.length < 2) return { kind: 'alone' };
  const me = standings[i];
  if (i === 0) return { kind: 'lead', gap: me.weekXp - standings[1].weekXp };
  const above = standings[i - 1];
  // XP тэнцвэл нийт XP-ээр эрэмбэлдэг тул давахад 1 XP илүү хэрэгтэй
  return { kind: 'chase', rank: above.rank, need: above.weekXp - me.weekXp + 1 };
}
