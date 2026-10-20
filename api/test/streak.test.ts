import { describe, expect, it } from 'vitest';
import { taskReward } from '../src/domain/rewards';
import { normalizeStreak, registerTaskDay, type StreakState, streakMultiplier } from '../src/domain/streak';
import { ubDay } from '../src/domain/time';

const base: StreakState = { streak: 0, lastDay: null, shieldHeld: 0, shieldBoughtDay: null, shieldUsedDay: null };
const st = (p: Partial<StreakState>): StreakState => ({ ...base, ...p });

/** normalize + register: даалгавар дуусгах үеийн бүтэн урсгал */
const complete = (s: StreakState, today: string) => registerTaskDay(normalizeStreak(s, today).state, today);

describe('streak үржвэр = min(1 + 0.1 × (streak − 1), 2.0)', () => {
  it.each([
    [1, 1.0],
    [2, 1.1],
    [3, 1.2],
    [5, 1.4],
    [10, 1.9],
    [11, 2.0],
    [30, 2.0],
  ])('streak %i → ×%f', (streak, m) => {
    expect(streakMultiplier(streak)).toBe(m);
  });

  it('streak 0 (шинэ эсвэл тасарсан) үед ×1.0-аас доош орохгүй', () => {
    expect(streakMultiplier(0)).toBe(1.0);
  });
});

describe('даалгавар дуусгах ба streak', () => {
  it('шинэ хэрэглэгчийн эхний даалгавар → streak 1, ×1.0', () => {
    const s = complete(base, '2026-10-20');
    expect(s).toMatchObject({ streak: 1, lastDay: '2026-10-20' });
    expect(taskReward(5, s.streak)).toEqual({ multiplier: 1, points: 50, xp: 50 });
  });

  it('нэг өдөрт хоёр дахь даалгавар streak-ийг өөрчлөхгүй', () => {
    const s = complete(st({ streak: 3, lastDay: '2026-10-20' }), '2026-10-20');
    expect(s.streak).toBe(3);
  });

  it('дараалсан өдөр → +1', () => {
    expect(complete(st({ streak: 3, lastDay: '2026-10-19' }), '2026-10-20').streak).toBe(4);
  });

  it('1 өдөр алгассан, хамгаалалтгүй → 0 болоод дараагийн даалгавараар 1', () => {
    const s0 = st({ streak: 5, lastDay: '2026-10-18' });
    expect(normalizeStreak(s0, '2026-10-20').state.streak).toBe(0);
    expect(complete(s0, '2026-10-20').streak).toBe(1);
  });

  it('UTC+8 өдрийн хил: UB 23:59 ба маргааш 00:00 дараалсан өдөр болно', () => {
    const day1 = ubDay(Date.parse('2026-10-20T15:59:00Z')); // UB 23:59
    const day2 = ubDay(Date.parse('2026-10-20T16:00:00Z')); // UB 00:00
    const s1 = complete(base, day1);
    const s2 = complete(s1, day2);
    expect([day1, day2]).toEqual(['2026-10-20', '2026-10-21']);
    expect(s2.streak).toBe(2);
  });

  it('UTC-ээр нэг өдөр ч UB-ээр хоёр өөр өдөр бол streak +1', () => {
    // 2026-10-20T01:00Z = UB 09:00 (20-ны), 2026-10-20T17:00Z = UB 01:00 (21-ний)
    const s1 = complete(base, ubDay(Date.parse('2026-10-20T01:00:00Z')));
    expect(complete(s1, ubDay(Date.parse('2026-10-20T17:00:00Z'))).streak).toBe(2);
  });

  it('streak үржвэрээр оноо: streak 4 → ×1.3 → зөв хариулт бүр 13', () => {
    expect(taskReward(3, 4)).toEqual({ multiplier: 1.3, points: 39, xp: 30 });
    expect(taskReward(5, 11)).toEqual({ multiplier: 2, points: 100, xp: 50 });
    expect(taskReward(0, 5)).toEqual({ multiplier: 1.4, points: 0, xp: 0 });
  });
});

describe('streak хамгаалалт', () => {
  it('яг 1 өдөр алгасахад автоматаар зарцуулагдаж streak хадгалагдана', () => {
    const s0 = st({ streak: 5, lastDay: '2026-10-18', shieldHeld: 1 });
    const { state, shieldConsumed } = normalizeStreak(s0, '2026-10-20');
    expect(shieldConsumed).toBe(true);
    expect(state).toMatchObject({ streak: 5, shieldHeld: 0, lastDay: '2026-10-19', shieldUsedDay: '2026-10-19' });
    // алгассан өдөр тоонд орохгүй, өнөөдрийн даалгавраар 6 болно
    expect(registerTaskDay(state, '2026-10-20').streak).toBe(6);
  });

  it('профайл уншихад зарцуулагдсан бол дахин уншихад өөрчлөгдөхгүй (idempotent)', () => {
    const once = normalizeStreak(st({ streak: 5, lastDay: '2026-10-18', shieldHeld: 1 }), '2026-10-20').state;
    const twice = normalizeStreak(once, '2026-10-20');
    expect(twice.shieldConsumed).toBe(false);
    expect(twice.state).toBe(once);
  });

  it('2 өдөр алгасвал хамгаалалт хүрэхгүй: streak 0, хамгаалалт үлдэнэ', () => {
    const { state, shieldConsumed } = normalizeStreak(st({ streak: 5, lastDay: '2026-10-17', shieldHeld: 1 }), '2026-10-20');
    expect(shieldConsumed).toBe(false);
    expect(state).toMatchObject({ streak: 0, shieldHeld: 1 });
  });

  it('өчигдөр идэвхтэй байсан бол хамгаалалт зарцуулагдахгүй', () => {
    const { state, shieldConsumed } = normalizeStreak(st({ streak: 2, lastDay: '2026-10-19', shieldHeld: 1 }), '2026-10-20');
    expect(shieldConsumed).toBe(false);
    expect(state.shieldHeld).toBe(1);
  });

  it('streak 0 үед хамгаалах зүйлгүй тул зарцуулагдахгүй', () => {
    const { shieldConsumed } = normalizeStreak(st({ streak: 0, lastDay: '2026-10-18', shieldHeld: 1 }), '2026-10-20');
    expect(shieldConsumed).toBe(false);
  });

  it('хамгаалалт зарцуулсны дараа дахин 1 өдөр алгасвал streak тасарна', () => {
    // 18-нд идэвхтэй, 19 хамгаалагдсан, 20-нд юу ч хийгээгүй, 21-нд орж ирэв
    const covered = normalizeStreak(st({ streak: 5, lastDay: '2026-10-18', shieldHeld: 1 }), '2026-10-20').state;
    expect(normalizeStreak(covered, '2026-10-21').state.streak).toBe(0);
  });
});
