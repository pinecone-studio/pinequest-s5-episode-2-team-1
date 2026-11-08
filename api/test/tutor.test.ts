import { afterEach, describe, expect, it, vi } from 'vitest';
import { GAME } from '../src/config/game';
import {
  askTutor,
  createTutorCache,
  deleteTutorCache,
  isForeignTranscript,
  type MissedQuestion,
  parseTutorReply,
  pcmToWav,
  shownHeard,
  TUTOR_LAST_TURN,
  TutorBusyError,
  tutorAsked,
  tutorKickoff,
  tutorRequest,
  tutorSystemPrompt,
} from '../src/llm/tutor';

const q: MissedQuestion = {
  subject: 'math',
  prompt: '1/2 + 1/3 = ?',
  options: ['2/5', '5/6', '1/6', '2/6'],
  correctIndex: 1,
  choice: 0,
  explanation: 'Ерөнхий хуваарь 6: 3/6 + 2/6 = 5/6.',
};

describe('tutorSystemPrompt', () => {
  it('нэг бодлого: хүүхдийн буруу ба зөв хариулт, тайлбар орно', () => {
    const p = tutorSystemPrompt({ grade: 6, questions: [q], focused: true });
    expect(p).toContain('6-р ангийн');
    expect(p).toContain('үргэлж зөвхөн монгол хэлээр хариул');
    expect(p).toContain('[Математик] 1/2 + 1/3 = ?');
    expect(p).toContain('Хүүхдийн хариулт: A) 2/5 (буруу)');
    expect(p).toContain('Зөв хариулт: B) 5/6');
    expect(p).toContain('Ерөнхий хуваарь 6');
  });

  it('салаа зам дуусаагүй бодлогын зөв хариу, тайлбарыг prompt-д өгөхгүй', () => {
    const p = tutorSystemPrompt({ grade: 6, questions: [{ ...q, hideAnswer: true }], focused: true });
    expect(p).toContain('Хүүхдийн хариулт: A) 2/5 (буруу)');
    expect(p).not.toContain('Зөв хариулт:');
    expect(p).not.toContain('Ерөнхий хуваарь 6');
    expect(p).toContain('Зөв хариуг нь бүү хэл');
    expect(p).toContain('Давтлага дээрээ өөрөө шалгаарай');
  });

  it('алгассан бодлого, олон бодлогын жагсаалт', () => {
    const p = tutorSystemPrompt({ grade: 8, questions: [{ ...q, choice: -1 }, { ...q, subject: 'physics' }], focused: false });
    expect(p).toContain('Хүүхдийн хариулт: алгассан');
    expect(p).toContain('2. [Физик]');
    expect(p).toContain('Аль сэдвээс эхлэхийг');
  });

  it('англи хэлний бодлогод англи жишээ бичихийг зөвшөөрнө, бусад хичээлд үгүй', () => {
    expect(tutorSystemPrompt({ grade: 8, questions: [{ ...q, subject: 'english' }], focused: true })).toContain('англи үг, өгүүлбэрийг жишээ');
    expect(tutorSystemPrompt({ grade: 8, questions: [q], focused: true })).not.toContain('англи үг, өгүүлбэрийг жишээ');
  });

  it('алдсан бодлогогүй үед сэдвийг хүүхдээс асууна', () => {
    const ctx = { grade: 7, questions: [], focused: false };
    expect(tutorSystemPrompt(ctx)).toContain('алдсан бодлого алга');
    expect(tutorKickoff(ctx)).toContain('ямар сэдэв');
  });
});

describe('tutorSystemPrompt хичээлийн урсгал', () => {
  it('шинэ бодлого өгөхгүй, 6–8 ээлжинд тайлбарлаад done = true болгоно; "дуусгая" гэхэд ч', () => {
    const text = tutorSystemPrompt({ grade: 6, questions: [], focused: false });
    expect(text).toContain('Шинэ бодлого, дасгал бүү өг.');
    expect(text).toContain('6–8 ээлжинд');
    expect(text).toContain('done = true болго. Хүүхэд ядарсан эсвэл дуусгая гэвэл ч ингэ.');
    expect(text).not.toContain('шинэ, тоо нь өөр бодлого өг');
  });

  it('тооцоог шалгаж, Тайлбар дахь бодолтыг дагана (баавгай тооцоогоо андуурдаг байсан)', () => {
    const text = tutorSystemPrompt({ grade: 9, questions: [], focused: false });
    expect(text).toContain('дотроо алхам алхмаар бодож шалга');
    expect(text).toContain('Тайлбараас зөрвөл Тайлбар зөв');
  });

  it('хариу самбар дээр бичгээр гардаг тул томьёог үгээр биш тэмдэгтээр хэлнэ', () => {
    const text = tutorSystemPrompt({ grade: 7, questions: [], focused: false });
    expect(text).toContain('самбар дээр бичгээр');
    expect(text).toContain('x + 8 = 30');
    expect(text).not.toContain('Тэмдэгтийг үгээр хэл');
    expect(text).not.toMatch(/Дуу хоолойгоороо|дуу болгож уншдаг/);
  });

  it('хүүхдийг "дүү минь" гэж дуудахгүй, ах гэж өөрийгөө нэрлэхгүй', () => {
    const text = tutorSystemPrompt({ grade: 6, questions: [], focused: false });
    expect(text).toContain('"дүү минь"');
    expect(text).not.toMatch(/дотно ах|Ах нь дүүдээ/);
  });
});

describe('tutorRequest', () => {
  it('system prompt, яриа түүх, JSON хариуны загвар, токены хязгаар', () => {
    const contents = [{ role: 'user' as const, parts: [{ text: 'сайн уу' }] }];
    const body = tutorRequest('SYS', contents);
    expect(body).toHaveProperty('systemInstruction.parts.0.text', 'SYS');
    expect(body).not.toHaveProperty('cachedContent');
    expect(body.contents).toEqual(contents);
    expect(body.generationConfig.maxOutputTokens).toBe(GAME.TUTOR.MAX_OUTPUT_TOKENS);
    expect(body.generationConfig.responseMimeType).toBe('application/json');
    expect(body.generationConfig.responseSchema.required).toEqual(['heard', 'verdict', 'reply', 'done']);
  });

  it('загвар хариуг reply-ээс өмнө шүүнэ, нууц бодлогод зөв, буруу гэж шүүх сонголтгүй', () => {
    const schema = (hide: boolean) => tutorRequest('SYS', [], hide).generationConfig.responseSchema;
    expect(schema(false).propertyOrdering).toEqual(['heard', 'verdict', 'reply', 'done']);
    expect(schema(false).properties.verdict.enum).toEqual(['correct', 'wrong', 'none', 'hidden']);
    expect(schema(true).properties.verdict.enum).toEqual(['hidden', 'none']);
  });

  it('cache ашиглавал systemInstruction-г илгээхгүй', () => {
    const body = tutorRequest('SYS', [], false, 'cachedContents/123');
    expect(body).toHaveProperty('cachedContent', 'cachedContents/123');
    expect(body).not.toHaveProperty('systemInstruction');
    expect(body).not.toHaveProperty('tools');
    expect(body).not.toHaveProperty('toolConfig');
    expect(body.generationConfig.maxOutputTokens).toBe(GAME.TUTOR.MAX_OUTPUT_TOKENS);
  });

  it('сүүлийн хариултын заавар хичээлийг дуусгуулна', () => {
    expect(TUTOR_LAST_TURN).toContain('done = true');
    const asked = { role: 'user' as const, parts: [{ text: 'Сайн уу' }] };
    expect(tutorAsked(asked, false)).toBe(asked);
    expect(tutorAsked(asked, true).parts).toEqual([{ text: 'Сайн уу' }, { text: TUTOR_LAST_TURN }]);
    expect(asked.parts).toEqual([{ text: 'Сайн уу' }]);
  });
});

describe('tutor cache', () => {
  it('cache үүсгэхэд загвар, prompt, TTL-г явуулж нэрийг буцаана', async () => {
    const fetchImpl = vi.fn(async (_url: unknown, _init?: RequestInit) => new Response(JSON.stringify({ name: 'cachedContents/123' })));
    await expect(createTutorCache('KEY', 'gemini-3.5-flash-lite', 'SYS', 360, fetchImpl as unknown as typeof fetch)).resolves.toBe('cachedContents/123');
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(String(url)).toBe('https://generativelanguage.googleapis.com/v1beta/cachedContents');
    expect(init?.method).toBe('POST');
    expect(new Headers(init?.headers).get('x-goog-api-key')).toBe('KEY');
    expect(JSON.parse(String(init?.body))).toEqual({
      model: 'models/gemini-3.5-flash-lite',
      systemInstruction: { parts: [{ text: 'SYS' }] },
      ttl: '360s',
    });
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });

  it('cache үүсгэхэд 400 болон fetch алдааг null болгоно', async () => {
    const bad = vi.fn(async () => new Response('too short', { status: 400 }));
    const throws = vi.fn(async () => { throw new Error('network'); });
    await expect(createTutorCache('KEY', 'm', 'short', 10, bad as unknown as typeof fetch)).resolves.toBeNull();
    await expect(createTutorCache('KEY', 'm', 'SYS', 10, throws as unknown as typeof fetch)).resolves.toBeNull();
  });

  it('cache устгах алдааг үл тооно', async () => {
    const fetchImpl = vi.fn(async (_url: unknown, _init?: RequestInit) => { throw new Error('network'); });
    await expect(deleteTutorCache('KEY', 'cachedContents/123', fetchImpl as unknown as typeof fetch)).resolves.toBeUndefined();
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(String(url)).toBe('https://generativelanguage.googleapis.com/v1beta/cachedContents/123');
    expect(init?.method).toBe('DELETE');
    expect(new Headers(init?.headers).get('x-goog-api-key')).toBe('KEY');
  });
});

describe('pcmToWav', () => {
  it('хэсгүүдийг дарааллаар нь 44 байтын толгойтой WAV болгоно', () => {
    const wav = pcmToWav([new Uint8Array([1, 2]), new Uint8Array([3, 4])], 16_000);
    const v = new DataView(wav.buffer);
    expect(wav.byteLength).toBe(48);
    expect(String.fromCharCode(...wav.subarray(0, 4))).toBe('RIFF');
    expect(v.getUint32(24, true)).toBe(16_000);
    expect(v.getUint32(28, true)).toBe(32_000);
    expect(v.getUint32(40, true)).toBe(4);
    expect([...wav.subarray(44)]).toEqual([1, 2, 3, 4]);
  });
});

describe('parseTutorReply', () => {
  it('JSON-ийг уншиж, тэмдэгтийг цэвэрлэнэ', () => {
    expect(parseTutorReply('{"heard":"x нь 6 юу?","reply":"**Зөв**, яаж олсон бэ?","done":false}')).toEqual({
      heard: 'x нь 6 юу?',
      reply: 'Зөв, яаж олсон бэ?',
      done: false,
    });
  });

  it('JSON эвдэрсэн бол бичвэрийг нь хариу гэж үзнэ', () => {
    expect(parseTutorReply('Сайн уу')).toEqual({ heard: '', reply: 'Сайн уу', done: false });
  });

  it('токены хязгаарт таслагдсан JSON-оос бүтэн өгүүлбэрүүдийг авна', () => {
    expect(parseTutorReply('{"heard":"x нь 6 юу?","reply":"Зөв. Яаж олсноо хэл? Тэгээд дараагийн а')).toEqual({
      heard: 'x нь 6 юу?',
      reply: 'Зөв. Яаж олсноо хэл?',
      done: false,
    });
    expect(parseTutorReply('{"heard":"x нь 6')).toBeNull();
  });

  it('хоосон хариу бол null', () => {
    expect(parseTutorReply('{"heard":"x","reply":"  ","done":true}')).toBeNull();
  });

  it('өөр бичгээр сонссон ч түүхэнд үлдээнэ: зөвхөн дэлгэц шүүнэ', () => {
    expect(parseTutorReply('{"heard":"She goes to school","reply":"Зөв","done":false}')?.heard).toBe('She goes to school');
  });
});

describe('askTutor', () => {
  afterEach(() => vi.useRealTimers());

  const ok = (reply: string) =>
    new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ heard: '', reply, done: false }) }] } }] }));
  const body = tutorRequest('SYS', []);

  it('хариуг уншиж, түлхүүрийг толгойд илгээнэ', async () => {
    const fetchImpl = vi.fn(async (_url: unknown, _init?: RequestInit) => ok('Сайн уу'));
    const out = await askTutor('KEY', 'm', body, fetchImpl as unknown as typeof fetch);
    expect(out.reply).toBe('Сайн уу');
    const [url, init] = fetchImpl.mock.calls[0];
    expect(String(url)).toContain('/m:generateContent');
    expect(String(url)).not.toContain('KEY');
    expect((init?.headers as Record<string, string>)['x-goog-api-key']).toBe('KEY');
  });

  it('503 бол дахин оролдоно', async () => {
    vi.useFakeTimers();
    const fetchImpl = vi.fn().mockResolvedValueOnce(new Response('busy', { status: 503 })).mockResolvedValueOnce(ok('За'));
    const p = askTutor('KEY', 'm', body, fetchImpl as unknown as typeof fetch);
    await vi.runAllTimersAsync();
    await expect(p).resolves.toMatchObject({ reply: 'За' });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('оролдлого дуусвал TutorBusyError', async () => {
    vi.useFakeTimers();
    const fetchImpl = vi.fn(async () => new Response('busy', { status: 429 }));
    const p = askTutor('KEY', 'm', body, fetchImpl as unknown as typeof fetch);
    const check = expect(p).rejects.toBeInstanceOf(TutorBusyError);
    await vi.runAllTimersAsync();
    await check;
    expect(fetchImpl).toHaveBeenCalledTimes(GAME.TUTOR.RETRIES);
  });

  it('400 бол дахин оролдохгүй', async () => {
    const fetchImpl = vi.fn(async () => new Response('bad', { status: 400 }));
    await expect(askTutor('KEY', 'm', body, fetchImpl as unknown as typeof fetch)).rejects.toThrow('HTTP 400');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});

describe('shownHeard', () => {
  const english: MissedQuestion = { ...q, subject: 'english' };

  it('англи хэлний ярилцлагад англи яриаг харуулна', () => {
    expect(shownHeard('She goes to school', [english])).toBe('She goes to school');
    expect(shownHeard('She goes to school', [q, english])).toBe('She goes to school');
  });

  it('бусад хичээлд латин, бүх хичээлд өөр бичгийг харуулахгүй', () => {
    expect(shownHeard('She goes to school', [q])).toBe('');
    expect(shownHeard('더하기는 곱하기를 왜', [english])).toBe('');
    expect(shownHeard('Би ойлгохгүй байна', [q])).toBe('Би ойлгохгүй байна');
  });
});

describe('isForeignTranscript', () => {
  it('өөр бичгийг таньж, цөөн латин үсэгтэй монгол бичвэрийг үлдээнэ', () => {
    expect(isForeignTranscript('3분의 2 더하기')).toBe(true);
    expect(isForeignTranscript('Ich weiß nicht')).toBe(true);
    expect(isForeignTranscript('5x - 8 гэж бодсон')).toBe(false);
    expect(isForeignTranscript('12')).toBe(false);
  });
});
