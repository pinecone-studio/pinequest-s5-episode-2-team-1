import { describe, expect, it } from 'vitest';
import { subjectInGrade } from '../../shared/subjects';

describe('subjectInGrade', () => {
  it('offers physics and social only in grades 7–11', () => {
    for (const subject of ['physics', 'social'] as const) {
      expect(subjectInGrade(subject, 6)).toBe(false);
      expect(subjectInGrade(subject, 7)).toBe(true);
      expect(subjectInGrade(subject, 11)).toBe(true);
      expect(subjectInGrade(subject, 12)).toBe(false);
    }
  });
  it('offers the other subjects in every grade, and everything when the grade is unknown', () => {
    for (const grade of [6, 9, 12]) for (const subject of ['math', 'english', 'mongolian'] as const) expect(subjectInGrade(subject, grade)).toBe(true);
    expect(subjectInGrade('physics', null)).toBe(true);
  });
});
