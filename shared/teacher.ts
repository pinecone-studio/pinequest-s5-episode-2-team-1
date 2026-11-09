// Багшийн хэсэг ба ангийн шууд тэмцээний (Kahoot маягийн) API гэрээ. api ба mobile хоёулаа `import type`-аар хэрэглэнэ.
import type { AssignmentDto } from './assignment';
import type { BearLook, Subject } from './types';

/** Багшийн нэг анги (жагсаалтад). code: сурагчид нэгдэх 6 оронтой код. */
export interface TeacherClassDto {
  code: string;
  name: string;
  students: number;
  maxStudents: number;
  /** Энэ ангид одоо явж буй тэмцээн (байхгүй бол null) */
  liveQuizId: number | null;
}

export interface TeacherClassesResponse {
  /** Багшийн заадаг хичээл; сонгоогүй бол null (нүүр эхлээд хичээл асууна) */
  subject: Subject | null;
  classes: TeacherClassDto[];
}

/** Нэг сэдвийн нийт хариултын зөв хувь. */
export interface TopicStatDto {
  subject: Subject;
  topic: string;
  name: string;
  answered: number;
  correct: number;
  /** 0..100 */
  percent: number;
  /** Энэ сэдвээр хариулсан сурагч */
  students: number;
  /** Үүнээс STRUGGLE_PERCENT-аас доош зөвтэй (алдаж байгаа) сурагч */
  struggling: number;
}

export interface StudentStatDto {
  code: string;
  name: string;
  grade: number;
  look: BearLook;
  answered: number;
  /** 0..100; хариулаагүй бол null */
  percent: number | null;
  /** Хамгийн их алддаг сэдэв (хангалттай хариулаагүй бол null) */
  weakTopic: string | null;
  /** Өдөр дараалан даалгавар хийсэн тоо (тасарсан бол 0) */
  streak: number;
}

export interface TeacherClassDetailResponse {
  class: TeacherClassDto;
  subject: Subject | null;
  students: StudentStatDto[];
  /** Ангийн хамгийн их алддаг сэдвүүд (муу нь эхэндээ): өдрийн даалгавар, тэмцээн, багшийн даалгавар нийлээд */
  weakTopics: TopicStatDto[];
  /** Сүүлийн даалгаврууд (шинэ нь эхэндээ) */
  assignments: AssignmentDto[];
}

export type QuizPhase = 'lobby' | 'question' | 'reveal' | 'finished';

export interface QuizRankDto {
  name: string;
  look: BearLook;
  score: number;
  isMe: boolean;
}

/** Тэмцээний одоогийн байдал. Багш (isHost) ба сурагч хоёулаа 1 секунд тутам асууна. */
export interface QuizView {
  id: number;
  className: string;
  classCode: string;
  subject: Subject;
  phase: QuizPhase;
  /** Одоогийн асуулт (0-ээс); хүлээлгийн өрөөнд -1 */
  q: number;
  total: number;
  /** image: зурагтай асуултын PNG/WebP data URI. */
  question: { prompt: string; options: string[]; image?: string } | null;
  /** Асуултын хугацаа дуусах агшин (question үед) */
  endsAt: number | null;
  questionMs: number;
  /** Зөвхөн reveal, finished үед */
  correctIndex: number | null;
  explanation: string | null;
  answered: number;
  /** Хариулт бүрийг хэдэн хүн сонгосон (reveal, finished үед) */
  counts: number[] | null;
  players: number;
  isHost: boolean;
  joined: boolean;
  /** Миний энэ асуултын хариулт; зөв эсэх нь reveal үед л харагдана */
  mine: { choice: number; correct: boolean | null; points: number | null } | null;
  board: QuizRankDto[];
}

export interface QuizActiveResponse {
  quizId: number | null;
}
