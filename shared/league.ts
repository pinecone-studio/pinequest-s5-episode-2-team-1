// Уулын Лиг (docs/design/clan-league.md): ижил ангийн Уулууд долоо хоног бүр өрсөлдөнө. API ба апп нэг эх.

/** Доороос дээш: ой → тайга → нуруу → оргил. key нь лигийн тэмдгийн sprite (league_<key>). */
export const LEAGUE_TIERS = [
  { tier: 1, key: 'terelj', name: 'Тэрэлж' },
  { tier: 2, key: 'khentii', name: 'Хэнтий' },
  { tier: 3, key: 'khuvsgul', name: 'Хөвсгөл' },
  { tier: 4, key: 'khangai', name: 'Хангай' },
  { tier: 5, key: 'otgontenger', name: 'Отгонтэнгэр' },
  { tier: 6, key: 'khuiten', name: 'Хүйтэн оргил' },
] as const;

export type LeagueTierKey = (typeof LEAGUE_TIERS)[number]['key'];

export const LEAGUE = {
  /** Лигт орох (5 хүний бүрэлдэхүүн гаргах) доод гишүүн */
  MIN_MEMBERS: 5,
  /** Бүлгийн дээд хэмжээ (одоогоор нэг бүлэг = нэг лиг × нэг анги) */
  GROUP_MAX: 10,
  /** Өөр Уулын картанд харагдах нэргүй баавгайн хөрөг */
  LOOKS: 5,
} as const;

export const leagueTitle = (tier: number) => `${LEAGUE_TIERS[tier - 1]?.name ?? LEAGUE_TIERS[0].name} лиг`;
