import { useEffect, useReducer, useRef, useSyncExternalStore } from 'react';
import { interpolateColor, runOnJS, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { colors } from '@/constants/theme';

/** Бүлгийн самбарын (дээд мөр, доод цэс) өнгө. Бүлэг бүр `themeId`-аараа нэгийг сонгоно; component-д өнгө hardcode хийхгүй. */
export interface ChapterTheme {
  /** самбарын суурь */
  panel: string;
  /** самбарын хүрээ */
  border: string;
  /** үндсэн бичвэр */
  text: string;
  /** хоёрдогч бичвэр */
  muted: string;
  /** идэвхгүй icon (tint) */
  icon: string;
  /** идэвхтэй төлөв (tab-ын заагч) */
  active: string;
  /** Duolingo маягийн тод карт: дээд баннер, «Эхлэх» popover (дээр нь цагаан бичвэр) */
  banner: string;
  /** үндсэн товч ба түүний бичвэр */
  button: string;
  onButton: string;
}

/** Бүх theme-д ижил: «Эхлэх» товч ба идэвхтэй tab-ын лайм accent */
const accent = { active: colors.lime, button: colors.lime, onButton: colors.ink };

export const THEMES = {
  // Бүлэггүй дэлгэцүүд (Нүүр, Дэлгүүр…)-ийн цайвар цаасан дэвсгэрт: цагаан самбар. Лайм цагаан дээр харагдахгүй тул заагч нь ягаан.
  default: { panel: colors.white, border: '#E4E2EA', text: colors.ink, muted: colors.muted, icon: colors.mutedIcon, banner: colors.violet, ...accent, active: colors.violet },
  forest: { panel: '#123A2A', border: '#2F6A4E', text: '#F3FBF5', muted: '#B3D3BF', icon: '#9CC4AB', banner: '#1A7F55', ...accent },
  halloween: { panel: '#2B1457', border: '#55318F', text: '#FFFFFF', muted: '#D2C3F2', icon: '#B7A4E4', banner: '#7C4DDB', ...accent },
  moonstone: { panel: '#10285C', border: '#2D539F', text: '#FFFFFF', muted: '#B9CCF3', icon: '#98B2E6', banner: '#2F6FE0', ...accent },
} as const satisfies Record<string, ChapterTheme>;

export type ThemeId = keyof typeof THEMES;

export const themeOf = (id?: ThemeId | null): ChapterTheme => THEMES[id ?? 'default'] ?? THEMES.default;

// Идэвхтэй бүлгийн theme: Сурах зам дэлгэц тавина, доод цэс (бүх tab-д нийтлэг) уншина.
let current: ThemeId = 'default';
const listeners = new Set<() => void>();

export function setChapterTheme(id: ThemeId) {
  if (id === current) return;
  current = id;
  for (const l of listeners) l();
}

export function useChapterTheme(): ChapterTheme {
  const id = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => void listeners.delete(l);
    },
    () => current,
  );
  return themeOf(id);
}

/**
 * theme солигдоход өнгийг 0.35с-д зөөлөн шилжүүлэх animated style-ууд ("motion бууруулах" үед шууд).
 * Тогтмол лайм accent-д animation хэрэггүй.
 */
export function useThemeFade(theme: ChapterTheme) {
  const reduce = useReducedMotion();
  const prev = useRef(theme);
  const from = useSharedValue(theme);
  const to = useSharedValue(theme);
  const t = useSharedValue(1);
  // web дээр animated style зөвхөн render хийхэд DOM-д бичигддэг тул шилжилт дуусахад нэг удаа дахин render хийнэ
  const [, settle] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    if (prev.current === theme) return;
    from.value = prev.current;
    to.value = theme;
    prev.current = theme;
    if (reduce) {
      t.value = 1;
      settle();
      return;
    }
    t.value = 0;
    t.value = withTiming(1, { duration: 350 }, (done) => {
      if (done) runOnJS(settle)();
    });
  }, [theme, reduce, from, to, t]);

  const mix = (k: 'panel' | 'border' | 'text' | 'muted' | 'banner') => {
    'worklet';
    return interpolateColor(t.value, [0, 1], [from.value[k], to.value[k]]);
  };
  return {
    panel: useAnimatedStyle(() => ({ backgroundColor: mix('panel') })),
    border: useAnimatedStyle(() => ({ borderColor: mix('border') })),
    text: useAnimatedStyle(() => ({ color: mix('text') })),
    muted: useAnimatedStyle(() => ({ color: mix('muted') })),
    banner: useAnimatedStyle(() => ({ backgroundColor: mix('banner') })),
  };
}
