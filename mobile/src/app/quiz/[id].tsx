import { useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text } from 'react-native';
import { Button } from '@/components/Button';
import { Sprite } from '@/components/pixel';
import { QuizBoard } from '@/components/teacher/QuizBoard';
import { QuizHead } from '@/components/teacher/QuizHead';
import { QuizQuestion } from '@/components/teacher/QuizQuestion';
import { QuizResult } from '@/components/teacher/QuizResult';
import { BackButton, Card, ErrorText, Muted, Screen } from '@/components/ui';
import { colors, fonts } from '@/constants/theme';
import { useQuiz } from '@/hooks/useQuiz';
import { T } from '@/i18n/teacher';
import { goBack } from '@/lib/nav';

/** Сурагч ангийн тэмцээнд оролцоно: нэгдээд хүлээнэ, асуулт бүрт хурдан хариулна, хариу бүрийн дараа дүн, байраа харна. */
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
  const place = rank > 0 ? T.myPlace(rank, view.board.length) : null;
  const mine = view.mine;
  const finished = view.phase === 'finished';

  return (
    <Screen contentStyle={styles.content} footer={finished ? <Button title={T.leave} onPress={back} /> : undefined}>
      <BackButton onPress={back} />
      <QuizHead view={view} remainingMs={remainingMs} />
      {error ? <ErrorText>{error}</ErrorText> : null}

      {view.phase === 'lobby' ? (
        <Card style={styles.wait}>
          <Sprite id="bear_idle_scarf_164x280" label="Баавгай" style={styles.bear} />
          <Text style={styles.big}>{T.waitTitle}</Text>
          <Muted center>{`${T.waitHint} ${T.joined(view.players)}.`}</Muted>
        </Card>
      ) : null}

      {view.phase === 'reveal' ? (
        <QuizResult
          mood={mine?.correct ? 'cheer' : 'tired'}
          title={!mine ? T.missed : mine.correct ? T.right(mine.points ?? 0) : T.wrong}
          place={place}
        />
      ) : null}
      {finished ? <QuizResult mood={rank > 0 && rank <= 3 ? 'cheer' : 'idle'} title={T.finished} place={place} /> : null}

      {view.phase === 'question' || view.phase === 'reveal' ? (
        <QuizQuestion view={view} onAnswer={(choice) => void act('answer', { q: view.q, choice })} />
      ) : null}
      {view.phase === 'question' && mine ? <Text style={styles.status}>{T.sent}</Text> : null}

      {view.phase === 'reveal' ? <QuizBoard board={view.board} limit={3} /> : null}
      {finished ? <QuizBoard board={view.board} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: 14, paddingTop: 8 },
  wait: { alignItems: 'center', gap: 10 },
  bear: { width: 98, height: 168 },
  big: { fontFamily: fonts.extrabold, fontSize: 22, color: colors.indigo, textAlign: 'center' },
  status: { fontFamily: fonts.bold, fontSize: 18, color: colors.ink, textAlign: 'center' },
});
