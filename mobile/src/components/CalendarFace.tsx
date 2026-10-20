import { StyleSheet, Text, View } from 'react-native';
import { Sprite } from '@/components/pixel';
import { colors, fonts } from '@/constants/theme';
import { type CalendarCell, FACE } from '@/lib/pixelBear/calendar';
import { S } from '@/i18n/strings';

const FACE_LABEL = {
  happy: S.calendar.legend.happy,
  idle: S.calendar.legend.idle,
  tired: S.calendar.legend.tired,
  neglected: S.calendar.legend.neglected,
  rest: S.calendar.legend.rest,
} as const;

/** Хуанлийн нэг нүд (DESIGN.md §7 CalendarFace): төлөвийн өнгө + баавгайн толгой. */
export function CalendarFace({ cell }: { cell: CalendarCell }) {
  if (cell.day === null) return <View style={styles.cell} />;
  const f = cell.face ? FACE[cell.face] : null;
  const label = `${cell.date}${cell.face ? ` · ${FACE_LABEL[cell.face]}` : ''}${cell.today ? ` · ${S.calendar.today}` : ''}`;
  return (
    <View
      accessible
      accessibilityLabel={label}
      style={[
        styles.cell,
        f ? { backgroundColor: f.bg, justifyContent: 'flex-end' } : null,
        cell.future ? styles.future : null,
        cell.today ? styles.today : null,
      ]}
    >
      {f ? <Sprite id={f.sprite} /> : <Text style={styles.day}>{cell.day}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  cell: { flex: 1, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  future: { borderWidth: 2, borderStyle: 'dashed', borderColor: colors.dashed },
  today: { borderWidth: 2, borderStyle: 'solid', borderColor: colors.ink },
  day: { fontFamily: fonts.semibold, fontSize: 12, color: '#8A8696' },
});
