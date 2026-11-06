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
      <QuizHead view={view} remainingMs={remainingMs} />
      {error ? <ErrorText>{error}</ErrorText> : null}

      {view.phase === 'lobby' ? (
        <Card style={styles.lobby}>
          <Text style={styles.count} accessibilityLabel={T.joined(view.players)}>
            {view.players}
          </Text>
          <Text style={styles.countLabel}>{T.joinedBig}</Text>
          <View style={styles.looks}>
            {view.board.map((p, i) => (
              <View key={i} style={styles.player}>
                <Avatar size={52} border={2} look={p.look} />
                <Text style={styles.playerName} numberOfLines={1}>
                  {p.name}
                </Text>
              </View>
            ))}
          </View>
          <Muted center>{T.lobbyHint}</Muted>
        </Card>
      ) : null}

      {view.phase === 'question' || view.phase === 'reveal' ? <QuizQuestion view={view} /> : null}

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
  lobby: { gap: 6, alignItems: 'center' },
  count: { fontFamily: fonts.pixelNum, fontSize: 64, lineHeight: 76, color: colors.indigo },
  countLabel: { fontFamily: fonts.bold, fontSize: 17, color: colors.ink },
  looks: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center', marginVertical: 8 },
  player: { width: 64, alignItems: 'center', gap: 4 },
  playerName: { fontFamily: fonts.semibold, fontSize: 12, color: colors.ink, textAlign: 'center' },
  big: { fontFamily: fonts.extrabold, fontSize: 24, color: colors.indigo, textAlign: 'center' },
});
