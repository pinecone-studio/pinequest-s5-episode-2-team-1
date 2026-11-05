import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { QuizBoard } from '@/components/teacher/QuizBoard';
import { QuizHead } from '@/components/teacher/QuizHead';
import { QuizQuestion } from '@/components/teacher/QuizQuestion';
import { BackButton, Card, ErrorText, Muted, Screen, SectionTitle } from '@/components/ui';
import { colors, fonts } from '@/constants/theme';
import { useQuiz } from '@/hooks/useQuiz';
import { T } from '@/i18n/teacher';
import { goBack } from '@/lib/nav';

/** Багш тэмцээнийг удирдана: хүлээлгийн өрөө → асуулт → хариу + тэргүүлэгчид → … → дүн. Самбарт (проектор) гаргахад тохирно. */
export default function TeacherQuiz() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { view, error, act, remainingMs } = useQuiz(Number(id));
  const back = () => goBack(view ? `/teacher/${view.classCode}` : '/teacher');

  if (!view) {
    return (
      <Screen contentStyle={styles.content}>
        <BackButton onPress={back} />
        {error ? <ErrorText>{error}</ErrorText> : <ActivityIndicator color={colors.violet} />}
      </Screen>
    );
  }

  const last = view.q + 1 >= view.total;
  const footer =
    view.phase === 'lobby' ? (
      <Button title={T.begin} variant="lemon" disabled={view.players === 0} onPress={() => void act('next')} />
    ) : view.phase === 'question' ? (
      <Button title={T.showAnswer} variant="secondary" onPress={() => void act('next')} />
    ) : view.phase === 'reveal' ? (
      <Button title={last ? T.finish : T.next} variant="lemon" onPress={() => void act('next')} />
    ) : (
      <Button title={T.back} onPress={() => router.replace(`/teacher/${view.classCode}`)} />
    );

  return (
    <Screen contentStyle={styles.content} footer={footer}>
      <BackButton onPress={back} />
      <QuizHead view={view} />
      {error ? <ErrorText>{error}</ErrorText> : null}

      {view.phase === 'lobby' ? (
        <Card style={styles.lobby}>
          <SectionTitle>{T.lobbyTitle}</SectionTitle>
          <Muted>{T.lobbyHint}</Muted>
          <Text style={styles.big}>{T.joined(view.players)}</Text>
          <View style={styles.looks}>
            {view.board.map((p, i) => (
              <Avatar key={i} size={48} border={2} look={p.look} label={p.name} />
            ))}
          </View>
        </Card>
      ) : null}

      {view.phase === 'question' || view.phase === 'reveal' ? (
        <>
          <QuizQuestion view={view} remainingMs={remainingMs} />
          {view.phase === 'question' ? <Text style={styles.count}>{T.answered(view.answered, view.players)}</Text> : null}
        </>
      ) : null}

      {view.phase === 'reveal' ? (
        <>
          <SectionTitle>{T.board}</SectionTitle>
          <QuizBoard board={view.board} limit={5} />
        </>
      ) : null}

      {view.phase === 'finished' ? (
        <>
          <Text style={styles.big}>{T.finished}</Text>
          <QuizBoard board={view.board} />
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: 14, paddingTop: 8 },
  lobby: { gap: 10 },
  big: { fontFamily: fonts.extrabold, fontSize: 24, color: colors.indigo, textAlign: 'center' },
  looks: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  count: { fontFamily: fonts.bold, fontSize: 17, color: colors.ink, textAlign: 'center' },
});
