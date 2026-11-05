import { clanTitle } from '@shared/clan';
import type { QuizActiveResponse, StudentStatDto, TeacherClassDetailResponse, TopicStatDto } from '@shared/teacher';
import type { Subject } from '@shared/types';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { api, errorText } from '@/api/client';
import { Button } from '@/components/Button';
import { StudentRow } from '@/components/teacher/StudentRow';
import { WeakTopics } from '@/components/teacher/WeakTopics';
import { BackButton, Card, Chip, ErrorText, Muted, Screen, SectionTitle } from '@/components/ui';
import { colors, fonts, radius } from '@/constants/theme';
import { T } from '@/i18n/teacher';
import { formatClanCode } from '@/lib/clan';
import { confirm } from '@/lib/confirm';
import { goBack } from '@/lib/nav';

const QUIZ_SUBJECTS: Subject[] = ['math', 'mongolian'];

/** Нэг анги: нэгдэх код, тэмцээн эхлүүлэх, ангийн сул сэдэв, сурагчдын явц. */
export default function TeacherClass() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const [data, setData] = useState<TeacherClassDetailResponse | null>(null);
  const [subject, setSubject] = useState<Subject>('math');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setData(await api<TeacherClassDetailResponse>(`/teacher/classes/${code}`));
      setError('');
    } catch (e) {
      setError(errorText(e));
    }
  }, [code]);
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function start(s: Subject, topic: TopicStatDto | null) {
    setBusy(true);
    try {
      const { quizId } = await api<QuizActiveResponse>(`/teacher/classes/${code}/quiz`, { body: { subject: s, topic: topic?.topic ?? null } });
      router.push(`/teacher/quiz/${quizId}`);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  async function remove(s: StudentStatDto) {
    if (!(await confirm(T.removeConfirm(s.name), T.remove))) return;
    try {
      setData(await api<TeacherClassDetailResponse>(`/teacher/classes/${code}/students/${s.code}`, { method: 'DELETE' }));
    } catch (e) {
      setError(errorText(e));
    }
  }

  const cls = data?.class;
  return (
    <Screen contentStyle={styles.content} onRefresh={() => void load()}>
      <BackButton onPress={() => goBack('/teacher')} />
      {!data || !cls ? (
        error ? <ErrorText>{error}</ErrorText> : <ActivityIndicator color={colors.violet} />
      ) : (
        <>
          <Text accessibilityRole="header" style={styles.title}>
            {clanTitle(cls.name)}
          </Text>
          <Card style={styles.codeCard}>
            <Text style={styles.codeLabel}>{T.codeTitle}</Text>
            <Text selectable style={styles.code} accessibilityLabel={cls.code.split('').join(' ')}>
              {formatClanCode(cls.code)}
            </Text>
            <Text style={styles.codeHint}>{T.codeHint}</Text>
          </Card>

          <Card style={styles.quiz}>
            <SectionTitle>{T.quizTitle}</SectionTitle>
            <Muted>{T.quizSub}</Muted>
            <View style={styles.chips}>
              {QUIZ_SUBJECTS.map((s) => (
                <Chip key={s} label={T.subjects[s]} selected={s === subject} onPress={() => setSubject(s)} />
              ))}
            </View>
            {error ? <ErrorText>{error}</ErrorText> : null}
            <Button title={T.startQuiz} variant="lemon" loading={busy} disabled={cls.students === 0} onPress={() => void start(subject, null)} />
            {cls.liveQuizId ? <Button title={T.openLive} variant="secondary" onPress={() => router.push(`/teacher/quiz/${cls.liveQuizId}`)} /> : null}
          </Card>

          <WeakTopics topics={data.weakTopics} busy={busy || cls.students === 0} onQuiz={(t) => void start(t.subject, t)} />

          <SectionTitle>{`${T.studentsTitle} · ${T.students(cls.students, cls.maxStudents)}`}</SectionTitle>
          {data.students.length === 0 ? <Muted>{T.studentsEmpty}</Muted> : null}
          <View style={styles.list}>
            {data.students.map((s) => (
              <StudentRow key={s.code} s={s} onRemove={() => void remove(s)} />
            ))}
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: 14, paddingTop: 8 },
  title: { fontFamily: fonts.extrabold, fontSize: 28, color: colors.ink },
  codeCard: { alignItems: 'center', gap: 6, backgroundColor: colors.indigo, borderRadius: radius.card },
  codeLabel: { fontFamily: fonts.bold, fontSize: 15, color: colors.lavender },
  code: { fontFamily: fonts.pixelNum, fontSize: 44, lineHeight: 56, letterSpacing: 4, color: colors.lemon },
  codeHint: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 20, color: colors.white, textAlign: 'center' },
  quiz: { gap: 12 },
  chips: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  list: { gap: 8 },
});
