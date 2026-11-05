import type { QuizView } from '@shared/teacher';
import { StyleSheet, Text, View } from 'react-native';
import { OptionButton, type OptionState } from '@/components/OptionButton';
import { Card, Muted, ProgressBar } from '@/components/ui';
import { colors, fonts } from '@/constants/theme';
import { T } from '@/i18n/teacher';

/**
 * Тэмцээний асуулт (тулааны асуултын загвараар): тоолуур, асуулт, 4 хариулт. Багшид `onAnswer`-гүй (зөвхөн харуулна),
 * хариу гармагц зөв хариулт ногоон, миний буруу сонголт ягаан.
 */
export function QuizQuestion({ view, remainingMs, onAnswer }: { view: QuizView; remainingMs: number; onAnswer?: (choice: number) => void }) {
  const q = view.question;
  if (!q) return null;
  const asking = view.phase === 'question';
  const mine = view.mine?.choice ?? null;
  const low = remainingMs < 5000;

  const stateOf = (i: number): OptionState => {
    if (!asking && view.correctIndex !== null) return i === view.correctIndex ? 'correct' : i === mine ? 'wrong' : 'dim';
    if (mine !== null) return i === mine ? 'selected' : 'dim';
    return 'idle';
  };

  return (
    <>
      <Card>
        <View style={styles.header}>
          <Muted>{T.questionOf(view.q + 1, view.total)}</Muted>
          {asking ? <Text style={[styles.timer, low && { color: colors.dangerText }]}>{T.seconds(Math.ceil(remainingMs / 1000))}</Text> : null}
        </View>
        {asking ? <ProgressBar value={remainingMs} max={view.questionMs} color={low ? '#E58FB4' : colors.violet} height={8} /> : null}
        <Text style={styles.prompt}>{q.prompt}</Text>
      </Card>
      <View style={{ gap: 8 }}>
        {q.options.map((opt, i) => (
          <OptionButton
            key={i}
            index={i}
            label={opt}
            state={stateOf(i)}
            disabled={!onAnswer || !asking || mine !== null}
            onPress={() => onAnswer?.(i)}
          />
        ))}
      </View>
      {!asking && view.explanation ? <Muted center>{view.explanation}</Muted> : null}
    </>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  timer: { fontFamily: fonts.pixelNum, fontSize: 15, color: colors.ink },
  prompt: { fontFamily: fonts.semibold, fontSize: 21, lineHeight: 28, color: colors.ink },
});
