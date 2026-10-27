import { describe, expect, it } from 'vitest';
import { GAME } from '../src/config/game';
import { livesNow, nextLifeAt, spendLife } from '../src/domain/lives';

const H2 = GAME.LIVES.REGEN_MS;

describe('амь', () => {
  it('дүүрэн үед зарцуулбал тоолуур тэр мөчөөс эхэлнэ, 2 цагийн дараа нөхөгдөнө', () => {
    const spent = spendLife(livesNow({ lives: 5, at: null }, 1000), 1000);
    expect(spent).toEqual({ lives: 4, at: 1000 });
    expect(nextLifeAt(spent)).toBe(1000 + H2);
    expect(livesNow(spent, 1000 + H2 - 1).lives).toBe(4);
    expect(livesNow(spent, 1000 + H2)).toEqual({ lives: 5, at: null });
  });

  it('2 цаг бүрт нэг, 5-аас хэтрэхгүй; үлдсэн хугацаа хадгалагдана', () => {
    expect(livesNow({ lives: 0, at: 0 }, 2 * H2 + 5)).toEqual({ lives: 2, at: 2 * H2 });
    expect(livesNow({ lives: 1, at: 0 }, 100 * H2)).toEqual({ lives: 5, at: null });
  });

  it('тоолуур явж байхад зарцуулбал тоолуур хэвээр', () => {
    expect(spendLife(livesNow({ lives: 3, at: 50 }, 60), 60)).toEqual({ lives: 2, at: 50 });
  });
});
