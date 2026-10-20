import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '@/constants/theme';

export type OptionState = 'idle' | 'selected' | 'correct' | 'wrong' | 'dim';

const LETTERS = ['А', 'Б', 'В', 'Г'];

const look: Record<OptionState, { bg: string; border: string; text: string; badge: string; badgeText: string }> = {
  idle: { bg: colors.card, border: colors.border, text: colors.text, badge: colors.primarySoft, badgeText: colors.primaryDark },
  selected: { bg: colors.primarySoft, border: colors.primary, text: colors.text, badge: colors.primary, badgeText: colors.white },
  correct: { bg: colors.successSoft, border: colors.success, text: colors.text, badge: colors.success, badgeText: colors.white },
  wrong: { bg: colors.dangerSoft, border: colors.danger, text: colors.text, badge: colors.danger, badgeText: colors.white },
  dim: { bg: colors.card, border: colors.border, text: colors.muted, badge: colors.primarySoft, badgeText: colors.muted },
};

export function OptionButton({
  index,
  label,
  state,
  disabled,
  onPress,
}: {
  index: number;
  label: string;
  state: OptionState;
  disabled?: boolean;
  onPress: () => void;
}) {
  const l = look[state];
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.box,
        { backgroundColor: l.bg, borderColor: l.border },
        pressed && !disabled && { transform: [{ scale: 0.98 }] },
      ]}
    >
      <View style={[styles.badge, { backgroundColor: l.badge }]}>
        <Text style={[styles.letter, { color: l.badgeText }]}>{state === 'correct' ? '✓' : state === 'wrong' ? '✕' : LETTERS[index]}</Text>
      </View>
      <Text style={[styles.label, { color: l.text }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 2,
    borderRadius: radius.md,
    padding: spacing.md,
    minHeight: 58,
  },
  badge: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  letter: { fontWeight: '800', fontSize: 15 },
  label: { flex: 1, fontSize: 17, fontWeight: '600' },
});
