/**
 * wrangler types-ийн Env + заавал биш утгууд:
 * - GEMINI_API_KEY, ADMIN_TOKEN: .dev.vars эсвэл `wrangler secret put`
 * - GEMINI_TUTOR_API_KEY: баавгайн төлбөртэй түлхүүр; байхгүй бол GEMINI_API_KEY
 * - PAYMENT_PROVIDER: төлбөрийн систем (payments/provider.ts). Хоосон бол худалдан авалт хаалттай
 * - PAYMENT_TEST_AMOUNT: тавьсан үед admin-ий нэхэмжлэл энэ дүнтэй (жинхэнэ мөнгөөр бага дүнгээр турших)
 * - WIRE_SECRET_KEY (sk_live_…), WIRE_WEBHOOK_SECRET (whsec_…): Wire төлбөрийн систем, `wrangler secret put`
 * - AI: зөвхөн `--env ai` орчинд (Workers AI)
 */
export type Bindings = Omit<Env, 'GEMINI_API_KEY' | 'ADMIN_TOKEN' | 'AI'> & {
  GEMINI_API_KEY?: string;
  GEMINI_TUTOR_API_KEY?: string;
  ADMIN_TOKEN?: string;
  PAYMENT_PROVIDER?: string;
  WIRE_SECRET_KEY?: string;
  PAYMENT_TEST_AMOUNT?: string;
  WIRE_WEBHOOK_SECRET?: string;
  AI?: Ai;
};

export type AppEnv = {
  Bindings: Bindings;
  Variables: { userId: number };
};
