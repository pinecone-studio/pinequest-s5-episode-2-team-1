/**
 * wrangler types-ийн Env + заавал биш утгууд:
 * - GEMINI_API_KEY, ADMIN_TOKEN: .dev.vars эсвэл `wrangler secret put`
 * - GEMINI_TTS_API_KEY: баавгайн TTS-д тусдаа (billing-тэй) түлхүүр; үгүй бол GEMINI_API_KEY
 * - TUTOR_SPEECH: баавгайн дууны горим ('tts' | 'live'); үгүй бол GAME.TUTOR.SPEECH
 * - JUDGE_LOGIN: 'on' бол шүүгчийн нэвтрэлт (POST /auth/judge) нээлттэй
 * - AI: зөвхөн `--env ai` орчинд (Workers AI)
 */
export type Bindings = Omit<Env, 'GEMINI_API_KEY' | 'GEMINI_TTS_API_KEY' | 'TUTOR_SPEECH' | 'JUDGE_LOGIN' | 'ADMIN_TOKEN' | 'AI'> & {
  GEMINI_API_KEY?: string;
  GEMINI_TTS_API_KEY?: string;
  TUTOR_SPEECH?: string;
  JUDGE_LOGIN?: string;
  ADMIN_TOKEN?: string;
  AI?: Ai;
};

export type AppEnv = {
  Bindings: Bindings;
  Variables: { userId: number };
};
