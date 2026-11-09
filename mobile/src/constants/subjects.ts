import { subjectInGrade } from '@shared/subjects';
import type { Subject } from '@shared/types';

/** Аппын идэвхтэй хичээлүүд. */
export const ACTIVE_SUBJECTS: Subject[] = ['math', 'mongolian', 'physics', 'social', 'english'];
export const PATH_SUBJECTS: Subject[] = ['math', 'physics', 'social', 'english'];
export const DUEL_SUBJECTS: Subject[] = ['math'];

/** Тухайн ангид ордог сурах замын хичээлүүд (физик, нийгэм судлал зөвхөн 7–11). */
export const pathSubjectsFor = (grade: number | null | undefined): Subject[] => PATH_SUBJECTS.filter((s) => subjectInGrade(s, grade));
export const activeSubjectsFor = (grade: number | null | undefined): Subject[] => ACTIVE_SUBJECTS.filter((s) => subjectInGrade(s, grade));

export const isActiveSubject = (value: unknown): value is Subject => ACTIVE_SUBJECTS.includes(value as Subject);
export const activeSubject = (value: unknown): Subject => (isActiveSubject(value) ? value : 'math');
