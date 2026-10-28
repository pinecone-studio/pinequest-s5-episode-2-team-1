// Баавгайн ярианы дараалал: текстийн хэсгүүдийг TTS-ээр (зэрэг дээд тал нь MAX_IN_FLIGHT) дуу болгох боловч
// клиентэд дарааллаар нь дамжуулна. Ээлжийн төгсгөлийг бүх дуу дамжсаны дараа мэдэгдэнэ. Сүлжээгүй, тестлэгдэх.

type Synth = (text: string, signal: AbortSignal) => AsyncIterable<Uint8Array>;

/** TTS-ийн минутын хүсэлтийн хязгаарт (429) хүрэхгүйн тулд зэрэг явуулах хүсэлт. */
const MAX_IN_FLIGHT = 2;

interface Job {
  text: string;
  started: boolean;
  turnEnd: boolean;
  chunks: Uint8Array[];
  done: boolean;
  wake: (() => void) | null;
  ctrl: AbortController;
}

export class SpeechQueue {
  private jobs: Job[] = [];
  private pumping = false;
  private inFlight = 0;
  /** clear() бүрт нэмэгдэнэ: хуучин pump давталтыг зогсооно. */
  private generation = 0;

  constructor(
    private readonly synth: Synth,
    private readonly out: { audio(chunk: Uint8Array): void; turnEnd(): void; error(e: unknown): void },
  ) {}

  /** Текстийг дуу болгож эхлүүлнэ (өмнөх хэсгүүдийн дараа тоглогдоно). */
  say(text: string) {
    this.jobs.push({ text, started: false, turnEnd: false, chunks: [], done: false, wake: null, ctrl: new AbortController() });
    this.startJobs();
    void this.pump();
  }

  /** Бэлэн дууг (TTS-гүй, жишээ нь Live-ийн өөрийн дуу) өмнөх хэсгүүдийн дараа дамжуулна. */
  play(chunks: Uint8Array[]) {
    this.jobs.push({ text: '', started: true, turnEnd: false, chunks, done: true, wake: null, ctrl: new AbortController() });
    void this.pump();
  }

  /** Өмнөх бүх хэсэг дамжсаны дараа turnEnd-ийг дуудна. */
  endTurn() {
    this.jobs.push({ text: '', started: true, turnEnd: true, chunks: [], done: true, wake: null, ctrl: new AbortController() });
    void this.pump();
  }

  /** Дарааллын эхнээс эхлээгүй хэсгүүдийг сул байгаа хэмжээгээр эхлүүлнэ. */
  private startJobs() {
    for (const job of this.jobs) {
      if (this.inFlight >= MAX_IN_FLIGHT) return;
      if (job.started) continue;
      job.started = true;
      this.inFlight++;
      void (async () => {
        try {
          for await (const chunk of this.synth(job.text, job.ctrl.signal)) {
            job.chunks.push(chunk);
            job.wake?.();
          }
        } catch (e) {
          if (!job.ctrl.signal.aborted) this.out.error(e);
        } finally {
          job.done = true;
          job.wake?.();
          this.inFlight--;
          this.startJobs();
        }
      })();
    }
  }

  /** Хүүхэд баавгайг тасалсан: бүх хэсгийг цуцална. */
  clear() {
    this.generation++;
    for (const job of this.jobs) {
      job.ctrl.abort();
      job.done = true;
      job.wake?.();
    }
    this.jobs = [];
  }

  private async pump() {
    if (this.pumping) return;
    this.pumping = true;
    const gen = this.generation;
    try {
      while (this.jobs.length > 0 && gen === this.generation) {
        const job = this.jobs[0];
        if (job.turnEnd) {
          this.out.turnEnd();
        } else {
          let sent = 0;
          while (gen === this.generation) {
            if (sent < job.chunks.length) this.out.audio(job.chunks[sent++]);
            else if (job.done) break;
            else await new Promise<void>((r) => (job.wake = r));
            job.wake = null;
          }
        }
        if (gen === this.generation) this.jobs.shift();
      }
    } finally {
      this.pumping = false;
    }
    // clear()-ийн дараа шинэ хэсэг нэмэгдсэн бол дахин эхлүүлнэ.
    if (gen !== this.generation && this.jobs.length > 0) void this.pump();
  }
}

/**
 * Ээлжийн эхний хэсгийн доод урт (тэмдэгт). Үлдсэн хэсгийн TTS хүсэлт Gemini текстээ дуусгасны дараа л эхэлж,
 * анхны дуу нь ирэх хүртэл 2–3 сек болдог: "Сайн уу дүү минь!" шиг богино хэсгийн (≈1.3 сек) дараа чимээгүй завсар
 * гардаг байсан. ~60 тэмдэгт ≈ 4 сек яриа энэ хугацааг нөхнө.
 */
const FIRST_MIN = 60;

/**
 * Дуу болгоход бэлэн хэсгийн төгсгөл, эсвэл -1. Зөвхөн өгүүлбэрийн төгсгөлд тасална: TTS хэсэг бүрийг өгүүлбэр
 * дууссан мэт аялгуугаар төгсгөж ард нь завсар гаргадаг тул таслал эсвэл үгэн дээр таслахад баавгай өгүүлбэрийн
 * дундуур зогссон мэт сонсогддог байсан (11 ээлжийн 9-д). Өгүүлбэрийн төгсгөлийг араас нь зай ирсэн үед л тооцно
 * (2.5 шиг аравтын бутархайг таслахгүй). Ээлжийн эхний хэсэг (first) FIRST_MIN-ээс богино биш; ийм өгүүлбэр
 * дуусаагүй бол ээлжийн бүх текстийг (gen_done) нэг хэсэг болгоно.
 */
export function speechChunkEnd(text: string, first: boolean): number {
  const min = first ? FIRST_MIN : 0;
  const sentence = /[.!?…](?=\s)/g;
  for (let m = sentence.exec(text); m; m = sentence.exec(text)) if (m.index + 1 >= min) return m.index + 1;
  return -1;
}
