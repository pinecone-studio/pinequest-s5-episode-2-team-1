import { loadFont } from '@remotion/fonts';
import { staticFile, useVideoConfig } from 'remotion';

// KUMA "Pixel Bear" tokens (docs/design/pixel-bear/DESIGN.md §3, mobile/src/constants/theme.ts).
export const C = {
  violet: '#7A5CF5',
  indigo: '#22106E',
  lemon: '#F3F66C',
  lime: '#D4F55E',
  pink: '#F2CDE0',
  sky: '#AEDDF3',
  lavender: '#D9D2F2',
  paper: '#EFEEE9',
  ink: '#19152E',
  muted: '#5E5A6E',
  white: '#FFFFFF',
} as const;

export const UI = 'Onest';
export const PIXEL = 'Pixelify Sans';

// Same OFL fonts the app ships (copied from @expo-google-fonts into public/fonts).
const faces: [string, string, string][] = [
  [UI, 'Onest_500Medium.ttf', '500'],
  [UI, 'Onest_600SemiBold.ttf', '600'],
  [UI, 'Onest_700Bold.ttf', '700'],
  [UI, 'Onest_800ExtraBold.ttf', '800'],
  [PIXEL, 'PixelifySans_700Bold.ttf', '700'],
];
for (const [family, file, weight] of faces) {
  void loadFont({ family, url: staticFile(`fonts/${file}`), weight });
}

/** Layout helper: the same scenes render vertical (1080×1920) and wide (1920×1080). */
export const useLayout = () => {
  const { width, height } = useVideoConfig();
  const wide = width > height;
  return { width, height, wide };
};
