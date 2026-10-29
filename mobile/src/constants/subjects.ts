import type { Subject } from '@shared/types';

/** Аппын идэвхтэй хичээлүүд. `physics` хуучин өгөгдөл унших төрөлд л үлдэнэ. */
export const ACTIVE_SUBJECTS: Subject[] = ['math', 'mongolian'];
export const PATH_SUBJECTS: Subject[] = ['math'];
export const DUEL_SUBJECTS: Subject[] = ['math'];

export const isActiveSubject = (value: unknown): value is Subject => ACTIVE_SUBJECTS.includes(value as Subject);
export const activeSubject = (value: unknown): Subject => (isActiveSubject(value) ? value : 'math');
