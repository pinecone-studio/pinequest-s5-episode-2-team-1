import type { AssignmentDto } from '@shared/assignment';
import { StyleSheet, Text, View } from 'react-native';
import { Card, Muted, ProgressBar, SectionTitle } from '@/components/ui';
import { colors, fonts, radius } from '@/constants/theme';
import { A, daysUntil } from '@/i18n/assignments';
import { toneOf } from './WeakTopics';

/** Өгсөн даалгаврууд: хэдэн сурагч хийсэн (явц), зөв хувь, хугацаа, хэн хийгээгүй. */
export function AssignmentList({ items, today }: { items: AssignmentDto[]; today: string }) {
  return (
    <View style={styles.list}>
      <SectionTitle>{A.list}</SectionTitle>
      {items.length === 0 ? <Muted>{A.empty}</Muted> : null}
      {items.map((a) => {
        const left = daysUntil(today, a.dueDay);
        return (
          <Card key={a.id} style={[styles.card, !a.open && styles.closed]}>
            <View style={styles.head}>
              <Text style={styles.name} numberOfLines={2}>
                {a.topicName ?? A.mixed}
              </Text>
              <Text
                style={[styles.badge, { backgroundColor: a.percent === null ? colors.track : toneOf(a.percent) }]}
                accessibilityLabel={a.percent === null ? undefined : `${a.percent}% зөв`}
              >
                {a.percent === null ? '—' : `${a.percent}%`}
              </Text>
            </View>
            <Text style={styles.meta}>{`${A.questions(a.total)} · ${A.dueLabel(left)}`}</Text>
            <ProgressBar value={a.done} max={Math.max(1, a.students)} color={colors.violet} height={10} />
            <Text style={styles.done}>{A.done(a.done, a.students)}</Text>
            {a.students > 0 ? <Muted>{a.missing.length ? A.missing(a.missing) : A.allDone}</Muted> : null}
          </Card>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 10 },
  card: { gap: 8, borderWidth: 2, borderColor: colors.ink },
  closed: { opacity: 0.7 },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  name: { flex: 1, fontFamily: fonts.extrabold, fontSize: 17, lineHeight: 22, color: colors.ink },
  badge: {
    overflow: 'hidden',
    minWidth: 52,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
    textAlign: 'center',
    fontFamily: fonts.pixelNum,
    fontSize: 13,
    color: colors.ink,
  },
  meta: { fontFamily: fonts.semibold, fontSize: 13, color: colors.muted },
  done: { fontFamily: fonts.bold, fontSize: 14, color: colors.indigo },
});
