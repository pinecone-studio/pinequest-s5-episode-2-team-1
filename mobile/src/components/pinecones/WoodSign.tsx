import { StyleSheet, Text, View } from 'react-native';
import { fonts } from '@/constants/theme';
import { wood } from './wood';

/** Ногоон модон самбар дээрх pixel гарчиг. */
export function WoodSign({ text, size }: { text: string; size: 'lg' | 'sm' }) {
  const lg = size === 'lg';
  return (
    <View style={[styles.outer, { minWidth: lg ? 230 : 160 }]}>
      <View style={styles.inner}>
        <Text style={[styles.text, { fontSize: lg ? 34 : 22, lineHeight: lg ? 40 : 26 }]}>{text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { backgroundColor: wood.edge, borderRadius: 999, padding: 5 },
  inner: { backgroundColor: wood.sign, borderRadius: 999, borderWidth: 3, borderColor: wood.signRim, paddingHorizontal: 28, paddingVertical: 8, alignItems: 'center' },
  text: { fontFamily: fonts.pixel, color: wood.signInk, letterSpacing: 2, textShadowColor: wood.edge, textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 0 },
});
