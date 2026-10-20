import type { Subject } from '@shared/types';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, subjectColors } from '@/constants/theme';
import { S, subjectIcons, subjectNames } from '@/i18n/strings';

export function SubjectCard({ subject, disabled, onPress }: { subject: Subject; disabled?: boolean; onPress: () => void }) {
  const color = subjectColors[subject];
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { borderColor: color, opacity: disabled ? 0.45 : 1 },
        pressed && { transform: [{ scale: 0.98 }] },
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: color }]}>
        <Text style={styles.icon}>{subjectIcons[subject]}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.name}>{subjectNames[subject]}</Text>
        <Text style={styles.hint}>{S.home.subjectHint}</Text>
      </View>
      <Text style={[styles.go, { color }]}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 2,
    padding: spacing.lg,
  },
  iconWrap: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 26 },
  name: { fontSize: 19, fontWeight: '800', color: colors.text },
  hint: { fontSize: 13, color: colors.muted },
  go: { fontSize: 34, fontWeight: '300' },
});
