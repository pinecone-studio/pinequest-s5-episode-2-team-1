import { useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { Sprite } from '@/components/pixel';
import { QuizBoard } from '@/components/teacher/QuizBoard';
import { QuizHead } from '@/components/teacher/QuizHead';
import { QuizQuestion } from '@/components/teacher/QuizQuestion';
import { BackButton, Card, ErrorText, Muted, Screen } from '@/components/ui';
import { colors, fonts } from '@/constants/theme';
import { useQuiz } from '@/hooks/useQuiz';
import { T } from '@/i18n/teacher';
import { goBack } from '@/lib/nav';

/** Сурагч ангийн тэмцээнд оролцоно: нэгдээд хүлээнэ, асуулт бүрт хурдан хариулна, хариу бүрийн дараа байраа харна. */
export default function StudentQuiz() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { view, error, act, remainingMs } = useQuiz(Number(id));
  const back = () => goBack('/league');

  const needsJoin = !!view && !view.joined && view.phase !== 'finished';
  useEffect(() => {
    if (needsJoin) void act('join');
  }, [needsJoin, act]);

  if (!view) {
    return (
      <Screen contentStyle={styles.content}>
        <BackButton onPress={back} />
        {error ? <ErrorText>{error}</ErrorText> : <ActivityIndicator color={colors.violet} />}
      </Screen>
    );
  }

  const rank = view.board.findIndex((b) => b.isMe) + 1;
  const place = rank > 0 ? <Text style={styles.place}>{T.myPlace(rank, view.board.length)}</Text> : null;
  const mine = view.mine;
  const result = !mine ? T.missed : mine.correct ? T.right(mine.points ?? 0) : T.wrong;

  return (
    <Screen contentStyle={styles.content}>
      <BackButton onPress={back} />
      <QuizHead view={view} />
      {error ? <ErrorText>{error}</ErrorText> : null}

      {view.phase === 'lobby' ? (
        <Card style={styles.wait}>
          <Sprite id="bear_idle_scarf_164x280" label="Баавгай" style={styles.bear} />
          <Text style={styles.big}>{T.waitTitle}</Text>
          <Muted center>{`${T.waitHint} ${T.joined(view.players)}.`}</Muted>
        </Card>
      ) : null}

      {view.phase === 'question' || view.phase === 'reveal' ? (
        <QuizQuestion view={view} remainingMs={remainingMs} onAnswer={(choice) => void act('answer', { q: view.q, choice })} />
      ) : null}
      {view.phase === 'question' && mine ? <Text style={styles.status}>{T.sent}</Text> : null}

      {view.phase === 'reveal' ? (
        <View style={styles.reveal}>
          <Text style={[styles.status, mine?.correct ? styles.ok : styles.bad]}>{result}</Text>
          {place}
          <QuizBoard board={view.board} limit={3} />
        </View>
      ) : null}

      {view.phase === 'finished' ? (
        <View style={styles.reveal}>
          <Text style={styles.big}>{T.finished}</Text>
          {place}
          <QuizBoard board={view.board} />
          <Button title={T.leave} onPress={back} />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: 14, paddingTop: 8 },
  wait: { alignItems: 'center', gap: 10 },
  bear: { width: 98, height: 168 },
  big: { fontFamily: fonts.extrabold, fontSize: 22, color: colors.indigo, textAlign: 'center' },
  status: { fontFamily: fonts.bold, fontSize: 18, color: colors.ink, textAlign: 'center' },
  ok: { color: colors.okText },
  bad: { color: colors.dangerText },
  place: { fontFamily: fonts.extrabold, fontSize: 17, color: colors.indigo, textAlign: 'center' },
  reveal: { gap: 12 },
});
