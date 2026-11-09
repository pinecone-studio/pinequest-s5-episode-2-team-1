import type { Subject } from './types';

/**
 * Хичээл аль ангид ордог (хаалттай хүрээ). Физик, нийгэм судлал зөвхөн 7–11-р ангид: бусад ангид сурах бичиг, сурах
 * зам, бэлэн асуулт байхгүй. Энд байхгүй хичээл бүх ангид. Апп сонголтоос хасна, сервер даалгавар эхлүүлэхгүй.
 */
export const SUBJECT_GRADES: Partial<Record<Subject, readonly [from: number, to: number]>> = {
  physics: [7, 11],
  social: [7, 11],
};

/** Энэ ангид энэ хичээл ордог эсэх (анги тодорхойгүй бол тийм). */
/** Сервер: тухайн ангид ордоггүй хичээлээр даалгавар эхлүүлэхэд өгөх мессеж. */
export const SUBJECT_NOT_IN_GRADE_MESSAGE = 'Энэ хичээл таны ангид ордоггүй';

export function subjectInGrade(subject: Subject, grade: number | null | undefined): boolean {
  const range = SUBJECT_GRADES[subject];
  return !range || grade == null || (grade >= range[0] && grade <= range[1]);
}
