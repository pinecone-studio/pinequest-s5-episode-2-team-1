// Төлбөрийн багц. Сервер (users.plan) ба апп хоёулаа эндээс уншина.
export const PLANS = ['free', 'plus', 'max'] as const;
export type Plan = (typeof PLANS)[number];

/** Баавгай багштай өдөрт ярилцах бодлогын тоо. API-ийн GAME.TUTOR.DAILY_SESSIONS, апп-ын багцын дэлгэц хоёулаа эндээс. */
export const PLAN_TUTOR_DAILY: Record<Plan, number> = { free: 1, plus: 10, max: 10 };

/** Апп-д харуулах нэр. */
export const PLAN_NAMES: Record<Plan, string> = { free: 'Үнэгүй', plus: 'KUMA Plus', max: 'KUMA Max' };
