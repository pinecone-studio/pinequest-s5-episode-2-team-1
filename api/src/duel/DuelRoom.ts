import { DurableObject } from 'cloudflare:workers';
import type { ClientMsg, ServerMsg } from '../../../shared/types';
import type { Bindings } from '../env';
import { settleDuel } from '../services/duels';
import { createDuel, type DuelInit, type DuelState, nextDeadline, onAnswer, onConnect, onDisconnect, onTick, type Step, teamOf } from './engine';

interface Attachment {
  userId: number;
  connId: string;
}

const SETTLE_RETRY_MS = 3_000;

/**
 * Нэг тулааны өрөө (server-authoritative). WebSocket Hibernation API ашиглана: DO санах ойгоос
 * гарсан ч socket холбоотой үлдэнэ, тиймээс state-ийг storage-д, бүх таймерыг alarm-д хадгална.
 */
export class DuelRoom extends DurableObject<Bindings> {
  private state: DuelState | null = null;

  constructor(ctx: DurableObjectState, env: Bindings) {
    super(ctx, env);
    void ctx.blockConcurrencyWhile(async () => {
      this.state = (await ctx.storage.get<DuelState>('state')) ?? null;
    });
    // Клиентийн "ping"-д DO-г сэрээлгүйгээр хариулна.
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
  }

  /** Worker сорилтыг хүлээн авсны дараа нэг удаа дуудна (RPC). */
  async init(init: DuelInit): Promise<void> {
    if (this.state) return;
    await this.commit({ state: createDuel(init, Date.now()), out: [] });
  }

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
      return new Response('Expected WebSocket', { status: 426 });
    }
    const userId = Number(request.headers.get('X-User-Id'));
    if (!this.state) return new Response('Duel is not ready', { status: 409 });
    if (!this.state.players.some((p) => p.id === userId)) return new Response('Forbidden', { status: 403 });

    // Нэг тоглогч нэг л холболттой: хуучныг нь хаана.
    for (const old of this.ctx.getWebSockets(String(userId))) {
      try {
        old.close(4000, 'replaced');
      } catch {
        // аль хэдийн хаагдсан
      }
    }
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    const connId = crypto.randomUUID();
    this.ctx.acceptWebSocket(server, [String(userId)]);
    server.serializeAttachment({ userId, connId } satisfies Attachment);
    await this.commit(onConnect(this.state, userId, connId, Date.now()));
    // Клиент ['bearer', token] subprotocol-оор холбогдсон тул сонгосныг буцаана (үгүй бол клиент холболтыг хаана).
    return new Response(null, { status: 101, webSocket: client, headers: { 'Sec-WebSocket-Protocol': 'bearer' } });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    if (!this.state) return;
    const att = ws.deserializeAttachment() as Attachment | null;
    if (!att) return;
    let msg: ClientMsg;
    try {
      msg = JSON.parse(typeof message === 'string' ? message : new TextDecoder().decode(message)) as ClientMsg;
    } catch {
      return;
    }
    if (msg?.type === 'answer') {
      await this.commit(onAnswer(this.state, att.userId, Number(msg.q), Number(msg.choice), Date.now()));
    }
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    // Клиентийн close frame-д хариулж handshake-ийг дуусгана.
    try {
      ws.close(1000, 'closed');
    } catch {
      // аль хэдийн хаагдсан
    }
    await this.socketGone(ws);
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    await this.socketGone(ws);
  }

  async alarm(): Promise<void> {
    if (!this.state) return;
    if (this.state.settlement && !this.state.settled) {
      await this.settle();
      return;
    }
    await this.commit(onTick(this.state, Date.now()));
  }

  private async socketGone(ws: WebSocket) {
    if (!this.state) return;
    const att = ws.deserializeAttachment() as Attachment | null;
    if (att) await this.commit(onDisconnect(this.state, att.userId, att.connId, Date.now()));
  }

  private send(to: number | 'all', msg: ServerMsg) {
    const data = JSON.stringify(msg);
    for (const ws of to === 'all' ? this.ctx.getWebSockets() : this.ctx.getWebSockets(String(to))) {
      try {
        ws.send(data);
      } catch {
        // хаагдаж буй socket
      }
    }
  }

  private async commit(step: Step) {
    this.state = step.state;
    await this.ctx.storage.put('state', this.state);
    for (const o of step.out) this.send(o.to, o.msg);
    if (this.state.settlement && !this.state.settled) {
      await this.settle();
      return;
    }
    const next = nextDeadline(this.state);
    if (next !== null) await this.ctx.storage.setAlarm(next);
    else await this.ctx.storage.deleteAlarm();
  }

  /** Үр дүнг D1-д бичээд бүх тоглогчид шинэ оноотой нь зэрэг илгээнэ. Амжилтгүй бол alarm-аар давтана. */
  private async settle() {
    const s = this.state;
    if (!s?.settlement || !s.outcome) return;
    try {
      const points = await settleDuel(
        this.env.DB,
        { id: s.duelId, stake: s.stake, teamSize: s.teamSize ?? 1, players: s.players.map((p) => ({ id: p.id, team: teamOf(s, p.id) })) },
        s.settlement,
        s.outcome.reason,
        s.scores,
      );
      s.outcome.points = points;
      s.settled = true;
      await this.ctx.storage.put('state', s);
      await this.ctx.storage.deleteAlarm();
      this.send('all', s.phase === 'cancelled' ? { type: 'cancelled', outcome: s.outcome } : { type: 'finished', outcome: s.outcome });
    } catch (e) {
      console.error('[duel] settle failed, retrying', e);
      await this.ctx.storage.setAlarm(Date.now() + SETTLE_RETRY_MS);
    }
  }
}
