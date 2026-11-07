import { describe, expect, it } from 'vitest';
import { GAME } from '../src/config/game';
import { effectivePlan, tutorDailyLimit } from '../src/domain/plan';

const row = (plan: string, plan_until: number | null = null, admin = 0, judge = 0) => ({ plan, plan_until, is_admin: admin, is_judge: judge });

describe('effectivePlan', () => {
  it('reads the stored plan', () => {
    expect(effectivePlan(row('free'), 1000)).toBe('free');
    expect(effectivePlan(row('plus'), 1000)).toBe('plus');
    expect(effectivePlan(row('max', null), 1000)).toBe('max');
  });
  it('drops an expired paid plan to free', () => {
    expect(effectivePlan(row('plus', 2000), 1000)).toBe('plus');
    expect(effectivePlan(row('plus', 1000), 1000)).toBe('free');
    expect(effectivePlan(row('max', 500), 1000)).toBe('free');
  });
  it('treats unknown values as free', () => {
    expect(effectivePlan(row('gold'), 1000)).toBe('free');
  });
  it('gives admins and judges max', () => {
    expect(effectivePlan(row('free', null, 1), 1000)).toBe('max');
    expect(effectivePlan(row('free', null, 0, 1), 1000)).toBe('max');
  });
});

describe('tutorDailyLimit', () => {
  it('free gets 1 bear talk a day, plus 10', () => {
    expect(tutorDailyLimit('free')).toBe(1);
    expect(tutorDailyLimit('plus')).toBe(10);
    expect(tutorDailyLimit('max')).toBe(GAME.TUTOR.DAILY_SESSIONS.max);
  });
});
