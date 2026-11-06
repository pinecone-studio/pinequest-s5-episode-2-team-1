import { clanTitle } from '@shared/clan';
import type { TeacherClassDetailResponse, TopicStatDto } from '@shared/teacher';
import { StyleSheet } from 'react-native';
import { Button } from '@/components/Button';
import { Card, ErrorText, Muted, SectionTitle } from '@/components/ui';
import { T } from '@/i18n/teacher';
import { ClassStats, LiveCard } from './ClassStats';
import { WeakTopics } from './WeakTopics';

/** Ангийн "Тойм" таб: товч тоо, явж буй тэмцээн, тэмцээн эхлүүлэх, ангийн нэгдсэн сул сэдэв. */
export function ClassOverview({
  data,
  busy,
  error,
  onStart,
  onTask,
}: {
  data: TeacherClassDetailResponse;
  busy: boolean;
  error: string;
  onStart: (topic: TopicStatDto | null) => void;
  onTask: (topic: TopicStatDto) => void;
}) {
  const cls = data.class;
  return (
    <>
      <ClassStats students={data.students} />
      {cls.liveQuizId ? <LiveCard quizId={cls.liveQuizId} title={clanTitle(cls.name)} /> : null}
      <Card style={styles.quiz}>
        <SectionTitle>{T.quizTitle}</SectionTitle>
        <Muted>{`${data.subject ? `${T.subjects[data.subject]} · ` : ''}${T.quizSub}`}</Muted>
        <ErrorText>{error}</ErrorText>
        <Button title={T.startQuiz} variant={cls.liveQuizId ? 'lime' : 'lemon'} loading={busy} onPress={() => onStart(null)} />
      </Card>
      <WeakTopics topics={data.weakTopics} busy={busy} onQuiz={onStart} onTask={onTask} />
    </>
  );
}

const styles = StyleSheet.create({
  quiz: { gap: 12 },
});
