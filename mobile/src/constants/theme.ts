import type { Subject } from '@shared/types';

// Pixel Bear дизайны токенууд: docs/design/pixel-bear/DESIGN.md §3.
export const colors = {
  violet: '#7A5CF5',
  indigo: '#22106E',
  lemon: '#F3F66C',
  lime: '#D4F55E',
  pink: '#F2CDE0',
  sky: '#AEDDF3',
  lavender: '#D9D2F2',
  stone: '#CBCAC1',
  stoneAlt: '#DEDCD3',
  paper: '#EFEEE9',
  ink: '#19152E',
  muted: '#5E5A6E',
  mutedIcon: '#6E6A7C',
  white: '#FFFFFF',
  dangerText: '#8A3A5C',
  okText: '#2F7A4C',
  line: '#E6E4DD',
  track: '#E6E3F5',
  trackAlt: '#ECE9F6',
  dashed: '#D8D6CE',
} as const;

/** Баавгайн stage-ийн дэвсгэр өнгө дээрх halo (DESIGN.md §3 "Шөнө"). */
export const halo = { light: 'rgba(255,255,255,0.5)', night: 'rgba(122,92,245,0.45)' } as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 14, md: 20, card: 24, lg: 28, stage: 32, sheet: 36, pill: 999 } as const;

/**
 * Onest (UI), Pixelify Sans (pixel бичиг) ба Silkscreen (pixel тоо: Pixelify-ийн 2 нь Z, 5 нь S шиг харагддаг).
 * Silkscreen-д кирилл үсэг байхгүй тул зөвхөн тоо, латин үсэгт. `fontWeight` нь custom фонтод ажилладаггүй тул
 * family-г жинээр нь сонгоно.
 */
export const fonts = {
  regular: 'Onest_400Regular',
  medium: 'Onest_500Medium',
  semibold: 'Onest_600SemiBold',
  bold: 'Onest_700Bold',
  extrabold: 'Onest_800ExtraBold',
  pixel: 'PixelifySans_700Bold',
  pixelMedium: 'PixelifySans_500Medium',
  pixelNum: 'Silkscreen_400Regular',
} as const;

/** Хатуу "game" сүүдэр (blur-гүй). */
export const hardShadow = (offset = 4) => ({
  shadowColor: colors.ink,
  shadowOffset: { width: 0, height: offset },
  shadowOpacity: 1,
  shadowRadius: 0,
  elevation: offset,
});

export interface SubjectTheme {
  bg: string;
  fg: string;
  /** Картын арын том бүдэг тэмдэг */
  glyph: string;
}

export const subjectTheme: Record<Subject, SubjectTheme> = {
  math: { bg: colors.lemon, fg: colors.ink, glyph: '½' },
  mongolian: { bg: colors.violet, fg: colors.white, glyph: 'Өө' },
  physics: { bg: colors.lime, fg: colors.ink, glyph: 'F=ma' },
};

export const subjectColors: Record<Subject, string> = {
  math: colors.lemon,
  mongolian: colors.violet,
  physics: colors.lime,
};
