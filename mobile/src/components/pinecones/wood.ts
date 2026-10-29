import type { ViewStyle } from 'react-native';
import { colors } from '@/constants/theme';

/** Боргоцойн дэлгүүрийн модон лангууны өнгө (зөвхөн энэ дэлгэцэд). */
export const wood = {
  bg: '#FFB676',
  light: '#C98A4E',
  dark: '#A8652F',
  edge: '#3A2316',
  floor: '#A86A3C',
  sign: '#4C7A5C',
  signRim: '#2E4A38',
  signInk: '#F3E08A',
  pill: '#FFF6CF',
  desc: '#9A6A3E',
  mint: '#7CF7C8',
} as const;

/** Хар хүрээтэй, модон сүүдэртэй дугуй товч (шагналын pill, үнийн товч). */
export const woodPill: ViewStyle = {
  height: 44,
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 16,
  borderWidth: 3,
  borderColor: colors.ink,
  shadowColor: wood.edge,
  shadowOffset: { width: 3, height: 3 },
  shadowOpacity: 0.35,
  shadowRadius: 0,
  elevation: 3,
};
