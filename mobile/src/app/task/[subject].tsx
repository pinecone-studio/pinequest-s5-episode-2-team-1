import type { AnswerResponse, FlagResponse, Subject, TaskDto, TaskResult } from '@shared/types';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { ApiError, api, errorText } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { Button } from '@/components/Button';
import { OptionButton, type OptionState } from '@/components/OptionButton';
import { AnimatedBar, Motion, Pop, Sprite } from '@/components/pixel';
import { RewardView } from '@/components/RewardView';
import { colors, fonts, radius } from '@/constants/theme';
import { S, subjectNames } from '@/i18n/strings';
import { confirm } from '@/lib/confirm';
import type { SpriteKey } from '@/sprites';

const XP_PER_CORRECT = 10;

/** 05 · Хичээл (асуулт) ба 06 · Шагнал. Логик: сонгох → ШАЛГАХ → серверт хариулт → тайлбар → дараагийн асуулт. */
export default function TaskScreen() {
  const { subject } = useLocalSearchParams<{ subject: Subject }>();
  const { setMe } = useAuth();
  const insets = useSafeAreaInsets();
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

  const q = task?.questions[index];
  const total = task?.questions.length ?? 5;
  const subjectName = subjectNames[subject] ?? '';

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
    setNote('');
  }

  async function check() {
    if (!task || !q || feedback || busy || selected === null) return;
    setBusy(true);
    setNote('');
    try {
      const r = await api<AnswerResponse>(`/tasks/${task.id}/answer`, { body: { questionId: q.id, choice: selected } });
      setFeedback(r);
      setAnswered((n) => n + 1);
      void Haptics.notificationAsync(r.correct ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error);
      if (r.result) {
        setPending(r.result);
        setMe(r.result.me);
      }
    } catch (e) {
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

  if (result) return <RewardView result={result} onAgain={load} />;

  // Баавгай: бодож буй (шилтэй) → зөв (баярласан) → буруу (ядарсан)
  const mood: 'think' | 'right' | 'wrong' = feedback ? (feedback.correct ? 'right' : 'wrong') : 'think';
  const bear: { sprite: SpriteKey; right: number; top: number; alt: string; bubble: string } =
    mood === 'right'
      ? { sprite: 'bear_cheer_scarf_180x252', right: 30, top: 120, alt: S.lesson.bearCorrect, bubble: S.lesson.correctBubble(XP_PER_CORRECT) }
      : mood === 'wrong'
        ? { sprite: 'bear_tired_scarf_164x280', right: 40, top: 92, alt: S.lesson.bearWrong, bubble: S.lesson.wrongBubble }
        : { sprite: 'outfit_glasses_164x280', right: 40, top: 92, alt: S.lesson.bearThinking, bubble: error ? error.message : S.lesson.thinking };

  const stateOf = (i: number): OptionState => {
    if (!feedback) return selected === i ? 'selected' : 'idle';
    if (i === feedback.correctIndex) return 'correct';
    if (i === selected) return 'wrong';
    return 'dim';
  };
  const grid = !!q && q.options.every((o) => o.length <= 14);
  const promptSize = !q ? 26 : q.prompt.length <= 18 ? 36 : q.prompt.length <= 60 ? 26 : 20;
  const shown = Math.min(answered + (feedback ? 0 : 1), total);

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 24 }} showsVerticalScrollIndicator={false}>
        <View style={[styles.panel, { paddingTop: insets.top, height: 402 + insets.top }]}>
          <View style={styles.panelTop}>
            <Pressable accessibilityRole="button" accessibilityLabel={S.lesson.close} onPress={() => router.back()} style={styles.close}>
              <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={colors.white} strokeWidth={2.6} strokeLinecap="round">
                <Path d="M6 6l12 12M18 6 6 18" />
              </Svg>
            </Pressable>
            <View style={styles.subjectPill}>
              <Text style={styles.subjectText}>{subjectName}</Text>
            </View>
          </View>

          <Pop trigger={mood} from={0.85} style={[styles.bubbleWrap, { top: 76 + insets.top }]}>
            <View style={styles.bubble}>
              <Text style={styles.bubbleText}>{bear.bubble}</Text>
            </View>
          </Pop>
          <View style={[styles.bear, { right: bear.right, top: bear.top + insets.top - 44 }]}>
            <Pop trigger={bear.sprite} from={0.7}>
              <Motion preset={mood === 'right' ? 'float' : 'bob'}>
                <Sprite id={bear.sprite} label={bear.alt} />
              </Motion>
            </Pop>
          </View>

          <View style={styles.progressRow}>
            <View style={styles.track}>
              <AnimatedBar value={total ? answered / total : 0} color={colors.lime} height={12} />
            </View>
            <Text style={styles.progressNum}>
              {answered}/{total}
            </Text>
          </View>
        </View>

        <View style={styles.body}>
          {error ? (
            <View style={{ gap: 12 }}>
              <Text style={styles.prompt}>{error.message}</Text>
              {!error.fatal && <Button title={S.common.retry} onPress={load} />}
              <Button title={S.task.home} variant="white" onPress={() => router.back()} />
            </View>
          ) : !task || !q ? (
            <View style={styles.loading}>
              <ActivityIndicator color={colors.violet} size="large" />
              <Text style={styles.hint}>{S.task.loading}</Text>
            </View>
          ) : (
            <Animated.View key={q.id} entering={FadeInDown.duration(320)} style={{ gap: 18 }}>
              <View style={{ gap: 6 }}>
                <Text style={styles.label}>
                  {subjectName} · {S.lesson.questionN(shown, total)}
                </Text>
                <Text accessibilityRole="header" style={[styles.prompt, { fontSize: promptSize, lineHeight: promptSize * 1.2 }]}>
                  {q.prompt}
                </Text>
              </View>

              <View style={grid ? styles.grid : { gap: 10 }}>
                {q.options.map((opt, i) => (
                  <OptionButton
                    key={i}
                    index={i}
                    label={opt}
                    grid={grid}
                    state={stateOf(i)}
                    disabled={!!feedback || busy}
                    onPress={() => setSelected(i)}
                  />
                ))}
              </View>

              {feedback ? (
                <Animated.View
                  entering={FadeInDown.duration(260)}
                  style={[styles.explain, { borderColor: feedback.correct ? colors.lime : colors.pink }]}
                >
                  <Text style={[styles.verdict, { color: feedback.correct ? colors.okText : colors.dangerText }]}>
                    {feedback.correct ? S.task.correct : S.task.wrong}
                  </Text>
                  <Text style={styles.explainText}>{feedback.explanation}</Text>
                </Animated.View>
              ) : null}

              {feedback ? (
                <Button
                  title={pending ? S.lesson.result : S.lesson.next}
                  variant={feedback.correct || pending ? 'lime' : 'primary'}
                  onPress={goNext}
                />
              ) : (
                <Button title={S.lesson.check} variant="primary" disabled={selected === null} loading={busy} onPress={check} />
              )}

              {note ? <Text style={styles.note}>{note}</Text> : null}
              <Pressable accessibilityRole="button" onPress={flag} hitSlop={8} style={styles.flag}>
                <Text style={styles.flagText}>{S.task.flag}</Text>
              </Pressable>
            </Animated.View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  panel: {
    backgroundColor: colors.stone,
    borderBottomLeftRadius: radius.sheet,
    borderBottomRightRadius: radius.sheet,
    overflow: 'hidden',
  },
  panelTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 6 },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  subjectPill: { height: 36, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: colors.white, justifyContent: 'center' },
  subjectText: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
  bubbleWrap: { position: 'absolute', left: 28, maxWidth: 150, zIndex: 2 },
  bubble: {
    paddingVertical: 11,
    paddingHorizontal: 14,
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomRightRadius: 4,
    borderBottomLeftRadius: 20,
  },
  bubbleText: { fontFamily: fonts.bold, fontSize: 15, lineHeight: 19, color: colors.ink },
  bear: { position: 'absolute' },
  progressRow: { position: 'absolute', left: 24, right: 24, bottom: 20, flexDirection: 'row', alignItems: 'center', gap: 10 },
  track: { flex: 1, height: 12, borderRadius: 6, backgroundColor: colors.white, overflow: 'hidden' },
  progressNum: { fontFamily: fonts.pixel, fontSize: 16, color: colors.white },
  body: { paddingHorizontal: 24, paddingTop: 24 },
  loading: { alignItems: 'center', gap: 12, paddingVertical: 40 },
  label: { fontFamily: fonts.bold, fontSize: 13, letterSpacing: 1, textTransform: 'uppercase', color: colors.muted },
  prompt: { fontFamily: fonts.semibold, fontSize: 26, letterSpacing: -0.6, color: colors.ink },
  hint: { fontFamily: fonts.medium, fontSize: 15, color: colors.muted },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 },
  explain: { backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 3, padding: 14, gap: 4 },
  verdict: { fontFamily: fonts.extrabold, fontSize: 17 },
  explainText: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 21, color: colors.ink },
  note: { fontFamily: fonts.semibold, fontSize: 14, color: colors.muted, textAlign: 'center' },
  flag: { alignSelf: 'center', padding: 10, minHeight: 44, justifyContent: 'center' },
  flagText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.muted, textDecorationLine: 'underline' },
});
