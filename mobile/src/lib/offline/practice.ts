import type { AnswerResponse, Subject, TaskDto } from '@shared/types';
import bank from './questions.json';

/**
 * Офлайн дасгал: интернэтгүй үед даалгаврыг апп дотор багтсан асуултаар (scripts/offline-questions.ts) хийнэ.
 * Хариуг утсан дээр шалгана; XP, зөгийн бал, дараалал цуглуулахгүй тул сервертэй тааруулах зүйлгүй.
 */
interface OfflineQuestion {
  id: number;
  tier: number;
  subject: string;
  /** сурах бичгийн хичээлийн асуулт: зөвхөн энэ ангид (сервертэй ижил) */
  grade?: number;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

const QUESTIONS = bank as OfflineQuestion[];

/** Хичээл бүрийн сүүлд гарсан асуултууд (апп хаагдтал): дараалсан дасгалд давтагдахгүй. */
const recentBy = new Map<string, number[]>();

export interface Practice {
  task: TaskDto;
  answer(questionId: number, choice: number): AnswerResponse & { correctCount: number };
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Хэрэглэгчийн түвшин, ангийн `size` асуулттай дасгал; хүрэлцэхгүй бол null. */
export function startPractice(tier: number, grade: number, subject: Subject, size: number): Practice | null {
  const pool = QUESTIONS.filter((q) => q.tier === tier && q.subject === subject && (q.grade === undefined || q.grade === grade));
  if (pool.length < size) return null;
  const key = `${tier}/${grade}/${subject}`;
  const recent = recentBy.get(key) ?? [];
  recentBy.set(key, recent);
  const fresh = shuffle(pool.filter((q) => !recent.includes(q.id)));
  const picked = fresh.length >= size ? fresh.slice(0, size) : [...fresh, ...shuffle(pool.filter((q) => !fresh.includes(q)))].slice(0, size);
  recent.push(...picked.map((q) => q.id));
  recent.splice(0, Math.max(0, recent.length - (pool.length - size)));

  const answers = new Map<number, boolean>();
  return {
    task: {
      id: -1,
      subject,
      status: 'in_progress',
      questions: picked.map((q) => ({ id: q.id, prompt: q.prompt, options: q.options, answered: false })),
      answeredCount: 0,
      correctCount: 0,
    },
    answer(questionId, choice) {
      const q = picked.find((x) => x.id === questionId)!;
      const correct = choice === q.correctIndex;
      answers.set(questionId, correct);
      return {
        correct,
        correctIndex: q.correctIndex,
        explanation: q.explanation,
        finished: answers.size === picked.length,
        correctCount: [...answers.values()].filter(Boolean).length,
      };
    },
  };
}
