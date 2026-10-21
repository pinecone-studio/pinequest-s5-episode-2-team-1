import type { Me } from '@shared/types';
import type { SpriteKey } from '@/sprites';

// Баавгайн төлөв (DESIGN.md §5). Төлөвийг серверээс ирсэн бодит өгөгдлөөс (дараалал, өнөөдрийн
// даалгавар, хамгаалалт) гаргана; тусдаа "energy" талбар backend-д байхгүй тул энд тооцоолно.

export type BearState = 'thriving' | 'happy' | 'tired' | 'neglected' | 'sleep';
export const BEAR_STATES: BearState[] = ['thriving', 'happy', 'tired', 'neglected', 'sleep'];

export type StageAnim = 'float' | 'bob' | 'breathe' | 'sway';

export interface BearStateConfig {
  sprite: SpriteKey;
  /** харагдах хэмжээ (dp) */
  w: number;
  h: number;
  /** stage дотор баавгайн дээд зай */
  top: number;
  chip: string;
  dot: string;
  anim: StageAnim;
  floatShadow: boolean;
  alt: string;
}

export const BEAR_CONFIG: Record<BearState, BearStateConfig> = {
  thriving: {
    sprite: 'bear_cheer_scarf_180x252',
    w: 180,
    h: 252,
    top: 30,
    chip: 'Гэрэлтэж байна',
    dot: '#E0A82E',
    anim: 'float',
    floatShadow: true,
    alt: 'Баярлан хөвж буй баавгай',
  },
  happy: {
    sprite: 'bear_idle_scarf_164x280',
    w: 164,
    h: 280,
    top: 18,
    chip: 'Сэргэлэн',
    dot: '#4F9A57',
    anim: 'bob',
    floatShadow: false,
    alt: 'Ороолттой зогсож буй баавгай',
  },
  tired: {
    sprite: 'bear_tired_scarf_164x280',
    w: 164,
    h: 280,
    top: 18,
    chip: 'Ядарсан',
    dot: '#7A5CF5',
    anim: 'breathe',
    floatShadow: false,
    alt: 'Ядарсан, нүдний доогуур бараантсан баавгай',
  },
  neglected: {
    sprite: 'bear_neglected_scarf_164x280',
    w: 164,
    h: 280,
    top: 18,
    chip: 'Сүнсгүй',
    dot: '#8A8C94',
    anim: 'sway',
    floatShadow: false,
    alt: 'Хөхөрсөн нүдтэй, саарал болсон баавгай',
  },
  sleep: {
    sprite: 'bear_sleep_190x254',
    w: 190,
    h: 254,
    top: 46,
    chip: 'Амарч байна',
    dot: '#AEDDF3',
    anim: 'breathe',
    floatShadow: false,
    alt: 'Хөнжил нөмөрч унтаж буй баавгай',
  },
};

const ENERGY_PREVIEW: Record<BearState, number> = { thriving: 96, happy: 74, tired: 38, neglected: 9, sleep: 60 };

/** 'YYYY-MM-DD' хоёрын хоногийн зөрүү. */
export function dayDiff(a: string, b: string): number {
  const t = (s: string) => {
    const [y, m, d] = s.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((t(a) - t(b)) / 86_400_000);
}

export interface BearView {
  state: BearState;
  /** 0–100 */
  energy: number;
  mood: string;
}

export function moodLine(state: BearState, me: Pick<Me, 'streak' | 'todayTasks'>): string {
  switch (state) {
    case 'thriving':
      return `${me.streak} хоног дараалан сурлаа. Баавгай чинь хөвж байна!`;
    case 'happy':
      return me.todayTasks > 0 ? `Өнөөдөр ${me.todayTasks} даалгавар хийлээ.` : 'Шинэ найз чинь бэлэн. Эхний хичээлээ хийцгээе!';
    case 'tired':
      return 'Баавгай чинь ядарсан. Нэг хичээл хийгээд сэргээе.';
    case 'neglected':
      return 'Streak тасарлаа. 2 хичээл хийвэл баавгай сэргэнэ.';
    case 'sleep':
      return 'Амралтын өдөр. Streak хамгаалагч ажиллаж байна.';
  }
}

/** Серверийн профайлаас баавгайн төлөв ба energy-г гаргана. */
export function deriveBear(me: Me): BearView {
  let state: BearState;
  let energy: number;
  const shieldJustUsed = !!me.shield.usedDay && dayDiff(me.today, me.shield.usedDay) <= 1;
  if (me.streakDoneToday) {
    if (me.streak >= 7) {
      state = 'thriving';
      energy = Math.min(100, 80 + (me.streak - 7) * 2);
    } else {
      state = 'happy';
      energy = Math.min(79, 55 + me.streak * 4);
    }
  } else if (shieldJustUsed) {
    state = 'sleep';
    energy = 60;
  } else if (me.xp === 0 && me.streak === 0) {
    // Шинэ хэрэглэгчийн баавгай гомддоггүй: эхний хичээлийг хүлээж байна
    state = 'happy';
    energy = 70;
  } else if (me.streak > 0) {
    state = 'tired';
    energy = 38;
  } else {
    state = 'neglected';
    energy = 9;
  }
  return { state, energy, mood: moodLine(state, me) };
}

/** Демо / тохируулалтад: төлөвийг гараар сонгоход энергийн жишиг утга. */
export function previewBear(state: BearState, me: Me): BearView {
  return { state, energy: ENERGY_PREVIEW[state], mood: moodLine(state, me) };
}
