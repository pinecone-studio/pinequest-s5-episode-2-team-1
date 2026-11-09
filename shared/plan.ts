// Төлбөрийн багц. Сервер (users.plan) ба апп хоёулаа эндээс уншина.
export const PLANS = ['free', 'plus', 'max'] as const;
export type Plan = (typeof PLANS)[number];

/** Алдсан бодлогоо AI баавгайгаар өдөрт тайлбарлуулах бодлогын тоо. API-ийн GAME.TUTOR.DAILY_SESSIONS, апп-ын багцын дэлгэц хоёулаа эндээс. */
export const PLAN_TUTOR_DAILY: Record<Plan, number> = { free: 1, plus: 10, max: 10 };

/** Апп-д харуулах нэр. */
export const PLAN_NAMES: Record<Plan, string> = { free: 'Үнэгүй', plus: 'KUMA Plus', max: 'KUMA Max' };

/** Худалдан авч болох багцууд. Max удахгүй нээгдэнэ. */
export const BUYABLE_PLANS = ['plus'] as const;
export type BuyablePlan = (typeof BUYABLE_PLANS)[number];

/** Сарын үнэ (₮). Нэг төлбөр багцыг PLAN_PERIOD_DAYS хоногоор сунгана. */
export const PLAN_PRICE: Record<BuyablePlan, number> = { plus: 15_000 };
export const PLAN_PERIOD_DAYS = 30;

/** Төлбөртэй багц (Plus, Max): хязгааргүй амь, онцгой хувцас, илүү боргоцой. */
export const isPaidPlan = (plan: Plan): boolean => plan !== 'free';

/** Төлбөртэй багцын хичээлийн боргоцойн үржвэр: Үнэгүйгээс илүү, гэхдээ хэт их биш. */
export const PAID_POINTS_MULT = 1.5;

/**
 * Зөвхөн төлбөртэй багцтай хүүхэд авах хувцас (дэлгүүрийн 33-аас хамгийн гоё 13). Mobile catalog OUTFITS-ийн id = API
 * cosmetics-ийн key. Бэлэг хайрцаг эдгээрээс санамсаргүй нэгийг өгнө.
 */
export const PLUS_OUTFITS = [
  'thunder_god',
  'shadow_ninja',
  'pirate_captain',
  'cyborg',
  'night_hero',
  'iron_armor',
  'green_giant',
  'sky_hero',
  'shield_hero',
  'violet_archer',
  'spy_agent',
  'liquid_cop',
  'robot',
] as const;
export const isPlusOutfit = (key: string): boolean => (PLUS_OUTFITS as readonly string[]).includes(key);
