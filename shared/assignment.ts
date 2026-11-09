// Багшийн даалгавар: багш ангидаа асуултын багц өгч, сурагчид хугацаандаа өөрсдийн цагаар хийнэ. api ба mobile хоёулаа.
import type { Subject } from './types';

/** Багшид: нэг даалгавар ба ангийн гүйцэтгэл. */
export interface AssignmentDto {
  id: number;
  subject: Subject;
  /** Сэдвийн нэр; холимог бол null */
  topicName: string | null;
  total: number;
  /** Сүүлийн өдөр (UB, YYYY-MM-DD) */
  dueDay: string;
  open: boolean;
  /** Бүх асуултаа хийсэн сурагч */
  done: number;
  students: number;
  /** Өгсөн хариултын зөв хувь; хариулт алга бол null */
  percent: number | null;
  /** Дуусгаагүй сурагчдын нэр */
  missing: string[];
}

/** Сурагчид: ангийн нээлттэй даалгавар ба миний явц. */
export interface AssignmentCardDto {
  id: number;
  subject: Subject;
  topicName: string | null;
  total: number;
  dueDay: string;
  answered: number;
  correct: number;
}

export interface AssignmentsResponse {
  assignments: AssignmentCardDto[];
}

export interface AssignmentAnswerDto {
  choice: number;
  correct: boolean;
  correctIndex: number;
  explanation: string | null;
}

/** Сурагч даалгавраа хийх дэлгэц: асуултууд ба өгсөн хариултууд (дарааллаар). */
export interface AssignmentView {
  id: number;
  subject: Subject;
  topicName: string | null;
  dueDay: string;
  open: boolean;
  /** image: зурагтай асуултын PNG/WebP data URI. */
  questions: { prompt: string; options: string[]; image?: string }[];
  answers: AssignmentAnswerDto[];
}
