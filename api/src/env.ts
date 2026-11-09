/**
 * wrangler types-ийн Env + заавал биш утгууд:
 * - GEMINI_API_KEY, ADMIN_TOKEN: .dev.vars эсвэл `wrangler secret put`
 * - GEMINI_TUTOR_API_KEY: баавгайн төлбөртэй түлхүүр; байхгүй бол GEMINI_API_KEY
 * - PAYMENT_PROVIDER: төлбөрийн систем (payments/provider.ts). Хоосон бол худалдан авалт хаалттай
 * - AI: зөвхөн `--env ai` орчинд (Workers AI)
 */
export type Bindings = Omit<Env, 'GEMINI_API_KEY' | 'ADMIN_TOKEN' | 'AI'> & {
  GEMINI_API_KEY?: string;
  GEMINI_TUTOR_API_KEY?: string;
  ADMIN_TOKEN?: string;
  PAYMENT_PROVIDER?: string;
  AI?: Ai;
};

export type AppEnv = {
  Bindings: Bindings;
  Variables: { userId: number };
};
