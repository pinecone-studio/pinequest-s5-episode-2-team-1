import type { StudentStatDto } from '@shared/teacher';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Avatar } from '@/components/Avatar';
import { colors, fonts, radius } from '@/constants/theme';
import { T } from '@/i18n/teacher';

/** Сурагчийн мөр: баавгай, нэр, зөв хувь, хамгийн их алддаг сэдэв. Урт дарвал хасах. */
export function StudentRow({ s, onRemove }: { s: StudentStatDto; onRemove: () => void }) {
  const low = s.percent !== null && s.percent < 50;
  return (
    <Pressable
      onLongPress={onRemove}
      accessibilityRole="button"
      accessibilityHint={T.remove}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}
    >
      <Avatar size={44} border={2} look={s.look} />
      <View style={styles.texts}>
        <Text style={styles.name} numberOfLines={1}>
          {s.name}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {T.studentMeta(s.grade, s.answered)}
        </Text>
        {s.weakTopic ? (
          <Text style={styles.weak} numberOfLines={1}>
            {T.studentWeak(s.weakTopic)}
          </Text>
        ) : null}
      </View>
      <View style={[styles.badge, low && { backgroundColor: colors.pink }]}>
        <Text style={styles.badgeText}>{s.percent === null ? '—' : `${s.percent}%`}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.line,
  },
  texts: { flex: 1, gap: 2 },
  name: { fontFamily: fonts.bold, fontSize: 16, color: colors.ink },
  meta: { fontFamily: fonts.medium, fontSize: 12, color: colors.muted },
  weak: { fontFamily: fonts.semibold, fontSize: 12, color: colors.dangerText },
  badge: { minWidth: 56, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: colors.lime, alignItems: 'center' },
  badgeText: { fontFamily: fonts.pixelNum, fontSize: 13, color: colors.ink },
});
