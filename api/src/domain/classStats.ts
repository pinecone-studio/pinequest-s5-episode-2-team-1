import type { TopicStatDto } from '../../../shared/teacher';
import type { Subject } from '../../../shared/types';
import { TEACHER } from '../config/teacher';
import { TOPICS } from '../config/topics';
import { percentOf } from './quiz';

/** Нэг сурагчийн нэг сэдвийн нийт хариулт: өдрийн даалгавар, ангийн тэмцээн, багшийн даалгавар нийлээд. */
export interface TopicAnswers {
  uid: number;
  subject: Subject;
  topic: string | null;
  n: number;
  ok: number;
}

const enough = (r: TopicAnswers) => r.n >= TEACHER.MIN_TOPIC_ANSWERS;

/** Сэдвийн нэр (аль ч түвшнийх); олдохгүй бол id-г нь. */
export function topicLabel(subject: Subject, topic: string | null): string | null {
  if (!topic) return null;
  for (const tier of [1, 2, 3] as const) {
    const hit = TOPICS[tier][subject]?.find((t) => t.id === topic);
    if (hit) return hit.name;
  }
  return topic;
}

/** Ангийн сул сэдвүүд: муу нь эхэндээ, тус бүрд хэдэн сурагч алдаж байгаатай. */
export function classWeakTopics(rows: TopicAnswers[]): TopicStatDto[] {
  const byTopic = new Map<string, TopicStatDto>();
  for (const r of rows) {
    if (!r.topic) continue;
    const key = `${r.subject}:${r.topic}`;
    const t = byTopic.get(key) ?? {
      subject: r.subject,
      topic: r.topic,
      name: topicLabel(r.subject, r.topic) ?? r.topic,
      answered: 0,
      correct: 0,
      percent: 0,
      students: 0,
      struggling: 0,
    };
    t.answered += r.n;
    t.correct += r.ok;
    t.students += 1;
    if (enough(r) && (percentOf(r.ok, r.n) ?? 100) < TEACHER.STRUGGLE_PERCENT) t.struggling += 1;
    byTopic.set(key, t);
  }
  return [...byTopic.values()]
    .filter((t) => t.answered >= TEACHER.MIN_TOPIC_ANSWERS)
    .map((t) => ({ ...t, percent: percentOf(t.correct, t.answered) ?? 0 }))
    .sort((a, b) => a.percent - b.percent || b.answered - a.answered)
    .slice(0, TEACHER.WEAK_TOPICS);
}

/** Нэг сурагчийн нийт хариулт, зөв хувь, хамгийн их алддаг сэдэв. */
export function studentAnswers(rows: TopicAnswers[], uid: number) {
  const mine = rows.filter((r) => r.uid === uid);
  const answered = mine.reduce((n, r) => n + r.n, 0);
  const weak = mine.filter((r) => r.topic && enough(r) && r.ok < r.n).sort((a, b) => a.ok / a.n - b.ok / b.n)[0];
  return {
    answered,
    percent: percentOf(
      mine.reduce((n, r) => n + r.ok, 0),
      answered,
    ),
    weakTopic: weak ? topicLabel(weak.subject, weak.topic) : null,
  };
}
