import { describe, expect, it } from 'vitest';
import { ACTIVE_SUBJECTS, DUEL_SUBJECTS, SUBJECTS } from '../src/config/game';

describe('тулааны хичээл', () => {
  it('зөвхөн математикийг дэмжинэ', () => {
    expect(DUEL_SUBJECTS).toEqual(['math']);
    expect(DUEL_SUBJECTS).not.toContain('mongolian');
    expect(DUEL_SUBJECTS).not.toContain('physics');
  });

  it('идэвхтэй хичээлүүд бүгд үндсэн төрөлд байна', () => {
    expect(ACTIVE_SUBJECTS).toEqual(['math', 'mongolian', 'physics', 'chemistry', 'social', 'english']);
    for (const s of ACTIVE_SUBJECTS) expect(SUBJECTS).toContain(s);
  });
});
