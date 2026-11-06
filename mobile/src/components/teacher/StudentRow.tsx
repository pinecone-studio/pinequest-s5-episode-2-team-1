import type { StudentStatDto } from '@shared/teacher';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Avatar } from '@/components/Avatar';
import { colors, fonts, radius } from '@/constants/theme';
import { T } from '@/i18n/teacher';
import { toneOf } from './WeakTopics';

/** Сурагчийн мөр: баавгай, нэр, хариултын тоо, хамгийн их алддаг сэдэв, зөв хувь, хасах товч. */
export function StudentRow({ s, onRemove }: { s: StudentStatDto; onRemove: () => void }) {
  return (
    <View style={styles.row}>
      <Avatar size={44} border={2} look={s.look} />
      <View style={styles.texts}>
        <Text style={styles.name} numberOfLines={1}>
          {s.name}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {s.answered > 0 ? T.studentMeta(s.answered) : T.notYet}
        </Text>
        {s.weakTopic ? (
          <Text style={styles.weak} numberOfLines={1}>
            {T.studentWeak(s.weakTopic)}
          </Text>
        ) : null}
      </View>
      <View style={[styles.badge, { backgroundColor: s.percent === null ? colors.track : toneOf(s.percent) }]}>
        <Text style={styles.badgeText}>{s.percent === null ? '—' : `${s.percent}%`}</Text>
      </View>
      <Pressable
        onPress={onRemove}
        accessibilityRole="button"
        accessibilityLabel={T.removeLabel(s.name)}
        hitSlop={8}
        style={({ pressed }) => [styles.remove, pressed && { backgroundColor: colors.pink }]}
      >
        <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={colors.muted} strokeWidth={3} strokeLinecap="round">
          <Path d="M6 6l12 12M18 6 6 18" />
        </Svg>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingLeft: 12,
    paddingRight: 6,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.line,
  },
  texts: { flex: 1, gap: 2 },
  name: { fontFamily: fonts.bold, fontSize: 16, color: colors.ink },
  meta: { fontFamily: fonts.medium, fontSize: 13, color: colors.muted },
  weak: { fontFamily: fonts.semibold, fontSize: 13, color: colors.dangerText },
  badge: { minWidth: 56, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill, alignItems: 'center' },
  badgeText: { fontFamily: fonts.pixelNum, fontSize: 13, color: colors.ink },
  remove: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
});
