import { Image, StyleSheet } from 'react-native';
import { colors, radius } from '@/constants/theme';

/** Зурагтай асуултын зураг (PNG/WebP data URI): даалгавар, давтлага, ангийн тэмцээн, багшийн даалгавар бүгд үүнийг харуулна. */
export function QuestionImage({ uri }: { uri?: string }) {
  if (!uri) return null;
  return <Image source={{ uri }} style={styles.figure} resizeMode="contain" accessibilityIgnoresInvertColors />;
}

const styles = StyleSheet.create({
  figure: { width: '100%', aspectRatio: 4 / 3, borderRadius: radius.md, backgroundColor: colors.white },
});
