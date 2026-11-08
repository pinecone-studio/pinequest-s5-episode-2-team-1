import type { Subject } from '@shared/types';

/** Аппын идэвхтэй хичээлүүд. */
export const ACTIVE_SUBJECTS: Subject[] = ['math', 'mongolian', 'physics', 'social', 'english'];
export const PATH_SUBJECTS: Subject[] = ['math', 'physics', 'social', 'english'];
export const DUEL_SUBJECTS: Subject[] = ['math'];

export const isActiveSubject = (value: unknown): value is Subject => ACTIVE_SUBJECTS.includes(value as Subject);
export const activeSubject = (value: unknown): Subject => (isActiveSubject(value) ? value : 'math');
