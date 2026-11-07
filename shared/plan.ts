// Төлбөрийн багц. Сервер (users.plan) ба апп хоёулаа эндээс уншина.
export const PLANS = ['free', 'plus', 'max'] as const;
export type Plan = (typeof PLANS)[number];

/** Апп-д харуулах нэр. */
export const PLAN_NAMES: Record<Plan, string> = { free: 'Үнэгүй', plus: 'KUMA Plus', max: 'KUMA Max' };
