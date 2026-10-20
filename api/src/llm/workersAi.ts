import type { Bindings } from '../env';
import { LlmError, QUESTIONS_JSON_SCHEMA } from './types';
import { parseJsonLoose } from './validate';

/** Workers AI (JSON Mode). AI binding зөвхөн `npm run dev:ai` / `--env ai` орчинд байна. */
export async function workersAiGenerate(env: Pick<Bindings, 'AI' | 'WORKERS_AI_MODEL'>, system: string, user: string): Promise<unknown> {
  if (!env.AI) throw new LlmError('workers-ai', 0, 'AI binding алга (`npm run dev:ai`)');
  const model = env.WORKERS_AI_MODEL || '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
  const run = env.AI.run.bind(env.AI) as unknown as (model: string, input: unknown) => Promise<{ response?: unknown }>;
  const out = await run(model, {
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    response_format: { type: 'json_schema', json_schema: QUESTIONS_JSON_SCHEMA },
    max_tokens: 4096,
  });
  const r = out?.response;
  if (r === undefined || r === null || r === '') throw new LlmError('workers-ai', 502, 'хоосон хариу');
  return typeof r === 'string' ? parseJsonLoose(r) : r;
}
