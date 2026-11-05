import type { QuizRankDto } from '@shared/teacher';
import { StyleSheet, Text, View } from 'react-native';
import { Avatar } from '@/components/Avatar';
import { colors, fonts, radius } from '@/constants/theme';
import { T } from '@/i18n/teacher';

const MEDAL = ['#F2C94C', '#C9CDD6', '#D9935B'];

/** Тэмцээний тэргүүлэгчид (Анги tab-ын эрэмбийн мөрийн загвараар). `limit` өгвөл эхний хэдийг + намайг. */
export function QuizBoard({ board, limit }: { board: QuizRankDto[]; limit?: number }) {
  const rows = board.map((r, i) => ({ ...r, rank: i + 1 }));
  const shown = limit ? rows.filter((r) => r.rank <= limit || r.isMe) : rows;
  return (
    <View style={styles.list} accessibilityRole="list">
      {shown.map((r) => (
        <View key={`${r.rank}-${r.name}`} style={[styles.row, r.isMe && styles.rowMe]}>
          <View style={[styles.rank, r.rank <= 3 && { backgroundColor: MEDAL[r.rank - 1] }]}>
            <Text style={styles.rankText}>{r.rank}</Text>
          </View>
          <Avatar size={36} border={2} look={r.look} />
          <Text style={styles.name} numberOfLines={1}>
            {r.isMe ? `${r.name} (${T.you})` : r.name}
          </Text>
          <Text style={styles.score}>{r.score}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 6 },
  row: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.line,
  },
  rowMe: { borderColor: colors.violet, backgroundColor: colors.trackAlt },
  rank: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.track },
  rankText: { fontFamily: fonts.pixelNum, fontSize: 13, color: colors.ink },
  name: { flex: 1, fontFamily: fonts.bold, fontSize: 16, color: colors.ink },
  score: { fontFamily: fonts.pixelNum, fontSize: 15, color: colors.indigo },
});
