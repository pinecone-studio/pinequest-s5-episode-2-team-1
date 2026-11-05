import { describe, expect, it } from 'vitest';
import { TEACHER } from '../src/config/teacher';
import { effectivePhase, nextStep, percentOf, quizPoints } from '../src/domain/quiz';

const { QUESTION_MS, POINTS_MAX, POINTS_MIN } = TEACHER.QUIZ;

describe('quizPoints', () => {
  it('хурдан бол их, хугацааны төгсгөлд бага, хэтэрвэл MIN-ээс доош орохгүй', () => {
    expect(quizPoints(0)).toBe(POINTS_MAX);
    expect(quizPoints(QUESTION_MS / 2)).toBe((POINTS_MAX + POINTS_MIN) / 2);
    expect(quizPoints(QUESTION_MS)).toBe(POINTS_MIN);
    expect(quizPoints(QUESTION_MS * 3)).toBe(POINTS_MIN);
    expect(quizPoints(-50)).toBe(POINTS_MAX);
  });
});

describe('effectivePhase', () => {
  it('хугацаа дуусвал эсвэл бүгд хариулбал reveal', () => {
    expect(effectivePhase('question', 0, 1, 3, 1000)).toBe('question');
    expect(effectivePhase('question', 0, 1, 3, QUESTION_MS)).toBe('reveal');
    expect(effectivePhase('question', 0, 3, 3, 1000)).toBe('reveal');
    // тоглогчгүй өрөөнд хугацааг хүлээнэ
    expect(effectivePhase('question', 0, 0, 0, 1000)).toBe('question');
    expect(effectivePhase('lobby', 0, 0, 0, QUESTION_MS * 9)).toBe('lobby');
  });
});

describe('nextStep', () => {
  it('lobby → асуулт → хариу → дараагийн асуулт → дуусна', () => {
    expect(nextStep('lobby', -1, 2)).toEqual({ phase: 'question', q: 0 });
    expect(nextStep('question', 0, 2)).toEqual({ phase: 'reveal', q: 0 });
    expect(nextStep('reveal', 0, 2)).toEqual({ phase: 'question', q: 1 });
    expect(nextStep('reveal', 1, 2)).toEqual({ phase: 'finished', q: 1 });
    expect(nextStep('finished', 1, 2)).toEqual({ phase: 'finished', q: 1 });
  });
});

it('percentOf', () => {
  expect(percentOf(0, 0)).toBeNull();
  expect(percentOf(2, 3)).toBe(67);
});
