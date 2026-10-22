// Ганцаараа нэг утсаар тулааныг турших бот тоглогч (WebSocket-оор холбогдож санамсаргүй хугацаанд хариулна).
//   npm run bot                               # лобби дахь эхний сорилтыг хүлээн авна (7-р анги → Түвшин 1)
//   npm run bot -- --create math --stake 3    # өөрөө сорилт үүсгээд хүлээнэ (math | mongolian | physics)
//   --user bot1 --grade 7                     # нэр, анги (анхдагч: санамсаргүй нэр, 7-р анги)
//   --accuracy 0.6                            # зөв хариулах магадлал (ADMIN_TOKEN-оор зөв хариуг харна)
//   --min 2 --max 8                           # хариулах хугацаа, секундээр
//   --loop                                    # тулаан дуусмагц дахин эхэлнэ
//   --url http://192.168.x.x:8787             # өөр сервер
import type { AuthResponse, DuelResponse, LobbyResponse, ServerMsg } from '../../shared/types';
import { ADMIN_TOKEN, API_URL, arg, call, flag, HttpError, openDuelSocket, sleep } from './lib';

const USER = arg('user') ?? `bot_${Math.random().toString(36).slice(2, 7)}`;
const PASS = arg('pass', 'bot-pass-123')!;
const GRADE = Number(arg('grade', '7'));
const ACCURACY = Number(arg('accuracy', '0.5'));
const MIN_S = Number(arg('min', '2'));
const MAX_S = Number(arg('max', '8'));
const CREATE = arg('create');
const STAKE = arg('stake');

const log = (...a: unknown[]) => console.log(`[${new Date().toLocaleTimeString()}] 🤖`, ...a);

async function login(): Promise<AuthResponse> {
  try {
    return await call<AuthResponse>('POST', '/auth/login', { body: { username: USER, password: PASS } });
  } catch (e) {
    if (!(e instanceof HttpError) || e.code !== 'INVALID_CREDENTIALS') throw e;
    return call<AuthResponse>('POST', '/auth/register', { body: { username: USER, password: PASS, grade: GRADE } });
  }
}

/** Тулааны id-г олно: үүсгээд хүлээн авахыг хүлээнэ, эсвэл лобби дахь сорилтыг хүлээн авна. */
async function findDuel(token: string): Promise<number> {
  if (CREATE) {
    const lobby = await call<LobbyResponse>('GET', '/duels', { token });
    let duelId = lobby.mine?.id;
    if (!duelId) {
      const stake = STAKE ? Number(STAKE) : Math.max(1, Math.min(3, lobby.maxStake));
      duelId = (await call<DuelResponse>('POST', '/duels', { token, body: { subject: CREATE, stake } })).duel.id;
      log(`сорилт #${duelId} үүсгэлээ (${CREATE}, ${stake} оноо). Утаснаасаа хүлээн авна уу…`);
    }
    for (;;) {
      const l = await call<LobbyResponse>('GET', '/duels', { token });
      if (l.mine?.id === duelId && l.mine.status === 'accepted') return duelId;
      if (!l.mine) throw new Error('Сорилт цуцлагдсан');
      await sleep(1500);
    }
  }
  log('лобби дээр сорилт хайж байна…');
  for (;;) {
    const l = await call<LobbyResponse>('GET', '/duels', { token });
    if (l.mine?.status === 'accepted') return l.mine.id;
    const target = l.open.find((d) => d.stake <= l.maxStake);
    if (target) {
      try {
        await call('POST', `/duels/${target.id}/accept`, { token });
        log(`#${target.id} хүлээн авлаа: ${target.subject}, ${target.stake} оноо, үүсгэгч ${target.creator.username}`);
        return target.id;
      } catch (e) {
        log('хүлээн авч чадсангүй:', e instanceof Error ? e.message : e);
      }
    }
    await sleep(2000);
  }
}

async function chooseAnswer(questionId: number, optionCount: number): Promise<number> {
  const random = Math.floor(Math.random() * optionCount);
  if (!ADMIN_TOKEN) return random;
  try {
    const { correctIndex } = await call<{ correctIndex: number }>('GET', `/admin/questions/${questionId}`, { admin: true });
    if (Math.random() < ACCURACY) return correctIndex;
    return (correctIndex + 1 + Math.floor(Math.random() * (optionCount - 1))) % optionCount;
  } catch {
    return random;
  }
}

function play(auth: AuthResponse, duelId: number): Promise<void> {
  return new Promise((resolve) => {
    const ws = openDuelSocket(duelId, auth.token);
    const ping = setInterval(() => ws.readyState === WebSocket.OPEN && ws.send('ping'), 20_000);
    const answered = new Set<number>();

    const answerLater = async (q: number, questionId: number, optionCount: number) => {
      if (answered.has(q)) return;
      answered.add(q);
      await sleep((MIN_S + Math.random() * (MAX_S - MIN_S)) * 1000);
      const choice = await chooseAnswer(questionId, optionCount);
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'answer', q, choice }));
    };
    const done = () => {
      clearInterval(ping);
      resolve();
    };

    ws.addEventListener('message', (ev) => {
      let msg: ServerMsg;
      try {
        msg = JSON.parse(String(ev.data)) as ServerMsg;
      } catch {
        return;
      }
      switch (msg.type) {
        case 'state':
          log(`өрөөнд орлоо (${msg.phase}), өрсөлдөгч: ${msg.players.find((p) => p.id !== auth.me.id)?.username}`);
          if (msg.phase === 'question' && msg.question && !msg.myAnswer) void answerLater(msg.question.q, msg.question.questionId, msg.question.options.length);
          break;
        case 'countdown':
          log('3… 2… 1…');
          break;
        case 'question':
          log(`Асуулт ${msg.q + 1}/${msg.total}: ${msg.prompt}`);
          void answerLater(msg.q, msg.questionId, msg.options.length);
          break;
        case 'answer_result':
          log(msg.correct ? '  бот: зөв ✓' : '  бот: буруу ✕');
          break;
        case 'opponent_answered':
          log(msg.correct ? '  өрсөлдөгч: зөв ✓' : '  өрсөлдөгч: буруу ✕');
          break;
        case 'reveal': {
          const who = msg.winnerId === auth.me.id ? 'бот авлаа' : msg.winnerId ? 'өрсөлдөгч авлаа' : 'хэн ч аваагүй';
          log(`  → ${who}. Оноо: бот ${msg.scores[auth.me.id] ?? 0}`);
          break;
        }
        case 'finished': {
          const o = msg.outcome;
          const verdict = o.winnerId === null ? 'тэнцлээ' : o.winnerId === auth.me.id ? 'бот яллаа 🏆' : 'бот ялагдлаа';
          log(`Дууслаа: ${verdict} (${o.reason}). Ботын оноо: ${o.points[auth.me.id]}`);
          ws.close();
          done();
          break;
        }
        case 'cancelled':
          log('Цуцлагдлаа (өрсөлдөгч ирээгүй), бооцоо буцлаа.');
          ws.close();
          done();
          break;
      }
    });
    ws.addEventListener('close', done);
    ws.addEventListener('error', () => log('WebSocket алдаа'));
  });
}

async function main() {
  const auth = await login();
  log(`${API_URL} — ${auth.me.username} (Түвшин ${auth.me.tier}, ${auth.me.points} оноо), зөв хариулах магадлал ${ADMIN_TOKEN ? ACCURACY : 'санамсаргүй'}`);
  do {
    const duelId = await findDuel(auth.token);
    await play(auth, duelId);
    await sleep(1000);
  } while (flag('loop'));
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
