import type { Subject } from '@shared/types';

export const colors = {
  bg: '#F4F1FF',
  card: '#FFFFFF',
  text: '#2D2A3E',
  muted: '#6E6A85',
  border: '#E4DEFA',
  primary: '#6C5CE7',
  primaryDark: '#5141C9',
  primarySoft: '#ECE8FF',
  accent: '#FDCB6E',
  fire: '#FF7A45',
  success: '#00B894',
  successSoft: '#DDF7EF',
  danger: '#E5484D',
  dangerSoft: '#FDE6E7',
  gold: '#F5B301',
  disabled: '#C9C4DD',
  white: '#FFFFFF',
} as const;

export const subjectColors: Record<Subject, string> = {
  math: '#0984E3',
  mongolian: '#E84393',
  physics: '#00A884',
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 10, md: 16, lg: 24, pill: 999 } as const;
