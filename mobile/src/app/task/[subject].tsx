import type { AnswerResponse, FlagResponse, Subject, TaskDto, TaskResult } from '@shared/types';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { ApiError, api, errorText } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { Button } from '@/components/Button';
import { OptionButton, type OptionState } from '@/components/OptionButton';
import { Card, Muted, ProgressBar, Screen, Title } from '@/components/ui';
import { colors, radius, spacing, subjectColors } from '@/constants/theme';
import { S, subjectIcons, subjectNames } from '@/i18n/strings';
import { confirm } from '@/lib/confirm';

export default function TaskScreen() {
  const { subject } = useLocalSearchParams<{ subject: Subject }>();
  const { setMe } = useAuth();
  const [task, setTask] = useState<TaskDto | null>(null);
  const [index, setIndex] = useState(0);
  const [answered, setAnswered] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<AnswerResponse | null>(null);
  const [pending, setPending] = useState<TaskResult | null>(null);
  const [result, setResult] = useState<TaskResult | null>(null);
  const [error, setError] = useState<{ message: string; fatal: boolean } | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setTask(null);
    setResult(null);
    setPending(null);
    setFeedback(null);
    setSelected(null);
    setError(null);
    setNote('');
    try {
      const t = await api<TaskDto>('/tasks', { body: { subject } });
      setTask(t);
      setAnswered(t.answeredCount);
      setIndex(Math.max(0, t.questions.findIndex((q) => !q.answered)));
    } catch (e) {
      const fatal = e instanceof ApiError && (e.code === 'DAILY_LIMIT' || e.code === 'NO_QUESTIONS');
      setError({ message: errorText(e), fatal });
    }
  }, [subject]);

  useEffect(() => {
    void load();
  }, [load]);

  const color = subjectColors[subject] ?? colors.primary;
  const q = task?.questions[index];
  const total = task?.questions.length ?? 5;

  function goNext() {
    if (pending) {
      setResult(pending);
      return;
    }
    if (!task) return;
    const nextIndex = task.questions.findIndex((x, i) => i > index && !x.answered);
    setIndex(nextIndex === -1 ? index : nextIndex);
    setSelected(null);
    setFeedback(null);
  }

  async function choose(choice: number) {
    if (!task || !q || feedback || busy) return;
    setSelected(choice);
    setBusy(true);
    setNote('');
    try {
      const r = await api<AnswerResponse>(`/tasks/${task.id}/answer`, { body: { questionId: q.id, choice } });
      setFeedback(r);
      setAnswered((n) => n + 1);
      void Haptics.notificationAsync(r.correct ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error);
      if (r.result) {
        setPending(r.result);
        setMe(r.result.me);
      }
    } catch (e) {
      setSelected(null);
      setNote(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  async function flag() {
    if (!task || !q) return;
    if (!(await confirm(S.task.flagConfirm, S.task.flagYes))) return;
    try {
      // Хариулсан бол зөвхөн тэмдэглэнэ; хариулаагүй бол тэр асуулт алгасагдана.
      const r = await api<FlagResponse>(`/questions/${q.id}/flag`, { body: feedback ? {} : { taskId: task.id } });
      setNote(S.task.flagged);
      if (feedback) return;
      setAnswered((n) => n + 1);
      if (r.result) {
        setMe(r.result.me);
        setResult(r.result);
        return;
      }
      goNext();
    } catch (e) {
      setNote(errorText(e));
    }
  }

  if (error) {
    return (
      <Screen contentStyle={styles.center}>
        <Text style={styles.bigIcon}>{subjectIcons[subject]}</Text>
        <Text style={styles.errorText}>{error.message}</Text>
        {!error.fatal && <Button title={S.common.retry} onPress={load} />}
        <Button title={S.task.home} variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }

  if (result) return <ResultView result={result} color={color} onAgain={load} />;

  if (!task || !q) {
    return (
      <Screen contentStyle={styles.center}>
        <ActivityIndicator color={color} size="large" />
        <Muted>{S.task.loading}</Muted>
      </Screen>
    );
  }

  const stateOf = (i: number): OptionState => {
    if (!feedback) return selected === i ? 'selected' : 'idle';
    if (i === feedback.correctIndex) return 'correct';
    if (i === selected) return 'wrong';
    return 'dim';
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.back}>‹</Text>
        </Pressable>
        <Text style={[styles.subject, { color }]}>
          {subjectIcons[subject]} {subjectNames[subject]}
        </Text>
        <Text style={styles.counter}>
          {Math.min(answered + (feedback ? 0 : 1), total)}/{total}
        </Text>
      </View>
      <ProgressBar value={answered} max={total} color={color} />

      <Card>
        <Muted>{S.task.questionOf(Math.min(answered + (feedback ? 0 : 1), total), total)}</Muted>
        <Text style={styles.prompt}>{q.prompt}</Text>
      </Card>

      <View style={{ gap: spacing.sm }}>
        {q.options.map((opt, i) => (
          <OptionButton key={i} index={i} label={opt} state={stateOf(i)} disabled={!!feedback || busy} onPress={() => choose(i)} />
        ))}
      </View>

      {feedback && (
        <Card style={{ borderWidth: 2, borderColor: feedback.correct ? colors.success : colors.danger }}>
          <Text style={[styles.verdict, { color: feedback.correct ? colors.success : colors.danger }]}>
            {feedback.correct ? S.task.correct : S.task.wrong}
          </Text>
          <Text style={styles.explanation}>{feedback.explanation}</Text>
          <Button title={pending ? S.task.seeResult : S.task.next} onPress={goNext} />
        </Card>
      )}

      {note ? <Muted center>{note}</Muted> : null}

      <Pressable onPress={flag} hitSlop={8} style={styles.flag}>
        <Text style={styles.flagText}>⚑ {S.task.flag}</Text>
      </Pressable>
    </Screen>
  );
}

function ResultView({ result, color, onAgain }: { result: TaskResult; color: string; onAgain: () => void }) {
  const leveledUp = result.levelAfter > result.levelBefore;
  const canAgain = result.me.todayTasks < result.me.dailyLimit;
  return (
    <Screen contentStyle={styles.center}>
      <Card style={styles.resultCard}>
        <Text style={styles.bigIcon}>{result.correctCount >= 4 ? '🏆' : result.correctCount >= 2 ? '🎉' : '💪'}</Text>
        <Title>{S.task.doneTitle}</Title>
        <Text style={styles.score}>{S.task.score(result.correctCount, result.total)}</Text>
        <View style={styles.rewards}>
          <View style={[styles.reward, { backgroundColor: '#FFF6DB' }]}>
            <Text style={[styles.rewardBig, { color: colors.gold }]} numberOfLines={1} adjustsFontSizeToFit>{S.task.points(result.pointsGained)}</Text>
            <Muted>{S.task.multiplier(result.multiplier)}</Muted>
          </View>
          <View style={[styles.reward, { backgroundColor: colors.primarySoft }]}>
            <Text style={[styles.rewardBig, { color: colors.primary }]} numberOfLines={1} adjustsFontSizeToFit>{S.task.xp(result.xpGained)}</Text>
            <Muted>{S.home.level(result.levelAfter)}</Muted>
          </View>
        </View>
        <Text style={styles.streak}>{S.task.streak(result.streak)}</Text>
        {leveledUp && <Text style={[styles.levelUp, { color }]}>{S.task.levelUp(result.levelAfter)}</Text>}
        {result.shieldUsed && <Muted center>{S.task.shieldUsed}</Muted>}
      </Card>
      {canAgain && <Button title={S.task.again} onPress={onAgain} style={styles.wide} />}
      <Button title={S.task.home} variant="secondary" onPress={() => router.back()} style={styles.wide} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  back: { fontSize: 40, lineHeight: 42, color: colors.text, fontWeight: '300', paddingHorizontal: spacing.xs },
  subject: { flex: 1, fontSize: 20, fontWeight: '800' },
  counter: { fontSize: 17, fontWeight: '800', color: colors.muted },
  prompt: { fontSize: 21, fontWeight: '700', color: colors.text, lineHeight: 29 },
  verdict: { fontSize: 22, fontWeight: '900' },
  explanation: { fontSize: 16, color: colors.text, lineHeight: 23 },
  flag: { alignSelf: 'center', padding: spacing.sm },
  flagText: { color: colors.muted, fontSize: 14, fontWeight: '600' },
  errorText: { fontSize: 18, fontWeight: '700', color: colors.text, textAlign: 'center' },
  bigIcon: { fontSize: 56 },
  resultCard: { alignItems: 'center', alignSelf: 'stretch' },
  score: { fontSize: 18, fontWeight: '700', color: colors.text },
  rewards: { flexDirection: 'row', gap: spacing.md, alignSelf: 'stretch' },
  reward: { flex: 1, alignItems: 'center', padding: spacing.md, borderRadius: radius.md, gap: 2 },
  rewardBig: { fontSize: 20, fontWeight: '900' },
  streak: { fontSize: 18, fontWeight: '800', color: colors.fire },
  levelUp: { fontSize: 20, fontWeight: '900' },
  wide: { alignSelf: 'stretch' },
});
