// Асуулт үүсгэх LLM дуудлагууд зөвхөн энэ модульд. Provider-ийг LLM_PROVIDER-оор сонгоно;
// хоосон бол GEMINI_API_KEY байвал Gemini, үгүй бол Workers AI.
import type { Subject, Tier } from '../config/game';
import { topicIds } from '../config/topics';
import type { Bindings } from '../env';
import type { Excerpt } from '../services/grounding';
import { geminiGenerate } from './gemini';
import { buildPrompt } from './prompt';
import { LlmError, type LlmProvider, type QuestionDraft } from './types';
import { type Rejection, validateDrafts } from './validate';
import { workersAiGenerate } from './workersAi';

export type LlmEnv = Pick<Bindings, 'LLM_PROVIDER' | 'GEMINI_API_KEY' | 'GEMINI_MODEL' | 'GEMINI_THINKING_LEVEL' | 'AI' | 'WORKERS_AI_MODEL'>;

/** Ашиглаж болох provider, эсвэл null (тохируулаагүй). */
export function pickProvider(env: LlmEnv): LlmProvider | null {
  const chosen = env.LLM_PROVIDER?.trim();
  if (chosen === 'gemini') return env.GEMINI_API_KEY ? 'gemini' : null;
  if (chosen === 'workers-ai') return env.AI ? 'workers-ai' : null;
  if (env.GEMINI_API_KEY) return 'gemini';
  if (env.AI) return 'workers-ai';
  return null;
}

export function sourceLabel(env: LlmEnv, provider: LlmProvider): string {
  return provider === 'gemini' ? `gemini:${env.GEMINI_MODEL}` : `workers-ai:${env.WORKERS_AI_MODEL}`;
}

export async function generateQuestions(
  env: LlmEnv,
  tier: Tier,
  subject: Subject,
  count: number,
  avoid: string[] = [],
  excerpt: Excerpt | null = null,
): Promise<{ drafts: QuestionDraft[]; rejected: Rejection[]; source: string }> {
  const provider = pickProvider(env);
  if (!provider) throw new LlmError(env.LLM_PROVIDER === 'workers-ai' ? 'workers-ai' : 'gemini', 0, 'LLM тохируулаагүй');
  const { system, user } = buildPrompt(tier, subject, count, avoid, excerpt);
  const raw = provider === 'gemini' ? await geminiGenerate(env, { system, user }) : await workersAiGenerate(env, system, user);
  const { drafts, rejected } = validateDrafts(raw, undefined, topicIds(tier, subject));
  return { drafts, rejected, source: sourceLabel(env, provider) };
}
