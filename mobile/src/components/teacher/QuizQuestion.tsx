import type { QuizView } from '@shared/teacher';
import { StyleSheet, Text, View } from 'react-native';
import { OptionButton, type OptionState } from '@/components/OptionButton';
import { QuestionImage } from '@/components/QuestionImage';
import { Card, Muted } from '@/components/ui';
import { colors, fonts, radius } from '@/constants/theme';
import { T } from '@/i18n/teacher';

/**
 * Тэмцээний асуулт (тоолуур нь QuizHead-д): асуулт, 4 хариулт. Багшид `onAnswer`-гүй (зөвхөн харуулна).
 * Хариу гармагц зөв хариулт ногоон, миний буруу сонголт ягаан, хариулт бүрийн хажууд хэдэн хүн сонгосон нь.
 */
export function QuizQuestion({ view, onAnswer }: { view: QuizView; onAnswer?: (choice: number) => void }) {
  const q = view.question;
  if (!q) return null;
  const asking = view.phase === 'question';
  const mine = view.mine?.choice ?? null;

  const stateOf = (i: number): OptionState => {
    if (!asking && view.correctIndex !== null) return i === view.correctIndex ? 'correct' : i === mine ? 'wrong' : 'dim';
    if (mine !== null) return i === mine ? 'selected' : 'dim';
    return 'idle';
  };

  return (
    <>
      <Card>
        <Text style={styles.prompt}>{q.prompt}</Text>
        <QuestionImage uri={q.image} />
      </Card>
      <View style={styles.options}>
        {q.options.map((opt, i) => (
          <View key={i} style={styles.option}>
            <View style={styles.flex}>
              <OptionButton
                index={i}
                label={opt}
                state={stateOf(i)}
                disabled={!onAnswer || !asking || mine !== null}
                onPress={() => onAnswer?.(i)}
              />
            </View>
            {view.counts ? (
              <View style={[styles.count, i === view.correctIndex && styles.countOk]}>
                <Text style={styles.countText}>{T.picked(view.counts[i] ?? 0)}</Text>
              </View>
            ) : null}
          </View>
        ))}
      </View>
      {!asking && view.explanation ? <Muted center>{view.explanation}</Muted> : null}
    </>
  );
}

const styles = StyleSheet.create({
  prompt: { fontFamily: fonts.semibold, fontSize: 21, lineHeight: 28, color: colors.ink },
  options: { gap: 8 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flex: { flex: 1 },
  count: { minWidth: 58, paddingHorizontal: 8, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: colors.track, alignItems: 'center' },
  countOk: { backgroundColor: colors.lime },
  countText: { fontFamily: fonts.bold, fontSize: 13, color: colors.ink },
});
