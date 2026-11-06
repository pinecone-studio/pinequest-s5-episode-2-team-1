import { describe, expect, it } from 'vitest';
import { classWeakTopics, studentAnswers, topicLabel, type TopicAnswers } from '../src/domain/classStats';

const row = (uid: number, topic: string | null, n: number, ok: number): TopicAnswers => ({ uid, subject: 'math', topic, n, ok });

describe('classWeakTopics', () => {
  it('сурагчдын хариултыг сэдвээр нийлүүлж, муу нь эхэндээ, алдаж буй сурагчийг тоолно', () => {
    const topics = classWeakTopics([row(1, 'percent', 4, 1), row(2, 'percent', 4, 4), row(1, 'angles', 3, 3), row(2, 'angles', 1, 0), row(1, null, 5, 0)]);
    expect(topics.map((t) => t.topic)).toEqual(['percent', 'angles']);
    expect(topics[0]).toMatchObject({ answered: 8, correct: 5, percent: 63, students: 2, struggling: 1, name: 'Хувь' });
    // 1 хариулттай сурагч "алдаж байна" гэж тооцогдохгүй (хангалтгүй)
    expect(topics[1]).toMatchObject({ students: 2, struggling: 0 });
  });

  it('цөөн хариулттай сэдэв гарахгүй', () => {
    expect(classWeakTopics([row(1, 'percent', 2, 0)])).toEqual([]);
  });
});

describe('studentAnswers', () => {
  it('нийт хариулт, зөв хувь, хамгийн их алддаг сэдэв', () => {
    const rows = [row(1, 'percent', 4, 1), row(1, 'angles', 3, 2), row(2, 'percent', 4, 4)];
    expect(studentAnswers(rows, 1)).toEqual({ answered: 7, percent: 43, weakTopic: 'Хувь' });
    expect(studentAnswers(rows, 2)).toEqual({ answered: 4, percent: 100, weakTopic: null });
    expect(studentAnswers(rows, 3)).toEqual({ answered: 0, percent: null, weakTopic: null });
  });
});

describe('topicLabel', () => {
  it('сэдвийн нэр, олдохгүй бол id, холимог бол null', () => {
    expect(topicLabel('math', 'percent')).toBe('Хувь');
    expect(topicLabel('math', 'nope')).toBe('nope');
    expect(topicLabel('math', null)).toBeNull();
  });
});
