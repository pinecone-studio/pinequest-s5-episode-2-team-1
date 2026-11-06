import type { StudentStatDto } from '@shared/teacher';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { colors, fonts, hardShadow, radius } from '@/constants/theme';
import { T } from '@/i18n/teacher';

/** Ангийн товч тоо: сурагч, дундаж зөв хувь (хариултын тоогоор жигнэсэн), нийт хариулт. */
export function ClassStats({ students }: { students: StudentStatDto[] }) {
  const answers = students.reduce((n, s) => n + s.answered, 0);
  const weighted = students.reduce((n, s) => n + (s.percent ?? 0) * s.answered, 0);
  const stats: [string, string][] = [
    [String(students.length), T.statStudents],
    [answers > 0 ? `${Math.round(weighted / answers)}%` : '—', T.statAverage],
    [String(answers), T.statAnswers],
  ];
  return (
    <View style={styles.row}>
      {stats.map(([value, label]) => (
        <View key={label} style={styles.cell} accessible accessibilityLabel={`${value} ${label}`}>
          <Text style={styles.value}>{value}</Text>
          <Text style={styles.label}>{label}</Text>
        </View>
      ))}
    </View>
  );
}

/** Явж буй тэмцээн: багшийн нүүр, ангийн дэлгэц дээр хамгийн түрүүнд. */
export function LiveCard({ quizId, title }: { quizId: number; title: string }) {
  return (
    <View style={styles.live}>
      <View style={styles.liveTexts}>
        <Text style={styles.liveTag}>{`● ${T.liveNow}`}</Text>
        <Text style={styles.liveTitle} numberOfLines={1}>
          {title}
        </Text>
      </View>
      <Button title={T.openLiveShort} variant="lemon" small onPress={() => router.push(`/teacher/quiz/${quizId}`)} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  cell: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: 12,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.line,
  },
  value: { fontFamily: fonts.pixelNum, fontSize: 20, lineHeight: 26, color: colors.indigo },
  label: { fontFamily: fonts.semibold, fontSize: 12, color: colors.muted },
  live: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: radius.card,
    borderWidth: 2,
    borderColor: colors.ink,
    backgroundColor: colors.violet,
    ...hardShadow(4),
  },
  liveTexts: { flex: 1, gap: 2 },
  liveTag: { fontFamily: fonts.bold, fontSize: 13, color: colors.lemon },
  liveTitle: { fontFamily: fonts.extrabold, fontSize: 18, color: colors.white },
});
