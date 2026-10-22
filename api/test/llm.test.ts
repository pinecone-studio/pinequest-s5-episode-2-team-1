import { afterEach, describe, expect, it } from 'vitest';
import { SUBJECTS, TIERS } from '../src/config/game';
import { TOPICS, topicIds } from '../src/config/topics';
import { pickProvider } from '../src/llm';
import { geminiGenerate, resetGeminiVariant } from '../src/llm/gemini';
import { buildPrompt } from '../src/llm/prompt';
import { parseJsonLoose, promptKey, shuffleOptions, validateDrafts } from '../src/llm/validate';

const good = (over: Record<string, unknown> = {}) => ({
  prompt: '2 + 3 хэдтэй тэнцүү вэ?',
  options: ['5', '6', '4', '23'],
  solution: '2 + 3 = 5',
  correctIndex: 0,
  explanation: 'Хоёр дээр гурвыг нэмбэл тав.',
  ...over,
});

describe('validateDrafts', () => {
  it('зөв бүтэцтэйг хүлээж авч, solution-ыг хасна', () => {
    const { drafts, rejected } = validateDrafts({ questions: [good()] });
    expect(rejected).toEqual([]);
    expect(drafts).toHaveLength(1);
    expect(Object.keys(drafts[0]).sort()).toEqual(['correctIndex', 'explanation', 'options', 'prompt']);
  });

  it('сонголтуудыг холиход зөв хариултын текст хэвээр', () => {
    for (let i = 0; i < 20; i++) {
      const [d] = validateDrafts({ questions: [good()] }).drafts;
      expect(d.options[d.correctIndex]).toBe('5');
      expect([...d.options].sort()).toEqual(['23', '4', '5', '6']);
    }
  });

  it('буруу бүтэцтэйг хаяна', () => {
    const { drafts, rejected } = validateDrafts({
      questions: [
        good({ options: ['1', '2', '3'] }),
        good({ correctIndex: 4 }),
        good({ correctIndex: 1.5 }),
        good({ options: ['5', '5', '4', '3'] }),
        good({ prompt: 'What is 2 + 3?' }),
        good({ explanation: '' }),
        good({ explanation: 'Уран зохиolyn төрөл.' }),
        good({ options: ['5', '6', '4', '9 дахин ихсэнە'] }),
        { prompt: 'Асуулт?' },
        'string',
      ],
    });
    expect(drafts).toHaveLength(0);
    expect(rejected).toHaveLength(10);
  });

  it('багц доторх давхардлыг (зай, том жижиг үсэг ялгаагүй) хаяна', () => {
    const { drafts, rejected } = validateDrafts({ questions: [good(), good({ prompt: '2 + 3  хэдтэй ТЭНЦҮҮ вэ' })] });
    expect(drafts).toHaveLength(1);
    expect(rejected[0].reason).toBe('duplicate in batch');
  });

  it('физикийн "Eп", "Eк", грек α, Ω тэмдэглэгээг зөвшөөрнө', () => {
    const { drafts } = validateDrafts([good({ explanation: 'Eп = m · g · h, sin α, R = 4 Ω тул 200 Ж.' })]);
    expect(drafts).toHaveLength(1);
  });

  it('"A) " гэх мэт угтварыг сонголтоос авч хаяна', () => {
    const [d] = validateDrafts([good({ options: ['A) 5', 'B) 6', 'C) 4', 'D) 23'] })], () => 0.999).drafts;
    expect([...d.options].sort()).toEqual(['23', '4', '5', '6']);
  });

  it('questions массив байхгүй бол бүгд татгалзана', () => {
    expect(validateDrafts({ foo: 1 }).drafts).toEqual([]);
    expect(validateDrafts(null).rejected[0].reason).toBe('no questions array');
  });
});

describe('сэдэв (topic)', () => {
  it('жагсаалтад байгаа сэдвийг хадгалж, байхгүйг нь сэдэвгүй үлдээнэ', () => {
    const { drafts, rejected } = validateDrafts(
      { questions: [good({ topic: 'percent' }), good({ prompt: '7 − 4 хэд вэ?', topic: 'quantum' }), good({ prompt: '9 : 3 хэд вэ?' })] },
      undefined,
      topicIds(1, 'math'),
    );
    expect(rejected).toEqual([]);
    expect(drafts.map((d) => d.topic)).toEqual(['percent', undefined, undefined]);
  });

  it('түвшин, хичээл бүрт давхардаагүй id-тай, prompt нь id-уудыг жагсаана', () => {
    for (const tier of TIERS) {
      for (const subject of SUBJECTS) {
        const ids = topicIds(tier, subject);
        expect(ids.length).toBeGreaterThan(0);
        expect(new Set(ids).size).toBe(ids.length);
        expect(ids.every((id) => /^[a-z_]+$/.test(id))).toBe(true);
        const { user } = buildPrompt(tier, subject, 3, []);
        expect(TOPICS[tier][subject].every((t) => user.includes(`${t.id} = ${t.name}`))).toBe(true);
      }
    }
  });
});

describe('туслах функцүүд', () => {
  it('promptKey', () => {
    expect(promptKey('  2 + 3  ХЭДТЭЙ тэнцүү вэ? ')).toBe('2 + 3 хэдтэй тэнцүү вэ');
  });

  it('shuffleOptions тогтмол rng-ээр', () => {
    const d = shuffleOptions({ prompt: 'x', options: ['a', 'b', 'c', 'd'], correctIndex: 2, explanation: 'y' }, () => 0);
    expect(d.options[d.correctIndex]).toBe('c');
  });

  it('parseJsonLoose: ```json хүрээ болон илүү текст', () => {
    expect(parseJsonLoose('```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(parseJsonLoose('Энд байна: {"a":2} за')).toEqual({ a: 2 });
    expect(() => parseJsonLoose('json биш')).toThrow();
  });
});

describe('provider сонголт', () => {
  const base = { LLM_PROVIDER: '', GEMINI_MODEL: 'g', GEMINI_THINKING_LEVEL: 'low', WORKERS_AI_MODEL: 'w' };
  const ai = {} as Ai;

  it('хоосон үед GEMINI_API_KEY → gemini, үгүй бол Workers AI, аль нь ч үгүй бол null', () => {
    expect(pickProvider({ ...base, GEMINI_API_KEY: 'k' })).toBe('gemini');
    expect(pickProvider({ ...base, AI: ai })).toBe('workers-ai');
    expect(pickProvider({ ...base })).toBeNull();
  });

  it('LLM_PROVIDER-оор албадна', () => {
    expect(pickProvider({ ...base, LLM_PROVIDER: 'workers-ai', GEMINI_API_KEY: 'k', AI: ai })).toBe('workers-ai');
    expect(pickProvider({ ...base, LLM_PROVIDER: 'gemini', AI: ai })).toBeNull();
  });
});

describe('prompt', () => {
  it('анги, хичээл, сэдэв, давхардуулахгүй жагсаалт, жишээ орно', () => {
    const { system, user } = buildPrompt(2, 'physics', 5, ['Хуучин асуулт?']);
    expect(system).toContain('Mongolian');
    expect(user).toContain('8–9-р анги');
    expect(user).toContain('Физик');
    expect(user).toContain('Омын хууль');
    expect(user).toContain('Хуучин асуулт?');
    expect(user).toContain('Example');
  });
});

describe('Gemini REST', () => {
  afterEach(() => resetGeminiVariant());
  const env = { GEMINI_API_KEY: 'test-key', GEMINI_MODEL: 'gemini-3.8-flash', GEMINI_THINKING_LEVEL: 'low' };
  const okBody = {
    candidates: [
      {
        content: { parts: [{ text: 'бодож байна…', thought: true }, { text: JSON.stringify({ questions: [good()] }) }] },
        finishReason: 'STOP',
      },
    ],
  };

  it('schema, systemInstruction, thinkingLevel илгээж, thought хэсгийг алгасна', async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const fake = (async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response(JSON.stringify(okBody), { status: 200 });
    }) as unknown as typeof fetch;

    const out = await geminiGenerate(env, { system: 'SYS', user: 'USER' }, { fetchImpl: fake });
    expect(out).toEqual({ questions: [good()] });
    expect(calls[0].url).toContain('/models/gemini-3.8-flash:generateContent');
    const headers = calls[0].init.headers as Record<string, string>;
    expect(headers['x-goog-api-key']).toBe('test-key');
    const body = JSON.parse(String(calls[0].init.body));
    expect(body.systemInstruction.parts[0].text).toBe('SYS');
    expect(body.generationConfig.responseJsonSchema.properties.questions.items.required).toContain('solution');
    expect(body.generationConfig.thinkingConfig).toEqual({ thinkingLevel: 'low' });
  });

  it('хавсралт файлыг inline_data-аар, өөр schema ба maxOutputTokens-ийг дамжуулна', async () => {
    let body: { contents: Array<{ parts: unknown[] }>; generationConfig: Record<string, unknown> } | null = null;
    const fake = (async (_url: string, init: RequestInit) => {
      body = JSON.parse(String(init.body));
      return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"pages":[]}' }] } }] }), { status: 200 });
    }) as unknown as typeof fetch;
    const schema = { type: 'object', properties: { pages: { type: 'array' } } };
    const out = await geminiGenerate(
      env,
      { system: 's', user: 'u', files: [{ mimeType: 'application/pdf', data: 'QUJD' }], schema, maxOutputTokens: 32768 },
      { fetchImpl: fake },
    );
    expect(out).toEqual({ pages: [] });
    expect(body!.contents[0].parts).toEqual([{ inline_data: { mime_type: 'application/pdf', data: 'QUJD' } }, { text: 'u' }]);
    expect(body!.generationConfig.maxOutputTokens).toBe(32768);
    expect(JSON.stringify(body!.generationConfig)).toContain('"pages"');
  });

  it('400 бол дараагийн хүсэлтийн хэлбэрийг туршаад ажилласныг санана', async () => {
    const seen: string[] = [];
    const fake = (async (_url: string, init: RequestInit) => {
      const cfg = JSON.parse(String(init.body)).generationConfig;
      const variant = cfg.responseJsonSchema ? 'jsonSchema' : cfg.responseFormat ? 'responseFormat' : 'mime';
      seen.push(variant);
      if (variant === 'jsonSchema') return new Response('{"error":{"message":"Unknown name"}}', { status: 400 });
      return new Response(JSON.stringify(okBody), { status: 200 });
    }) as unknown as typeof fetch;

    await geminiGenerate(env, { system: 's', user: 'u' }, { fetchImpl: fake });
    await geminiGenerate(env, { system: 's', user: 'u' }, { fetchImpl: fake });
    expect(seen).toEqual(['jsonSchema', 'responseFormat', 'responseFormat']);
  });

  it('429/503 бол retryDelay-ийг хүндэтгэж дахин оролдоно', async () => {
    const statuses = [503, 429, 200];
    let calls = 0;
    const fake = (async () => {
      const status = statuses[calls++];
      if (status === 200) return new Response(JSON.stringify(okBody), { status });
      return new Response(JSON.stringify({ error: { details: [{ retryDelay: '0.01s' }] } }), { status });
    }) as unknown as typeof fetch;
    const out = await geminiGenerate(env, { system: 's', user: 'u' }, { fetchImpl: fake, baseDelayMs: 1 });
    expect(out).toEqual({ questions: [good()] });
    expect(calls).toBe(3);
  });

  it('оролдлого дуусвал 429-ийг алдаагаар буцаана', async () => {
    let calls = 0;
    const fake = (async () => {
      calls++;
      return new Response('RESOURCE_EXHAUSTED', { status: 429 });
    }) as unknown as typeof fetch;
    await expect(geminiGenerate(env, { system: 's', user: 'u' }, { fetchImpl: fake, attempts: 2, baseDelayMs: 1 })).rejects.toThrow(/429/);
    expect(calls).toBe(2);
  });

  it('түлхүүргүй бол дуудахгүй', async () => {
    await expect(geminiGenerate({ ...env, GEMINI_API_KEY: undefined }, { system: 's', user: 'u' })).rejects.toThrow(/GEMINI_API_KEY/);
  });
});

describe('mathSignature (ижил бодлого таних)', () => {
  it('үг хэллэг өөр ч ижил илэрхийлэл бол ижил', async () => {
    const { mathSignature } = await import('../src/services/pool');
    expect(mathSignature('2.4 : 0.6 + 1.5 үйлдлийг гүйцэтгээрэй.')).toBe(mathSignature('2.4 : 0.6 + 1.5 илэрхийллийн утгыг олоорой.'));
    expect(mathSignature('5x - 8 = 22 тэгшитгэлийг бодоорой.')).toBe('5x-8=22');
    expect(mathSignature('5x - 8 = 22 тэгшитгэлийг бодоорой.')).not.toBe(mathSignature('5x - 8 = 27 тэгшитгэлийг бодоорой.'));
  });

  it('тоогүй эсвэл хэт богино бол null (монгол хэлний асуулт, "16 ба 24")', async () => {
    const { mathSignature } = await import('../src/services/pool');
    expect(mathSignature('"Үнэнч" гэдэг үгтэй ойролцоо утгатай үг аль вэ?')).toBeNull();
    expect(mathSignature('16 ба 24 тоонуудын ХИЕХ-ийг олоорой.')).toBeNull();
  });
});
