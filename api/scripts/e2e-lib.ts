import type { AuthResponse, Me, MeResponse, RecoveryAnswerResponse, RecoveryDto, ServerMsg, TaskDto, AnswerResponse, TaskResult } from '../../shared/types';
import { call, HttpError, openDuelSocket, sleep } from './lib';

let failures = 0;
export const failureCount = () => failures;

export function check(cond: boolean, label: string, extra?: unknown) {
  if (cond) console.log(`  ✓ ${label}`);
  else {
    failures++;
    console.log(`  ✗ ${label}`, extra === undefined ? '' : JSON.stringify(extra));
  }
}

export async function expectError(p: Promise<unknown>, code: string, label: string) {
  try {
    await p;
    check(false, label, 'алдаа гараагүй');
  } catch (e) {
    check(e instanceof HttpError && e.code === code, label, e instanceof HttpError ? e.code : String(e));
  }
}

const suffix = Date.now().toString(36).slice(-5);
export async function register(name: string, grade: number): Promise<AuthResponse> {
  return call<AuthResponse>('POST', '/auth/register', { body: { username: `${name}_${suffix}`, password: 'e2e-pass-123', grade } });
}

export async function me(token: string): Promise<Me> {
  return (await call<MeResponse>('GET', '/me', { token })).me;
}

export async function correctIndex(questionId: number): Promise<number> {
  return (await call<{ correctIndex: number }>('GET', `/admin/questions/${questionId}`, { admin: true })).correctIndex;
}

/** Даалгавар эхлүүлж бүх асуултад хариулна (allCorrect: бүгд зөв / бүгд буруу). */
export async function doTask(token: string, subject: string, allCorrect: boolean) {
  const task = await call<TaskDto>('POST', '/tasks', { token, body: { subject } });
  let last: AnswerResponse | null = null;
  const answers: AnswerResponse[] = [];
  for (const q of task.questions.filter((x) => !x.answered)) {
    const ci = await correctIndex(q.id);
    last = await call<AnswerResponse>('POST', `/tasks/${task.id}/answer`, {
      token,
      body: { questionId: q.id, choice: allCorrect ? ci : (ci + 1) % 4 },
    });
    answers.push(last);
  }
  // Олон алдсан бол дараагийн даалгаврын өмнө салаа замаа дуусгах ёстой: бусад сценарийг саатуулахгүйн тулд хаана.
  if (last?.recovery) await clearRecovery(token, subject);
  return { task, answers, result: last?.result as TaskResult };
}

/** Нөхөх салаа замын асуулт бүрийг зөв хариулж дуусгана; сүүлийн төлөвийг буцаана. */
export async function clearRecovery(token: string, subject: string): Promise<RecoveryDto> {
  let r = await call<RecoveryDto>('GET', `/recovery/${subject}`, { token });
  while (r.question) {
    const choice = await correctIndex(r.question.id);
    r = (await call<RecoveryAnswerResponse>('POST', `/recovery/${subject}/answer`, { token, body: { questionId: r.question.id, choice } })).recovery;
  }
  return r;
}

type Msg<T extends ServerMsg['type']> = Extract<ServerMsg, { type: T }>;

/** Node 24-ийн глобал WebSocket дээрх энгийн тоглогч: ирсэн мессежийг дараалалд хадгална. */
export class WsPlayer {
  private inbox: ServerMsg[] = [];
  closed = false;

  private constructor(
    readonly name: string,
    readonly ws: WebSocket,
  ) {
    ws.addEventListener('message', (ev) => {
      try {
        this.inbox.push(JSON.parse(String(ev.data)) as ServerMsg);
      } catch {
        // "pong" гэх мэт
      }
    });
    ws.addEventListener('close', () => {
      this.closed = true;
    });
  }

  static open(name: string, duelId: number, token: string): Promise<WsPlayer> {
    return new Promise((resolve, reject) => {
      const ws = openDuelSocket(duelId, token);
      const player = new WsPlayer(name, ws);
      ws.addEventListener('open', () => resolve(player), { once: true });
      ws.addEventListener('error', () => reject(new Error(`${name}: WebSocket нээгдсэнгүй`)), { once: true });
    });
  }

  /** Тохирох эхний мессежийг дарааллаас авна (бусад мессеж дараалалдаа үлдэнэ). */
  async waitFor<T extends ServerMsg['type']>(type: T, timeoutMs = 30_000, pred?: (m: Msg<T>) => boolean): Promise<Msg<T>> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const i = this.inbox.findIndex((m) => m.type === type && (!pred || pred(m as Msg<T>)));
      if (i >= 0) return this.inbox.splice(i, 1)[0] as Msg<T>;
      await sleep(15);
    }
    throw new Error(`${this.name}: '${type}' мессеж ${timeoutMs}ms-д ирсэнгүй`);
  }

  answer(q: number, choice: number) {
    this.ws.send(JSON.stringify({ type: 'answer', q, choice }));
  }

  close() {
    this.ws.close();
  }
}
