import type { QuizPhase } from '../../../shared/teacher';
import { TEACHER } from '../config/teacher';

const { QUESTION_MS, POINTS_MAX, POINTS_MIN } = TEACHER.QUIZ;

/** Зөв хариултын оноо: асуулт гарсан даруйд POINTS_MAX, хугацааны төгсгөлд POINTS_MIN (Kahoot шиг хурд чухал). */
export function quizPoints(elapsedMs: number, totalMs: number = QUESTION_MS): number {
  const left = Math.min(1, Math.max(0, 1 - elapsedMs / totalMs));
  return Math.round(POINTS_MIN + (POINTS_MAX - POINTS_MIN) * left);
}

/**
 * Хадгалсан үе + цаг → бодит үе. Асуултын хугацаа дууссан эсвэл бүгд хариулсан бол багш "Дараах"-ыг дараагүй ч
 * зөв хариуг харуулна (DB-д бичихгүй: хэн ч асуусан ижил үр дүн).
 */
export function effectivePhase(stored: QuizPhase, phaseAt: number, answered: number, players: number, now: number): QuizPhase {
  if (stored !== 'question') return stored;
  if (now >= phaseAt + QUESTION_MS) return 'reveal';
  if (players > 0 && answered >= players) return 'reveal';
  return 'question';
}

/** Багш "Дараах" дарахад шилжих үе ба асуултын дугаар. */
export function nextStep(phase: QuizPhase, q: number, total: number): { phase: QuizPhase; q: number } {
  if (phase === 'lobby') return { phase: 'question', q: 0 };
  if (phase === 'question') return { phase: 'reveal', q };
  if (phase === 'reveal' && q + 1 < total) return { phase: 'question', q: q + 1 };
  return { phase: 'finished', q };
}

/** Хариултын зөв хувь (0..100); хариулаагүй бол null. */
export const percentOf = (correct: number, answered: number) => (answered > 0 ? Math.round((100 * correct) / answered) : null);
