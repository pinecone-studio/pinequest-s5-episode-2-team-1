import { StyleSheet } from 'react-native';
import { colors, fonts } from './theme';

/** DESIGN.md §3 "Type scale". */
export const type = StyleSheet.create({
  display: { fontFamily: fonts.bold, fontSize: 150, lineHeight: 142, letterSpacing: -6, color: colors.white },
  h1: { fontFamily: fonts.semibold, fontSize: 32, lineHeight: 34, letterSpacing: -1, color: colors.ink },
  h1Sm: { fontFamily: fonts.semibold, fontSize: 30, lineHeight: 33, letterSpacing: -0.8, color: colors.ink },
  h2: { fontFamily: fonts.semibold, fontSize: 26, lineHeight: 30, letterSpacing: -0.6, color: colors.ink },
  h3: { fontFamily: fonts.semibold, fontSize: 19, lineHeight: 24, letterSpacing: -0.3, color: colors.ink },
  cardTitle: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 18, color: colors.ink },
  body: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 21, color: colors.ink },
  bodyMuted: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 21, color: colors.muted },
  small: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 19, color: colors.muted },
  label: { fontFamily: fonts.bold, fontSize: 12, lineHeight: 16, letterSpacing: 0.8, textTransform: 'uppercase', color: colors.ink },
  button: { fontFamily: fonts.semibold, fontSize: 18, color: colors.white },
  num: { fontFamily: fonts.pixel, fontSize: 17, color: colors.ink },
  numSm: { fontFamily: fonts.pixel, fontSize: 14, color: colors.ink },
});
