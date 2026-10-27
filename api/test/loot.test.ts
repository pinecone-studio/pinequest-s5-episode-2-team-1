import { describe, expect, it } from 'vitest';
import { CHEST_LOOT, rollLoot } from '../../shared/loot';
import { hintHide } from '../src/services/bag';

describe('нууц хайрцаг', () => {
  it('жингээр сонгоно: 45 / 35 / 20', () => {
    expect([0, 0.44, 0.45, 0.79, 0.8, 0.999].map((r) => rollLoot(r).kind)).toEqual(['amber', 'amber', 'honey', 'honey', 'coins', 'coins']);
  });

  it('сангаас л гарна', () => {
    for (let k = 0; k < 200; k++) expect(CHEST_LOOT).toContain(rollLoot(k / 200));
  });
});

describe('Хувын болор', () => {
  it('зөв хариултыг хэзээ ч нуухгүй, 2 буруугаа нууна, асуулт бүрт тогтмол', () => {
    for (let id = 1; id < 40; id++)
      for (let correct = 0; correct < 4; correct++) {
        const hide = hintHide(4, correct, id);
        expect(hide).toHaveLength(2);
        expect(hide).not.toContain(correct);
        expect(hintHide(4, correct, id)).toEqual(hide);
      }
  });

  it('3 сонголттой асуултад 1-ийг нууна', () => {
    expect(hintHide(3, 0, 5)).toHaveLength(1);
  });
});
