import { clanTitle } from '@shared/clan';
import type { QuizView } from '@shared/teacher';
import { StyleSheet, Text, View } from 'react-native';
import { PixelText } from '@/components/pinecones';
import { ProgressBar } from '@/components/ui';
import { arena, colors, fonts, hardShadow, radius } from '@/constants/theme';
import { T } from '@/i18n/teacher';

const LOW_MS = 5000;

/**
 * Тэмцээний толгой (тулааны arena өнгөөр): "ТЭМЦЭЭН", анги · хичээл, хэддүгээр асуулт, асуулт явж байхад том тоолуур.
 * Багш самбарт (проектор) гаргахад холоос уншигдахаар том.
 */
export function QuizHead({ view, remainingMs }: { view: QuizView; remainingMs: number }) {
  const asking = view.phase === 'question';
  const low = remainingMs < LOW_MS;
  const showQ = view.q >= 0 && view.phase !== 'finished';
  return (
    <View style={styles.stage}>
      <View style={styles.top}>
        <View style={styles.titles}>
          <View accessibilityRole="header">
            <PixelText text="ТЭМЦЭЭН" px={3} color={colors.lemon} shadow={colors.ink} />
          </View>
          <Text style={styles.sub}>{`${clanTitle(view.className)} · ${T.subjects[view.subject]}`}</Text>
        </View>
        {showQ ? (
          <View style={styles.pill} accessible accessibilityLabel={T.questionOf(view.q + 1, view.total)}>
            <Text style={styles.pillText}>{`${view.q + 1}/${view.total}`}</Text>
          </View>
        ) : null}
      </View>
      {asking ? (
        <View style={styles.timerRow}>
          <Text style={[styles.timer, low && styles.timerLow]}>{Math.ceil(remainingMs / 1000)}</Text>
          <View style={styles.bar}>
            <ProgressBar value={remainingMs} max={view.questionMs} color={low ? '#E58FB4' : colors.lemon} height={10} />
            <Text style={styles.answered}>{T.answered(view.answered, view.players)}</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { gap: 12, padding: 16, borderRadius: radius.card, borderWidth: 2, borderColor: colors.ink, backgroundColor: arena.bg, ...hardShadow(4) },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  titles: { flex: 1, gap: 6 },
  sub: { fontFamily: fonts.semibold, fontSize: 15, color: colors.lavender },
  pill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: arena.panel, borderWidth: 1, borderColor: arena.line },
  pillText: { fontFamily: fonts.pixelNum, fontSize: 16, color: colors.white },
  timerRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  timer: { minWidth: 56, fontFamily: fonts.pixelNum, fontSize: 40, lineHeight: 48, color: colors.lemon, textAlign: 'center' },
  timerLow: { color: '#E58FB4' },
  bar: { flex: 1, gap: 6 },
  answered: { fontFamily: fonts.bold, fontSize: 14, color: colors.white },
});
