import { clanTitle } from '@shared/clan';
import type { QuizActiveResponse, StudentStatDto, TeacherClassDetailResponse, TopicStatDto } from '@shared/teacher';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { api, errorText } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { SegmentedTabs } from '@/components/SegmentedTabs';
import { AssignForm } from '@/components/teacher/AssignForm';
import { AssignmentList } from '@/components/teacher/AssignmentList';
import { ClassCode } from '@/components/teacher/ClassCode';
import { ClassOverview } from '@/components/teacher/ClassOverview';
import { StreakBoard } from '@/components/teacher/StreakBoard';
import { StudentRow } from '@/components/teacher/StudentRow';
import { BackButton, ErrorText, Muted, Screen, SectionTitle } from '@/components/ui';
import { colors, fonts } from '@/constants/theme';
import { T } from '@/i18n/teacher';
import { confirm } from '@/lib/confirm';
import { goBack } from '@/lib/nav';

type Tab = 'overview' | 'tasks' | 'students';
const TABS: { value: Tab; label: string }[] = [
  { value: 'overview', label: T.tabOverview },
  { value: 'tasks', label: T.tabTasks },
  { value: 'students', label: T.tabStudents },
];

/** Нэг анги: сурагчгүй бол нэгдэх код. Сурагчтай бол Тойм (тэмцээн, сул сэдэв) · Даалгавар · Сурагчид (дараалал). */
export default function TeacherClass() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const { me } = useAuth();
  const [data, setData] = useState<TeacherClassDetailResponse | null>(null);
  const [tab, setTab] = useState<Tab>('overview');
  // сул сэдвийн "Даалгавар өгөх"-өөс ирвэл тэр сэдэв сонгогдоно
  const [taskTopic, setTaskTopic] = useState<string | null>(null);
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

  async function run(action: () => Promise<void>) {
    setBusy(true);
    try {
      await action();
      setError('');
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  const start = (topic: TopicStatDto | null) =>
    run(async () => {
      // шинэ тэмцээн явж буйг нь дуусгадаг тул асууна
      if (data?.class.liveQuizId && !(await confirm(T.newQuizConfirm, T.startQuiz))) return;
      const { quizId } = await api<QuizActiveResponse>(`/teacher/classes/${code}/quiz`, {
        body: { topic: topic?.topic ?? null },
      });
      router.push(`/teacher/quiz/${quizId}`);
    });

  const give = (days: number) =>
    run(async () => {
      await api(`/teacher/classes/${code}/assignments`, { body: { topic: taskTopic, days } });
      await load();
    });

  async function remove(s: StudentStatDto) {
    if (!(await confirm(T.removeConfirm(s.name), T.remove))) return;
    await run(async () => setData(await api<TeacherClassDetailResponse>(`/teacher/classes/${code}/students/${s.code}`, { method: 'DELETE' })));
  }

  const cls = data?.class;
  if (!data || !cls) {
    return (
      <Screen contentStyle={styles.content}>
        <BackButton onPress={() => goBack('/teacher')} />
        {error ? <ErrorText>{error}</ErrorText> : <ActivityIndicator color={colors.violet} />}
      </Screen>
    );
  }

  const empty = cls.students === 0;
  const pick = (t: Tab) => {
    setTab(t);
    setError('');
  };
  return (
    <Screen contentStyle={styles.content} onRefresh={() => void load()}>
      <BackButton onPress={() => goBack('/teacher')} />
      <Text accessibilityRole="header" style={styles.title}>
        {clanTitle(cls.name)}
      </Text>
      {empty ? (
        <>
          <ClassCode name={clanTitle(cls.name)} code={cls.code} big />
          <Muted center>{T.studentsEmpty}</Muted>
        </>
      ) : (
        <SegmentedTabs value={tab} options={TABS} onChange={pick} label={T.tabsLabel} />
      )}

      {!empty && tab === 'overview' ? (
        <ClassOverview
          data={data}
          busy={busy}
          error={error}
          onStart={(t) => void start(t)}
          onTask={(t) => {
            setTaskTopic(t.topic);
            pick('tasks');
          }}
        />
      ) : null}

      {!empty && tab === 'tasks' ? (
        <>
          <AssignForm topics={data.weakTopics} topic={taskTopic} onTopic={setTaskTopic} busy={busy} error={error} onGive={(d) => void give(d)} />
          <AssignmentList items={data.assignments} today={me?.today ?? new Date().toISOString().slice(0, 10)} />
        </>
      ) : null}

      {!empty && tab === 'students' ? (
        <>
          <StreakBoard students={data.students} />
          <SectionTitle>{`${T.studentsTitle} · ${cls.students}/${cls.maxStudents}`}</SectionTitle>
          {error ? <ErrorText>{error}</ErrorText> : null}
          <View style={styles.list}>
            {data.students.map((s) => (
              <StudentRow key={s.code} s={s} onRemove={() => void remove(s)} />
            ))}
          </View>
          <ClassCode name={clanTitle(cls.name)} code={cls.code} big={false} />
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: 14, paddingTop: 8 },
  title: { fontFamily: fonts.extrabold, fontSize: 28, color: colors.ink },
  list: { gap: 8 },
});
