import { describe, expect, it } from 'vitest';
import { ACTIVE_SUBJECTS, DUEL_SUBJECTS, SUBJECTS } from '../src/config/game';

describe('тулааны хичээл', () => {
  it('зөвхөн математикийг дэмжинэ', () => {
    expect(DUEL_SUBJECTS).toEqual(['math']);
    expect(DUEL_SUBJECTS).not.toContain('mongolian');
    expect(DUEL_SUBJECTS).not.toContain('physics');
  });

  it('физикийг public урсгалаас хассан ч хуучин өгөгдлийн төрөлд хэвээр үлдээнэ', () => {
    expect(ACTIVE_SUBJECTS).toEqual(['math', 'mongolian']);
    expect(ACTIVE_SUBJECTS).not.toContain('physics');
    expect(SUBJECTS).toContain('physics');
  });
});
