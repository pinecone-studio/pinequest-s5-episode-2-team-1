/**
 * wrangler types-ийн Env + заавал биш утгууд:
 * - GEMINI_API_KEY, ADMIN_TOKEN: .dev.vars эсвэл `wrangler secret put`
 * - JUDGE_LOGIN: 'on' бол шүүгчийн нэвтрэлт (POST /auth/judge) нээлттэй
 * - AI: зөвхөн `--env ai` орчинд (Workers AI)
 */
export type Bindings = Omit<Env, 'GEMINI_API_KEY' | 'JUDGE_LOGIN' | 'ADMIN_TOKEN' | 'AI'> & {
  GEMINI_API_KEY?: string;
  JUDGE_LOGIN?: string;
  ADMIN_TOKEN?: string;
  AI?: Ai;
};

export type AppEnv = {
  Bindings: Bindings;
  Variables: { userId: number };
};
