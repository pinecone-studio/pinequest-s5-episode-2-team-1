import type { SpriteKey } from '@/sprites';

// Баавгайн skill (зөв хариулт бүр нэг довтолгоо): сондгой нь холоос, тэгш нь ойроос; дараалан 2+ зөв бол хүчтэй хувилбар.
export type BearSkill = 'honey' | 'claw' | 'boom' | 'cross';

/** Grid sheet-ийн эффект: frame тус бүр `ms` */
export interface SkillFx {
  id: SpriteKey;
  frames: number;
  cols: number;
  ms: number;
}

export const COMBO_AT = 2;

/** `n` = хэд дэх хариулт, `combo` = энэ хариултыг оруулаад дараалсан зөвийн тоо */
export const skillOf = (n: number, combo: number): BearSkill => {
  const melee = n % 2 === 0;
  if (combo >= COMBO_AT) return melee ? 'cross' : 'boom';
  return melee ? 'claw' : 'honey';
};

/** boss-д онох эффект (honey нь баавгайн өөрийн бал цацрах эффекттэй: BossArena) */
export const SKILL_HIT: Record<Exclude<BearSkill, 'honey'>, SkillFx> = {
  claw: { id: 'fx_bear_claw_255x246', frames: 8, cols: 3, ms: 60 },
  cross: { id: 'fx_bear_cross_440x381', frames: 12, cols: 4, ms: 55 },
  boom: { id: 'fx_bear_boom_340x276', frames: 12, cols: 4, ms: 65 },
};

/** давхиж эхлэхэд хөлийн тоос, хос сарвууны газар хагарал, балны бөмбөгийн өмнөх хүчний дөл */
export const DUST: SkillFx = { id: 'fx_bear_dust_201x102', frames: 8, cols: 3, ms: 70 };
export const CRACKS: SkillFx = { id: 'fx_bear_cracks_532x156', frames: 10, cols: 4, ms: 80 };
export const AURA: SkillFx = { id: 'fx_bear_aura_210x309', frames: 8, cols: 3, ms: 90 };
