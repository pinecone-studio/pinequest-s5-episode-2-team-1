import { describe, expect, it } from 'vitest';
import { GAME } from '../src/config/game';
import {
  isForeignTranscript,
  isQuotaClose,
  liveEvents,
  liveSetup,
  type MissedQuestion,
  FINISH_LESSON_TOOL,
  speechBudget,
  tutorKickoff,
  tutorSystemPrompt,
} from '../src/llm/live';

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
    expect(p).toContain('үргэлж зөвхөн монгол хэлээр ярь');
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
  });

  it('алгассан бодлого, олон бодлогын жагсаалт', () => {
    const p = tutorSystemPrompt({ grade: 8, questions: [{ ...q, choice: -1 }, { ...q, subject: 'physics' }], focused: false });
    expect(p).toContain('Хүүхдийн хариулт: алгассан');
    expect(p).toContain('2. [Физик]');
    expect(p).toContain('Аль сэдвээс эхлэхийг');
  });

  it('алдсан бодлогогүй үед сэдвийг хүүхдээс асууна', () => {
    const ctx = { grade: 7, questions: [], focused: false };
    expect(tutorSystemPrompt(ctx)).toContain('алдсан бодлого алга');
    expect(tutorKickoff(ctx)).toContain('ямар сэдэв');
  });
});

describe('tutorSystemPrompt хичээлийн урсгал', () => {
  it('шинэ бодлого өгөхгүй, 6–8 ээлжинд тайлбарлаад finish_lesson дуудна; "дуусгая" гэхэд ч', () => {
    const text = tutorSystemPrompt({ grade: 6, questions: [], focused: false });
    expect(text).toContain('Шинэ бодлого, дасгал бүү өг.');
    expect(text).toContain('6–8 ээлжинд');
    expect(text.match(/finish_lesson/g)).toHaveLength(2);
    expect(text).not.toContain('шинэ, тоо нь өөр бодлого өг');
  });

  it('хүүхдийг "дүү минь" гэж дуудахгүй, ах гэж өөрийгөө нэрлэхгүй', () => {
    const text = tutorSystemPrompt({ grade: 6, questions: [], focused: false });
    expect(text).toContain('"дүү минь"');
    expect(text).not.toMatch(/дотно ах|Ах нь дүүдээ/);
  });
});

describe('liveSetup', () => {
  it('зөвхөн дуу, хоёр талын transcript, system prompt', () => {
    const { setup } = liveSetup('gemini-3.8-live', 'SYS');
    expect(setup.model).toBe('models/gemini-3.8-live');
    expect(setup.generationConfig.responseModalities).toEqual(['AUDIO']);
    expect(setup.systemInstruction.parts[0].text).toBe('SYS');
    expect(setup.inputAudioTranscription).toEqual({ languageCodes: ['mn-MN'] });
    expect(setup.generationConfig.speechConfig).toEqual({ voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Achird' } } });
    expect(setup.tools).toEqual([FINISH_LESSON_TOOL]);
    expect(setup.outputAudioTranscription).toEqual({});
  });
});

describe('liveEvents', () => {
  it('setupComplete → ready', () => {
    expect(liveEvents({ setupComplete: {} })).toEqual([{ kind: 'ready' }]);
  });

  it('finish_lesson функцийн дуудлагыг ярилцлага дуусгах үйл явдал болгоно, бусдыг алгасна', () => {
    const toolCall = { functionCalls: [{ id: 'a1', name: 'finish_lesson' }, { id: 'a2', name: 'other' }] };
    expect(liveEvents({ toolCall })).toEqual([{ kind: 'finish', id: 'a1' }]);
  });

  it('нэг мессеж дэх дуу, transcript, ээлжийн төгсгөлийг дарааллаар нь', () => {
    const events = liveEvents({
      serverContent: {
        inputTranscription: { text: 'ойлгохгүй' },
        modelTurn: { parts: [{ inlineData: { mimeType: 'audio/pcm;rate=24000', data: 'AAA=' } }, { text: 'бодол' }] },
        outputTranscription: { text: 'Сайн уу' },
        turnComplete: true,
      },
    });
    expect(events).toEqual([
      { kind: 'kid_text', text: 'ойлгохгүй' },
      { kind: 'audio', data: 'AAA=' },
      { kind: 'bear_text', text: 'Сайн уу' },
      { kind: 'turn_end' },
    ]);
  });

  it('interrupted, goAway; танихгүй мессежийг алгасна', () => {
    expect(liveEvents({ serverContent: { interrupted: true } })).toEqual([{ kind: 'interrupted' }]);
    expect(liveEvents({ serverContent: { generationComplete: true } })).toEqual([{ kind: 'gen_done' }]);
    expect(liveEvents({ goAway: { timeLeft: '10s' } })).toEqual([{ kind: 'go_away' }]);
    expect(liveEvents({ sessionResumptionUpdate: {} })).toEqual([]);
    expect(liveEvents(null)).toEqual([]);
  });
});

describe('isForeignTranscript', () => {
  it('монгол, тоо, цөөн латин үсгийг үлдээнэ', () => {
    expect(isForeignTranscript('Би ойлгохгүй байна')).toBe(false);
    expect(isForeignTranscript('5x - 8 = 22')).toBe(false);
    expect(isForeignTranscript(' вэ?')).toBe(false);
  });

  it('буруу хэлээр сонссоныг хаяна', () => {
    expect(isForeignTranscript('더하기는 곱하기를 왜')).toBe(true);
    expect(isForeignTranscript('Mr. Hag nimmt Tee.')).toBe(true);
    expect(liveEvents({ serverContent: { inputTranscription: { text: '3분의 2 더하기' } } })).toEqual([]);
  });
});

describe('isQuotaClose', () => {
  it('Gemini-ийн квот дүүрснийг түр алдаанаас ялгана', () => {
    expect(isQuotaClose(1011, 'You exceeded your current quota, please check your plan and billing details.')).toBe(true);
    expect(isQuotaClose(1011, 'Internal error encountered.')).toBe(false);
    expect(isQuotaClose(1000, '')).toBe(false);
  });
});

describe('speechBudget', () => {
  const cap = GAME.TUTOR.BEAR_SPEECH_MS;
  it('баавгай 2:30 хүртэл ярьсан бол үргэлжилнэ, түүнээс хойш дуусгах заавар, дараа нь ярьсан ээлжийн төгсгөлд хаана', () => {
    expect(speechBudget(cap - GAME.TUTOR.WRAP_UP_MS - 1, false, true)).toBe('continue');
    expect(speechBudget(cap - GAME.TUTOR.WRAP_UP_MS, false, true)).toBe('wrap');
    expect(speechBudget(cap - GAME.TUTOR.WRAP_UP_MS + 5_000, true, true)).toBe('end');
  });

  it('дуусгах зааврын дараах хоосон ээлжид (хүүхдийн чимээ) хаахгүй', () => {
    expect(speechBudget(cap - GAME.TUTOR.WRAP_UP_MS + 5_000, true, false)).toBe('continue');
  });
});
