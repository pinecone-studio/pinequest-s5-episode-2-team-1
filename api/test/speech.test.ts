import { afterEach, describe, expect, it, vi } from 'vitest';
import { GAME } from '../src/config/game';
import { SpeechQueue, speechChunkEnd } from '../src/llm/speech';
import { cleanForSpeech, noteQuota, speakMath, speechMode, splitSse, ttsAvailable, ttsStream } from '../src/llm/tts';

const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms));

/** Текст бүрийг "чанк" болгон (үсэг бүрийг нэг байт) delay-тайгаар дамжуулдаг хуурамч TTS. */
function fakeSynth(delays: Record<string, number>) {
  return async function* (text: string, signal: AbortSignal) {
    await tick(delays[text] ?? 0);
    for (const ch of text) {
      if (signal.aborted) return;
      yield new Uint8Array([ch.charCodeAt(0)]);
      await tick(1);
    }
  };
}

function collect() {
  const log: string[] = [];
  return {
    log,
    out: {
      audio: (c: Uint8Array) => log.push(String.fromCharCode(c[0])),
      turnEnd: () => log.push('|'),
      error: (e: unknown) => log.push(`!${String(e)}`),
    },
  };
}

describe('SpeechQueue', () => {
  it('зэрэг дуу болгосон ч дарааллаар нь, ээлжийн төгсгөлийг хамгийн сүүлд', async () => {
    const { log, out } = collect();
    // Хоёр дахь хэсэг түрүүлж бэлэн болно.
    const q = new SpeechQueue(fakeSynth({ ab: 30, cd: 0 }), out);
    q.say('ab');
    q.say('cd');
    q.endTurn();
    await tick(80);
    expect(log.join('')).toBe('abcd|');
  });

  it('clear() үлдсэн дууг цуцалж, дараагийн ээлж хэвийн явна', async () => {
    const { log, out } = collect();
    const q = new SpeechQueue(fakeSynth({ xyz: 20 }), out);
    q.say('xyz');
    q.endTurn();
    q.clear();
    q.say('ok');
    q.endTurn();
    await tick(60);
    expect(log.join('')).toBe('ok|');
  });

  it('TTS-ийг зэрэг 2-оос олныг явуулахгүй, гэхдээ бүгдийг дарааллаар нь дамжуулна', async () => {
    const { log, out } = collect();
    let active = 0;
    let peak = 0;
    const q = new SpeechQueue(async function* (text) {
      active++;
      peak = Math.max(peak, active);
      await tick(10);
      yield new Uint8Array([text.charCodeAt(0)]);
      active--;
    }, out);
    for (const t of ['a', 'b', 'c', 'd', 'e']) q.say(t);
    q.endTurn();
    await tick(100);
    expect(peak).toBe(2);
    expect(log.join('')).toBe('abcde|');
  });

  it('TTS алдаа гарвал мэдэгдээд дараагийн хэсэг рүү шилжинэ', async () => {
    const { log, out } = collect();
    const q = new SpeechQueue(
      async function* (text) {
        if (text === 'bad') throw new Error('429');
        yield new Uint8Array([text.charCodeAt(0)]);
      },
      out,
    );
    q.say('bad');
    q.say('g');
    q.endTurn();
    await tick(20);
    expect(log).toEqual(['!Error: 429', 'g', '|']);
  });
});

describe('speechChunkEnd', () => {
  it('өгүүлбэрийн төгсгөлийг араас нь зай ирсэн үед л олно', () => {
    expect(speechChunkEnd('Сайн уу! За', false)).toBe(8);
    expect(speechChunkEnd('Сайн уу!', false)).toBe(-1);
    expect(speechChunkEnd('x нь 2.5 болно', false)).toBe(-1);
  });

  it('эхний хэсэг "Сайн уу дүү минь!" шиг богино бол дараагийн өгүүлбэрт тасална (дуу завсарлахгүй)', () => {
    const text = 'Сайн уу дүү минь! Өнөөдөр бид тоонуудыг багаас нь их рүү эрэмбэлэх талаар ярилцъя. Төсөөлөөд үз';
    expect(speechChunkEnd('Сайн уу дүү минь! Өнөөдөр бид', true)).toBe(-1);
    expect(speechChunkEnd(text, true)).toBe(text.indexOf('ярилцъя.') + 'ярилцъя.'.length);
    expect(speechChunkEnd(text, false)).toBe('Сайн уу дүү минь!'.length);
  });

  it('эхний хэсгийг хангалттай урт бол таслалаар тасална', () => {
    const text = 'За, өнөөдөр бид тэгшитгэлийн тухай, хамтдаа алхам алхмаар ярилцаж, жишээ бодно уу';
    expect(speechChunkEnd(text, false)).toBe(-1);
    // эхний хоёр таслал хэт эрт тул алгасаад дараагийн таслал
    expect(speechChunkEnd(text, true)).toBe(text.indexOf('ярилцаж,') + 'ярилцаж,'.length);
  });

  it('эхний хэсгийг цэг таслал ирээгүй ч 12 бүтэн үг болмогц тасална', () => {
    const words = 'нэг хоёр гурав дөрөв тав зургаа долоо найм ес арав арван нэг';
    expect(speechChunkEnd(words, true)).toBe(-1); // сүүлийн "нэг" бүтэн эсэх нь тодорхойгүй
    expect(speechChunkEnd(`${words} хоёр`, true)).toBe(words.length);
    expect(speechChunkEnd(`${words} хоёр`, false)).toBe(-1);
  });
});

describe('tts туслахууд', () => {
  it('cleanForSpeech markdown-ийг хасна', () => {
    expect(cleanForSpeech('  **Тэгшитгэл**  гэдэг\n# нь ')).toBe('Тэгшитгэл гэдэг нь');
  });

  it('speakMath "2x"-ийг "2 икс", ганц x/х-ийг "икс" болгоно, үг доторх х-д хүрэхгүй', () => {
    expect(speakMath('2x нь 28 болсон')).toBe('2 икс нь 28 болсон');
    expect(speakMath('Одоо x-ийг олъё, 5 x хасах 8')).toBe('Одоо иксийг олъё, 5 икс хасах 8');
    expect(speakMath('3х + 5 = 20')).toBe('3 икс + 5 = 20');
    expect(speakMath('хоёр хүүхэд, max 2xl')).toBe('хоёр хүүхэд, max 2xl');
  });

  it('cleanForSpeech transcript-ийн "Төсөөлөө дөө", "үз дөө" алдааг засна, бусад үгэнд хүрэхгүй', () => {
    expect(cleanForSpeech('Төсөөлөө дөө, гадаа хүйтэн.')).toBe('Төсөөлөөд үз дээ, гадаа хүйтэн.');
    expect(cleanForSpeech('Тэгвэл төсөөлөө дөө.')).toBe('Тэгвэл төсөөлөөд үз дээ.');
    expect(cleanForSpeech('Төсөөлөөд үз дөө, гадаа')).toBe('Төсөөлөөд үз дээ, гадаа');
    expect(cleanForSpeech('Төсөөлөөд үз дээ, бүүз дөө')).toBe('Төсөөлөөд үз дээ, бүүз дөө');
    expect(cleanForSpeech('төсөөл дөө')).toBe('төсөөл дөө');
    expect(cleanForSpeech('хасах дєрєв нь баруун талд байх бєгєєд')).toBe('хасах дөрөв нь баруун талд байх бөгөөд');
  });

  it('splitSse дутуу мөрийг дараагийн хэсэгт үлдээнэ', () => {
    const a = splitSse('data: {"a":1}\r\n\r\ndata: {"b"');
    expect(a.events).toEqual(['{"a":1}']);
    expect(splitSse(`${a.rest}:2}\n\n`).events).toEqual(['{"b":2}']);
  });
});

describe('TTS өдрийн квот', () => {
  it('PerDay 429 бол retryDelay хүртэл TTS-ийг хаана, минутын 429-д хаахгүй', () => {
    const now = 1_000_000;
    noteQuota('{"quotaId": "GenerateRequestsPerMinutePerProjectPerModel"}', now);
    expect(ttsAvailable(now)).toBe(true);
    noteQuota('{"quotaId": "GenerateRequestsPerDayPerProjectPerModel", "retryDelay": "120s"}', now);
    expect(ttsAvailable(now + 60_000)).toBe(false);
    expect(ttsAvailable(now + 121_000)).toBe(true);
  });
});

describe('ttsStream', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('анхны дуу TTS_START_MS-д ирэхгүй бол таслана (баавгай Live-ийн дуу руу шилжинэ)', async () => {
    vi.useFakeTimers();
    let aborted = false;
    vi.stubGlobal('fetch', (_url: string, init: RequestInit) => {
      return new Promise<Response>((_, reject) =>
        init.signal?.addEventListener('abort', () => {
          aborted = true;
          reject(new DOMException('aborted', 'AbortError'));
        }),
      );
    });
    const first = ttsStream('key', 'model', 'Сайн уу').next();
    first.catch(() => {});
    await vi.advanceTimersByTimeAsync(GAME.TUTOR.TTS_START_MS - 1);
    expect(aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await expect(first).rejects.toThrow();
    expect(aborted).toBe(true);
  });

  it('429-д хүлээж дахин оролдохгүй, шууд алдаа шиднэ', async () => {
    let calls = 0;
    vi.stubGlobal('fetch', async () => {
      calls++;
      return new Response('{"quotaId": "GenerateRequestsPerMinutePerProjectPerModel"}', { status: 429 });
    });
    await expect(ttsStream('key', 'model', 'Сайн уу').next()).rejects.toThrow();
    expect(calls).toBe(1);
  });
});

describe('speechMode', () => {
  it('TUTOR_SPEECH нь горимыг дарна, бусад утгад GAME.TUTOR.SPEECH', () => {
    expect(speechMode('tts')).toBe('tts');
    expect(speechMode('live')).toBe('live');
    expect(speechMode(undefined)).toBe(GAME.TUTOR.SPEECH);
    expect(speechMode('TTS ')).toBe(GAME.TUTOR.SPEECH);
  });
});
