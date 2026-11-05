// Багшийн хэсэг ба ангийн шууд тэмцээний (Kahoot маягийн) API гэрээ. api ба mobile хоёулаа `import type`-аар хэрэглэнэ.
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
}

export interface TeacherClassDetailResponse {
  class: TeacherClassDto;
  students: StudentStatDto[];
  /** Ангийн хамгийн их алддаг сэдвүүд (муу нь эхэндээ) */
  weakTopics: TopicStatDto[];
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
  question: { prompt: string; options: string[] } | null;
  /** Асуултын хугацаа дуусах агшин (question үед) */
  endsAt: number | null;
  questionMs: number;
  /** Зөвхөн reveal, finished үед */
  correctIndex: number | null;
  explanation: string | null;
  answered: number;
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
