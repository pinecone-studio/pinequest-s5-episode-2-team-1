import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radius } from '@/constants/theme';

/** Onboarding-ийн нэг сонголт (радио): зүүн талд тэмдэг, сонгогдсон бол ягаан хүрээ, доод сүүдэр нь тод. */
export function QuizOption({
  icon,
  label,
  sub,
  selected,
  onPress,
}: {
  icon: ReactNode;
  label: string;
  sub?: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={sub ? `${label}. ${sub}` : label}
      onPress={onPress}
      style={({ pressed }) => [styles.card, selected && styles.selected, pressed && styles.pressed]}
    >
      <View style={styles.icon}>{icon}</View>
      <View style={styles.texts}>
        <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
        {sub ? <Text style={styles.sub}>{sub}</Text> : null}
      </View>
    </Pressable>
  );
}

/** Түвшний 4 босоо зурвас (Duolingo маягийн): `n` нь тод */
export function LevelBars({ n }: { n: number }) {
  return (
    <View style={styles.bars}>
      {[0, 1, 2, 3].map((i) => (
        <View key={i} style={[styles.bar, { height: 8 + i * 5, backgroundColor: i < n ? colors.violet : colors.track }]} />
      ))}
    </View>
  );
}

/** Сонголтын тэмдэг болох emoji (тогтмол хэмжээтэй) */
export function Emoji({ children }: { children: string }) {
  return (
    <Text style={styles.emoji} accessibilityElementsHidden importantForAccessibility="no">
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: colors.line,
  },
  selected: { borderColor: colors.violet, backgroundColor: '#F1EDFF' },
  pressed: { transform: [{ translateY: 2 }], borderBottomWidth: 2 },
  icon: { width: 40, alignItems: 'center', justifyContent: 'center' },
  texts: { flex: 1, gap: 2 },
  label: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 21, color: colors.ink },
  labelSelected: { color: colors.indigo },
  sub: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 19, color: colors.muted },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 24 },
  bar: { width: 6, borderRadius: 2 },
  emoji: { fontSize: 26, lineHeight: 32 },
});
