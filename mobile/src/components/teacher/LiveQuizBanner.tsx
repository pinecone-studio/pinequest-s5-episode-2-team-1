import type { QuizActiveResponse } from '@shared/teacher';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { api } from '@/api/client';
import { Button } from '@/components/Button';
import { Card } from '@/components/ui';
import { colors, fonts } from '@/constants/theme';
import { T } from '@/i18n/teacher';
import { AssignmentCards } from './AssignmentCards';

const POLL_MS = 5000;

/**
 * Анги tab дээр багшаас ирсэн зүйлс: тэмцээн эхэлсэн бол "Тэмцээнд нэгдэх" (дэлгэц нээлттэй байхад 5 сек тутам шалгана),
 * доор нь багшийн даалгаврууд.
 */
export function LiveQuizBanner() {
  const [quizId, setQuizId] = useState<number | null>(null);
  useFocusEffect(
    useCallback(() => {
      const check = () =>
        api<QuizActiveResponse>('/quiz/active')
          .then((r) => setQuizId(r.quizId))
          .catch(() => undefined);
      void check();
      const timer = setInterval(check, POLL_MS);
      return () => clearInterval(timer);
    }, []),
  );
  return (
    <>
      {quizId ? (
        <Card style={styles.card}>
          <Text style={styles.title}>{T.liveBanner}</Text>
          <Text style={styles.sub}>{T.liveBannerSub}</Text>
          <Button title={T.joinLive} variant="lemon" onPress={() => router.push(`/quiz/${quizId}`)} />
        </Card>
      ) : null}
      <AssignmentCards />
    </>
  );
}

const styles = StyleSheet.create({
  card: { gap: 8, backgroundColor: colors.violet },
  title: { fontFamily: fonts.extrabold, fontSize: 20, color: colors.white },
  sub: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 20, color: colors.white },
});
