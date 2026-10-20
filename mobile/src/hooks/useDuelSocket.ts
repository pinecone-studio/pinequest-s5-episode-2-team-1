import type { DuelOutcome, DuelPhase, RevealInfo, ServerMsg, Subject, WsPlayer, WsQuestion } from '@shared/types';
import { useCallback, useEffect, useRef, useState } from 'react';
import { wsUrl } from '@/api/client';

export interface DuelView {
  connection: 'connecting' | 'open' | 'reconnecting';
  phase: DuelPhase | null;
  subject: Subject | null;
  stake: number;
  players: WsPlayer[];
  question: WsQuestion | null;
  /** Асуултын нийт хугацаа (timer bar-т). */
  questionTotalMs: number;
  myAnswer: { choice: number; correct: boolean } | null;
  opponentWrong: boolean;
  reveal: RevealInfo | null;
  /** Одоогийн үе шатын төгсгөл (серверийн цагаар). */
  deadline: number | null;
  outcome: DuelOutcome | null;
}

const initial: DuelView = {
  connection: 'connecting',
  phase: null,
  subject: null,
  stake: 0,
  players: [],
  question: null,
  questionTotalMs: 20_000,
  myAnswer: null,
  opponentWrong: false,
  reveal: null,
  deadline: null,
  outcome: null,
};

function withScores(players: WsPlayer[], scores: Record<number, number>): WsPlayer[] {
  return players.map((p) => ({ ...p, score: scores[p.id] ?? p.score }));
}

function reduce(v: DuelView, msg: ServerMsg): DuelView {
  switch (msg.type) {
    case 'state':
      return {
        ...v,
        phase: msg.phase,
        subject: msg.subject,
        stake: msg.stake,
        players: msg.players,
        question: msg.question,
        myAnswer: msg.myAnswer,
        opponentWrong: false,
        reveal: msg.reveal,
        deadline: msg.deadline,
        outcome: msg.outcome ?? v.outcome,
      };
    case 'presence':
      return { ...v, players: v.players.map((p) => (p.id === msg.userId ? { ...p, connected: msg.connected } : p)) };
    case 'countdown':
      return { ...v, phase: 'countdown', deadline: msg.startsAt };
    case 'question': {
      const { type: _t, serverNow, ...question } = msg;
      return {
        ...v,
        phase: 'question',
        question,
        questionTotalMs: Math.max(1, question.endsAt - serverNow),
        myAnswer: null,
        opponentWrong: false,
        reveal: null,
        deadline: question.endsAt,
      };
    }
    case 'answer_result':
      return v.question?.q === msg.q ? { ...v, myAnswer: { choice: msg.choice, correct: msg.correct } } : v;
    case 'opponent_answered':
      return v.question?.q === msg.q && !msg.correct ? { ...v, opponentWrong: true } : v;
    case 'reveal': {
      const { type: _t, nextAt, serverNow: _s, ...reveal } = msg;
      return { ...v, phase: 'reveal', reveal, players: withScores(v.players, reveal.scores), deadline: nextAt };
    }
    case 'finished':
      return { ...v, phase: 'finished', outcome: msg.outcome, players: withScores(v.players, msg.outcome.scores), deadline: null };
    case 'cancelled':
      return { ...v, phase: 'cancelled', outcome: msg.outcome, deadline: null };
    default:
      return v;
  }
}

/**
 * DuelRoom-той WebSocket холболт. Салвал (тоглолт дуусаагүй бол) дахин холбогдоно; сервер
 * snapshot илгээж одоогийн байдлыг сэргээнэ. Цагийн зөрүүг serverNow-оор засна.
 */
export function useDuelSocket(duelId: number) {
  const [view, setView] = useState<DuelView>(initial);
  const wsRef = useRef<WebSocket | null>(null);
  const offsetRef = useRef(0);
  const doneRef = useRef(false);

  useEffect(() => {
    let alive = true;
    let attempt = 0;
    let retry: ReturnType<typeof setTimeout> | undefined;

    const connect = () => {
      const ws = new WebSocket(wsUrl(`/duels/${duelId}/ws`));
      wsRef.current = ws;
      ws.onopen = () => {
        attempt = 0;
        setView((v) => ({ ...v, connection: 'open' }));
      };
      ws.onmessage = (ev) => {
        let msg: ServerMsg;
        try {
          msg = JSON.parse(String(ev.data)) as ServerMsg;
        } catch {
          return; // "pong"
        }
        if ('serverNow' in msg) offsetRef.current = msg.serverNow - Date.now();
        if (msg.type === 'finished' || msg.type === 'cancelled') doneRef.current = true;
        if (msg.type === 'state' && msg.outcome) doneRef.current = true;
        setView((v) => reduce(v, msg));
      };
      ws.onclose = () => {
        if (!alive || doneRef.current) return;
        setView((v) => ({ ...v, connection: 'reconnecting' }));
        retry = setTimeout(connect, Math.min(500 * 2 ** attempt++, 4000));
      };
    };

    connect();
    const ping = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) wsRef.current.send('ping');
    }, 20_000);

    return () => {
      alive = false;
      clearTimeout(retry);
      clearInterval(ping);
      wsRef.current?.close();
    };
  }, [duelId]);

  const answer = useCallback((q: number, choice: number) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) wsRef.current.send(JSON.stringify({ type: 'answer', q, choice }));
  }, []);

  const serverNow = useCallback(() => Date.now() + offsetRef.current, []);

  return { view, answer, serverNow };
}
