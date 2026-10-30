import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps, ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ZoomEnter } from '@/components/pixel';
import { colors, fonts, radius } from '@/constants/theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

/**
 * Onboarding-ийн нэг сонголт (радио): бүртгэлийн талбартай ижил цагаан хайрцаг, зүүн талд нэг загварын icon-той хавтан,
 * сонгогдвол violet хүрээ ба баруун талд ✓ (талбарын ✓-тэй ижил).
 */
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
      <View style={[styles.tile, selected && styles.tileOn]}>{icon}</View>
      <View style={styles.texts}>
        <Text style={styles.label}>{label}</Text>
        {sub ? <Text style={styles.sub}>{sub}</Text> : null}
      </View>
      {selected ? (
        <ZoomEnter style={styles.badge}>
          <Ionicons name="checkmark" size={16} color={colors.white} />
        </ZoomEnter>
      ) : null}
    </Pressable>
  );
}

/** Сонголтын icon: бүх onboarding нэг гэр бүлийн (Ionicons) icon-оор, брэнд бол өөрийн өнгөөр */
export function Icon({ name, color = colors.indigo, size = 22 }: { name: IconName; color?: string; size?: number }) {
  return <Ionicons name={name} size={size} color={color} accessibilityElementsHidden importantForAccessibility="no" />;
}

/** Түвшний 4 босоо зурвас (Duolingo маягийн): `n` нь тод */
export function LevelBars({ n }: { n: number }) {
  return (
    <View style={styles.bars}>
      {[0, 1, 2, 3].map((i) => (
        <View key={i} style={[styles.bar, { height: 8 + i * 4, backgroundColor: i < n ? colors.violet : colors.lavender }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.line,
  },
  selected: { borderColor: colors.violet, backgroundColor: colors.trackAlt },
  pressed: { opacity: 0.85 },
  tile: { width: 40, height: 40, borderRadius: radius.sm, backgroundColor: colors.trackAlt, alignItems: 'center', justifyContent: 'center' },
  tileOn: { backgroundColor: colors.white },
  texts: { flex: 1, gap: 2 },
  label: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 21, color: colors.ink },
  sub: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 19, color: colors.muted },
  badge: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.violet, alignItems: 'center', justifyContent: 'center' },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 22 },
  bar: { width: 5, borderRadius: 2 },
});
