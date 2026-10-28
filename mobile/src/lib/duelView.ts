import type { DuelOutcome, DuelPhase, RevealInfo, ServerMsg, Subject, WsPlayer, WsQuestion } from '@shared/types';

/** Тулааны өрөөний харагдац: серверийн мессеж бүрийг (ServerMsg) хуучин төлөв дээр хэрэглэнэ. */
export interface DuelView {
  /** replaced: өөр төхөөрөмж энэ тулаанд орсон; failed: олон удаа оролдоод холбогдсонгүй. */
  connection: 'connecting' | 'open' | 'reconnecting' | 'replaced' | 'failed';
  phase: DuelPhase | null;
  subject: Subject | null;
  stake: number;
  /** 1 = 1 vs 1, 2–5 = багийн тулаан */
  teamSize: number;
  players: WsPlayer[];
  question: WsQuestion | null;
  /** Асуултын нийт хугацаа (timer bar-т). */
  questionTotalMs: number;
  myAnswer: { choice: number; correct: boolean } | null;
  opponentWrong: boolean;
  /** Одоогийн асуултад бусад тоглогчийн хариулт: userId → зөв эсэх. */
  answered: Record<number, boolean>;
  reveal: RevealInfo | null;
  /** Одоогийн үе шатын төгсгөл (серверийн цагаар). */
  deadline: number | null;
  outcome: DuelOutcome | null;
}

export const initialDuelView: DuelView = {
  connection: 'connecting',
  phase: null,
  subject: null,
  stake: 0,
  teamSize: 1,
  players: [],
  question: null,
  questionTotalMs: 20_000,
  myAnswer: null,
  opponentWrong: false,
  answered: {},
  reveal: null,
  deadline: null,
  outcome: null,
};

function withScores(players: WsPlayer[], scores: Record<number, number>): WsPlayer[] {
  return players.map((p) => ({ ...p, score: scores[p.id] ?? p.score }));
}

export function reduceDuelView(v: DuelView, msg: ServerMsg): DuelView {
  switch (msg.type) {
    case 'state':
      return {
        ...v,
        phase: msg.phase,
        subject: msg.subject,
        stake: msg.stake,
        teamSize: msg.teamSize ?? 1,
        players: msg.players,
        question: msg.question,
        myAnswer: msg.myAnswer,
        opponentWrong: false,
        answered: {},
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
        answered: {},
        reveal: null,
        deadline: question.endsAt,
      };
    }
    case 'answer_result':
      return v.question?.q === msg.q ? { ...v, myAnswer: { choice: msg.choice, correct: msg.correct } } : v;
    case 'opponent_answered':
      if (v.question?.q !== msg.q) return v;
      return { ...v, opponentWrong: v.opponentWrong || !msg.correct, answered: { ...v.answered, [msg.userId]: msg.correct } };
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

