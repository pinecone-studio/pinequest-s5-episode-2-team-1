import type { AssignmentView } from '@shared/assignment';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { api, errorText } from '@/api/client';
import { Button } from '@/components/Button';
import { OptionButton, type OptionState } from '@/components/OptionButton';
import { QuizResult, type ResultMood } from '@/components/teacher/QuizResult';
import { BackButton, Card, ErrorText, Muted, ProgressBar, Screen } from '@/components/ui';
import { colors, fonts } from '@/constants/theme';
import { A } from '@/i18n/assignments';
import { T } from '@/i18n/teacher';
import { goBack } from '@/lib/nav';

/** Сурагч багшийн даалгаврыг хийнэ: асуулт бүрт хариулаад зөв хариу, тайлбарыг харж "Дараах"; төгсгөлд дүн. */
export default function AssignmentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [view, setView] = useState<AssignmentView | null>(null);
  // хариулсан асуултыг "Дараах" дарах хүртэл харуулна
  const [shown, setShown] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const back = () => goBack('/league');

  useEffect(() => {
    api<AssignmentView>(`/assignments/${id}`)
      .then(setView)
      .catch((e) => setError(errorText(e)));
  }, [id]);

  if (!view) {
    return (
      <Screen contentStyle={styles.content}>
        <BackButton onPress={back} />
        {error ? <ErrorText>{error}</ErrorText> : <ActivityIndicator color={colors.violet} />}
      </Screen>
    );
  }

  const total = view.questions.length;
  const pos = shown ?? view.answers.length;
  const finished = pos >= total;
  const mine = view.answers[pos] ?? null;
  const correct = view.answers.filter((a) => a.correct).length;
  const mood: ResultMood = correct * 5 >= total * 4 ? 'cheer' : correct * 2 >= total ? 'idle' : 'tired';

  async function answer(choice: number) {
    setBusy(true);
    try {
      setView(await api<AssignmentView>(`/assignments/${id}/answer`, { body: { position: pos, choice } }));
      setShown(pos);
      setError('');
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  const stateOf = (i: number): OptionState => (!mine ? 'idle' : i === mine.correctIndex ? 'correct' : i === mine.choice ? 'wrong' : 'dim');
  const footer = finished ? (
    <Button title={A.back} onPress={back} />
  ) : mine ? (
    <Button title={pos + 1 >= total ? T.finish : A.next} variant="lemon" onPress={() => setShown(null)} />
  ) : undefined;

  return (
    <Screen contentStyle={styles.content} footer={footer}>
      <BackButton onPress={back} />
      <View style={styles.head}>
        <Text style={styles.kicker}>{A.banner}</Text>
        <Text accessibilityRole="header" style={styles.title}>
          {view.topicName ?? A.mixed}
        </Text>
        <View style={styles.progress}>
          <View style={styles.flex}>
            <ProgressBar value={view.answers.length} max={total} color={colors.violet} height={10} />
          </View>
          <Text style={styles.count}>{A.progress(Math.min(pos + 1, total), total)}</Text>
        </View>
      </View>
      {error ? <ErrorText>{error}</ErrorText> : null}

      {finished ? (
        <>
          <QuizResult mood={mood} title={A.finished} place={A.result(correct, total)} />
          <Muted center>{A.finishedSub}</Muted>
        </>
      ) : !view.open && !mine ? (
        <Muted center>{A.closed}</Muted>
      ) : (
        <>
          <Card>
            <Text style={styles.prompt}>{view.questions[pos].prompt}</Text>
          </Card>
          <View style={styles.options}>
            {view.questions[pos].options.map((opt, i) => (
              <OptionButton key={i} index={i} label={opt} state={stateOf(i)} disabled={busy || !!mine} onPress={() => void answer(i)} />
            ))}
          </View>
          {mine ? (
            <View accessibilityLiveRegion="polite" style={styles.feedback}>
              <Text style={[styles.verdict, { color: mine.correct ? colors.indigo : colors.dangerText }]}>{mine.correct ? A.right : A.wrong}</Text>
              {mine.explanation ? <Muted center>{mine.explanation}</Muted> : null}
            </View>
          ) : null}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: 14, paddingTop: 8 },
  head: { gap: 6 },
  kicker: { fontFamily: fonts.bold, fontSize: 12, letterSpacing: 0.6, textTransform: 'uppercase', color: colors.indigo },
  title: { fontFamily: fonts.extrabold, fontSize: 24, lineHeight: 30, color: colors.ink },
  progress: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  flex: { flex: 1 },
  count: { fontFamily: fonts.pixelNum, fontSize: 14, color: colors.ink },
  prompt: { fontFamily: fonts.semibold, fontSize: 21, lineHeight: 28, color: colors.ink },
  options: { gap: 8 },
  feedback: { gap: 6, alignItems: 'center' },
  verdict: { fontFamily: fonts.extrabold, fontSize: 20 },
});
