import type { Me } from '@shared/types';

// Баавгайн төлөв (DESIGN.md §5). Төлөвийг серверээс ирсэн бодит өгөгдлөөс (дараалал, өнөөдрийн
// даалгавар, хамгаалалт) гаргана; тусдаа "energy" талбар backend-д байхгүй тул энд тооцоолно.

export type BearState = 'thriving' | 'happy' | 'tired' | 'neglected' | 'sleep';
export const BEAR_STATES: BearState[] = ['thriving', 'happy', 'tired', 'neglected', 'sleep'];

export interface BearStateConfig {
  /** анхны sprite-ийн харагдах хэмжээ (dp): амьд хөдөлгөөний frame-ууд түүний байранд таарна (components/LiveBear) */
  w: number;
  h: number;
  /** stage дотор баавгайн дээд зай */
  top: number;
  chip: string;
  dot: string;
  floatShadow: boolean;
  alt: string;
}

export const BEAR_CONFIG: Record<BearState, BearStateConfig> = {
  thriving: {
    w: 180,
    h: 252,
    top: 30,
    chip: 'Гэрэлтэж байна',
    dot: '#E0A82E',
    floatShadow: true,
    alt: 'Баярлан хөвж буй баавгай',
  },
  happy: {
    w: 164,
    h: 280,
    top: 18,
    chip: 'Сэргэлэн',
    dot: '#4F9A57',
    floatShadow: false,
    alt: 'Ороолттой зогсож буй баавгай',
  },
  tired: {
    w: 164,
    h: 280,
    top: 18,
    chip: 'Ядарсан',
    dot: '#7A5CF5',
    floatShadow: false,
    alt: 'Ядарсан, нүдний доогуур бараантсан баавгай',
  },
  neglected: {
    w: 164,
    h: 280,
    top: 18,
    chip: 'Гомдсон',
    dot: '#E0564F',
    floatShadow: false,
    alt: 'Хичээл хийгээгүйд гомдож гараа зөрүүлсэн баавгай',
  },
  sleep: {
    w: 190,
    h: 254,
    top: 46,
    chip: 'Амарч байна',
    dot: '#AEDDF3',
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
      return 'Streak тасарлаа. 2 хичээл хийвэл баавгай уучилна.';
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
