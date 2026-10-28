import type { AnswerResponse, FlagResponse, Subject, TaskDto, TaskResult } from '@shared/types';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { type ComponentRef, useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { FadeInDown, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { ApiError, api, errorText, isOfflineError } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { AmberButton } from '@/components/AmberButton';
import { BattleNotice } from '@/components/BattleNotice';
import { BossArena, type Strike } from '@/components/BossArena';
import { Button } from '@/components/Button';
import { LessonBackdrop, LessonBear, type LessonMood } from '@/components/LessonBear';
import { OptionButton, type OptionState } from '@/components/OptionButton';
import { AnimatedBar, Pop } from '@/components/pixel';
import { PracticeResultView, RewardView } from '@/components/RewardView';
import { colors, fonts, radius } from '@/constants/theme';
import { S, subjectNames } from '@/i18n/strings';
import { confirm } from '@/lib/confirm';
import { goBack } from '@/lib/nav';
import { type Practice, startPractice } from '@/lib/offline/practice';
import { isOnline, useOnline } from '@/lib/online';
import { BOSSES } from '@/lib/pixelBear/path';
import { skillOf } from '@/lib/pixelBear/skills';

/** хичээлийн дэвсгэрийн хананы дээд өнгө (scripts/lesson-sprites.ts): өндөр дэлгэцэнд дэвсгэрээс дээш хэсгийг дүүргэнэ */
const LESSON_WALL = '#3b2a8f';

/**
 * 05 · Хичээл (асуулт) ба 06 · Шагнал. Логик: сонгох → ШАЛГАХ → серверт хариулт → тайлбар → дараагийн асуулт.
 * `?boss=<бүлэг>` бол дээд самбар нь boss тулаан болно (асуултууд нь ижил даалгавар).
 * Сервер хүрэхгүй бол офлайн дасгал: апп доторх асуултаар, хариуг утсан дээр шалгана, XP/боргоцой цуглуулахгүй.
 */
export default function TaskScreen() {
  const { subject, boss, node, stage, review } = useLocalSearchParams<{
    subject: Subject;
    boss?: string;
    node?: string;
    stage?: string;
    /** өнөөдрийн хичээл: өмнө хийсэн хичээлээс 3 бодлого */
    review?: string;
  }>();
  const foe = boss === undefined ? undefined : BOSSES[Number(boss)];
  const { me, setMe } = useAuth();
  const online = useOnline();
  const insets = useSafeAreaInsets();
  const { height: windowH } = useWindowDimensions();
  /** Асуулт, хариулт, тайлбар, товчны хэсгийн өндөр (onLayout) */
  const [bodyH, setBodyH] = useState(0);
  const tier = me?.tier;
  const grade = me?.grade;
  const size = me?.questionsPerTask ?? 5;
  const [task, setTask] = useState<TaskDto | null>(null);
  const [practice, setPractice] = useState<Practice | null>(null);
  /** офлайн дасгал дууссан: зөв хариултын тоо (null = дуусаагүй); showScore = дүнгийн дэлгэц */
  const [practiceScore, setPracticeScore] = useState<number | null>(null);
  const [showScore, setShowScore] = useState(false);
  const [index, setIndex] = useState(0);
  const [answered, setAnswered] = useState(0);
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const [strike, setStrike] = useState<Strike | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<AnswerResponse | null>(null);
  const [pending, setPending] = useState<TaskResult | null>(null);
  const [result, setResult] = useState<TaskResult | null>(null);
  const [recovery, setRecovery] = useState(false); // даалгавар дуусаад нөхөх салаа зам нээгдсэн
  const [error, setError] = useState<{ message: string; fatal: boolean; code?: string } | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  /** Хувын болороор нуусан хариултууд (асуултын id-тай) */
  const [hidden, setHidden] = useState<{ q: number; hide: number[] } | null>(null);

  const load = useCallback(async () => {
    setTask(null);
    setResult(null);
    setRecovery(false);
    setPending(null);
    setPractice(null);
    setPracticeScore(null);
    setShowScore(false);
    setFeedback(null);
    setSelected(null);
    setError(null);
    setNote('');
    const begin = (t: TaskDto) => {
      setTask(t);
      setAnswered(t.answeredCount);
      setHits(t.correctCount);
      setMisses(t.answeredCount - t.correctCount);
      setStrike(null);
      setIndex(Math.max(0, t.questions.findIndex((q) => !q.answered)));
    };
    const offline = () => {
      if (foe) return setError({ message: S.offline.bossLocked, fatal: true });
      const p = tier === undefined || grade === undefined ? null : startPractice(tier, grade, subject, size);
      if (!p) return setError({ message: S.offline.noQuestions, fatal: true });
      setPractice(p);
      begin(p.task);
    };
    if (!isOnline()) return offline();
    try {
      const at = { ...(node ? { node: Number(node) } : {}), ...(stage ? { stage: Number(stage) } : {}) };
      begin(
        review
          ? await api<TaskDto>('/tasks/review', { body: { subject } })
          : await api<TaskDto>('/tasks', { body: foe ? { subject, gate: Number(boss) } : { subject, ...at } }),
      );
    } catch (e) {
      // Олон алдсан өмнөх даалгаврын салаа зам дуусаагүй бол түүн рүү.
      if (e instanceof ApiError && e.code === 'RECOVERY_REQUIRED') {
        router.replace(`/recovery/${subject}`);
        return;
      }
      if (isOfflineError(e)) return offline();
      const fatal = e instanceof ApiError && (e.code === 'NO_QUESTIONS' || e.code === 'BOSS_LOCKED' || e.code === 'NO_LIVES' || e.code === 'NO_REVIEW' || e.code === 'REVIEW_DONE');
      setError({ message: errorText(e), fatal, code: e instanceof ApiError ? e.code : undefined });
    }
  }, [subject, foe, boss, node, stage, review, tier, grade, size]);

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
    if (practiceScore !== null) {
      setShowScore(true);
      return;
    }
    if (!task) return;
    const nextIndex = task.questions.findIndex((x, i) => i > index && !x.answered);
    setIndex(nextIndex === -1 ? index : nextIndex);
    setSelected(null);
    setFeedback(null);
    setNote('');
  }

  function reveal(r: AnswerResponse) {
    setFeedback(r);
    setAnswered((n) => n + 1);
    if (r.correct) setHits((n) => n + 1);
    else setMisses((n) => n + 1);
    // дараалсан зөвийн тоо: баавгайн хүчтэй skill (lib/pixelBear/skills.ts)
    setStrike((s) => ({ n: answered + 1, correct: r.correct, combo: r.correct ? (s?.correct ? (s.combo ?? 1) : 0) + 1 : 0 }));
    void Haptics.notificationAsync(r.correct ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error);
  }

  async function check() {
    if (!task || !q || feedback || busy || selected === null) return;
    setNote('');
    if (practice) {
      const r = practice.answer(q.id, selected);
      reveal(r);
      if (r.finished) setPracticeScore(r.correctCount);
      return;
    }
    setBusy(true);
    try {
      const r = await api<AnswerResponse>(`/tasks/${task.id}/answer`, { body: { questionId: q.id, choice: selected } });
      reveal(r);
      if (r.result) {
        setPending(r.result);
        setRecovery(!!r.recovery);
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
        setRecovery(!!r.recovery);
        setResult(r.result);
        return;
      }
      goNext();
    } catch (e) {
      setNote(errorText(e));
    }
  }

  // Хариугаа шалгахад тайлбар, «Үргэлжлүүлэх» товч нэмэгдэж дэлгэцээс хэтэрдэг тул баавгайн самбарыг багасгаж
  // бүгдийг нэг дэлгэцэнд багтаана (scroll хийх шаардлагагүй). Баавгай, шал доод талдаа бэхлэгдсэн тул дээд хэсэг нь л
  // тайрагдана. Boss-ын талбар тогтмол өндөртэй зурагддаг тул хэвээр. Hook тул доорх эрт return-ээс өмнө байна.
  const panelFull = PANEL_H + insets.top;
  const panelH =
    foe || !bodyH ? panelFull : Math.max(PANEL_MIN + insets.top, Math.min(panelFull, windowH - bodyH - insets.bottom - 24));
  const panelStyle = useAnimatedStyle(() => ({ height: withTiming(panelH, { duration: 260 }) }), [panelH]);
  // Самбар доод хэмжээндээ хүрсэн ч урт асуулт, тайлбар багтахгүй бол «Үргэлжлүүлэх» харагдтал доош гүйлгэнэ;
  // дараагийн асуулт дээрээсээ эхэлнэ.
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  useEffect(() => {
    scroll.current?.scrollTo({ y: 0, animated: false });
  }, [index]);

  if (showScore && practiceScore !== null) return <PracticeResultView correct={practiceScore} total={total} onAgain={load} />;
  // Шагналаа (XP, шат, streak) эхлээд харуулна; салаа зам нээгдсэн бол тэндээс шууд руу нь орно
  if (result) return <RewardView result={result} onAgain={load} onRecovery={recovery ? () => router.replace(`/recovery/${subject}`) : undefined} />;

  // Баавгай: бодож буй (эрүүгээ барина) → зөв (үсэрч баярлана) → буруу (цочиж, гунигтай)
  const mood: LessonMood = feedback ? (feedback.correct ? 'right' : 'wrong') : 'think';
  const bear: { alt: string; bubble: string } =
    mood === 'right'
      ? { alt: S.lesson.bearCorrect, bubble: practice ? S.offline.correctBubble : S.lesson.correctBubble(me?.xpPerCorrect ?? 0) }
      : mood === 'wrong'
        ? { alt: S.lesson.bearWrong, bubble: S.lesson.wrongBubble }
        : { alt: S.lesson.bearThinking, bubble: error ? error.message : S.lesson.thinking };

  const hide = hidden && q && hidden.q === q.id ? hidden.hide : [];
  const stateOf = (i: number): OptionState => {
    if (!feedback) return hide.includes(i) ? 'dim' : selected === i ? 'selected' : 'idle';
    if (i === feedback.correctIndex) return 'correct';
    if (i === selected) return 'wrong';
    return 'dim';
  };
  const grid = !!q && q.options.every((o) => o.length <= 14);
  const promptSize = !q ? 26 : q.prompt.length <= 18 ? 36 : q.prompt.length <= 60 ? 26 : 20;
  const shown = Math.min(answered + (feedback ? 0 : 1), total);

  // давсан хаалга руу дахин орох гэсэн (сервер BOSS_LOCKED): ялсан гэж харуулна
  const beaten = !!foe && error?.code === 'BOSS_LOCKED' && (me?.paths[subject]?.bossesBeaten ?? 0) > Number(boss);
  // Boss тулаан: олонх зөв бол ялна (5 асуултад 3 зөв = boss-ын 3 амь, 3 буруу = баавгайн 3 зүрх)
  const needed = Math.floor(total / 2) + 1;
  const hearts = total - needed + 1;
  const bossMessage =
    !foe || error
      ? ''
      : hits >= needed
        ? S.boss.won(foe.name)
        : misses >= hearts
          ? S.boss.lost(foe.name)
          : feedback
            ? feedback.correct
              ? S.boss.skill[skillOf(strike?.n ?? 1, strike?.combo ?? 0)]
              : S.boss.ouch
            : answered === 0
              ? S.boss.intro(foe.name)
              : S.boss.next;

  return (
    <View style={styles.root}>
      <ScrollView
        ref={scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => feedback && scroll.current?.scrollToEnd({ animated: true })}
      >
        <Animated.View style={[styles.panel, { paddingTop: insets.top }, panelStyle, { backgroundColor: foe ? colors.indigo : LESSON_WALL }]}>
          {foe ? (
            <BossArena
              boss={foe}
              hits={beaten ? needed : hits}
              misses={misses}
              needed={needed}
              hearts={hearts}
              strike={strike}
              message={bossMessage}
              insetTop={insets.top}
            />
          ) : (
            <>
              <LessonBackdrop />
              <LessonBear mood={mood} label={bear.alt} />
            </>
          )}
          <View style={styles.panelTop}>
            <Pressable accessibilityRole="button" accessibilityLabel={S.lesson.close} onPress={() => goBack()} style={styles.close}>
              <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={colors.white} strokeWidth={2.6} strokeLinecap="round">
                <Path d="M6 6l12 12M18 6 6 18" />
              </Svg>
            </Pressable>
            <View style={styles.subjectPill}>
              <Text style={styles.subjectText}>{practice ? S.offline.pill(subjectName) : review ? S.review.pill : subjectName}</Text>
            </View>
          </View>

          {foe ? null : (
            <>
              <Pop trigger={mood} from={0.85} style={[styles.bubbleWrap, { top: 76 + insets.top }]}>
                <View style={styles.bubble}>
                  <Text style={styles.bubbleText}>{bear.bubble}</Text>
                </View>
              </Pop>
            </>
          )}

          <View style={styles.progressRow}>
            <View style={styles.track}>
              <AnimatedBar value={total ? answered / total : 0} color={colors.lime} height={12} />
            </View>
            <Text style={styles.progressNum}>
              {answered}/{total}
            </Text>
          </View>
        </Animated.View>

        <View style={styles.body} onLayout={(e) => setBodyH(e.nativeEvent.layout.height)}>
          {error ? (
            <BattleNotice
              tone={beaten ? 'won' : 'locked'}
              title={beaten ? S.boss.beatenTitle : error.code === 'BOSS_LOCKED' ? S.boss.lockedTitle : S.boss.errorTitle}
              body={beaten ? S.boss.beatenBody : error.code === 'BOSS_LOCKED' ? S.boss.lockedBody : error.message}
              primary={error.fatal ? { title: foe ? S.boss.toMap : S.task.home, onPress: () => goBack('/path') } : { title: S.common.retry, onPress: load }}
              secondary={error.fatal ? undefined : { title: S.task.home, onPress: () => goBack() }}
            />
          ) : !task || !q ? (
            <View style={styles.loading}>
              <ActivityIndicator color={colors.violet} size="large" />
              <Text style={styles.hint}>{S.task.loading}</Text>
            </View>
          ) : (
            <Animated.View key={q.id} entering={FadeInDown.duration(320)} style={{ gap: 18 }}>
              <View style={{ gap: 6 }}>
                <Text style={styles.label}>
                  {task?.title ?? subjectName} · {S.lesson.questionN(shown, total)}
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
                    disabled={!!feedback || busy || hide.includes(i)}
                    onPress={() => setSelected(i)}
                  />
                ))}
              </View>

              {!feedback && !practice && !hide.length ? (
                <AmberButton
                  taskId={task.id}
                  questionId={q.id}
                  onHide={(h) => {
                    setHidden({ q: q.id, hide: h });
                    if (selected !== null && h.includes(selected)) setSelected(null);
                    setNote(S.items.amberHint);
                  }}
                  onError={setNote}
                />
              ) : null}

              {feedback ? (
                <Animated.View
                  entering={FadeInDown.duration(260)}
                  style={[styles.explain, { borderColor: feedback.correct ? colors.lime : colors.pink }]}
                >
                  <Text style={[styles.verdict, { color: feedback.correct ? colors.okText : colors.dangerText }]}>
                    {feedback.correct ? S.task.correct : S.task.wrong}
                  </Text>
                  {feedback.explanation ? <Text style={styles.explainText}>{feedback.explanation}</Text> : null}
                </Animated.View>
              ) : null}

              {feedback && !feedback.correct && online && !practice ? (
                <Button title={S.tutor.ask} variant="white" small onPress={() => router.push(`/tutor?questionId=${q.id}`)} />
              ) : null}

              {feedback ? (
                <Button
                  title={pending || practiceScore !== null ? S.lesson.result : S.lesson.next}
                  variant={feedback.correct || pending || practiceScore !== null ? 'lime' : 'primary'}
                  onPress={goNext}
                />
              ) : (
                <Button title={S.lesson.check} variant="primary" disabled={selected === null} loading={busy} onPress={check} />
              )}

              {note ? <Text style={styles.note}>{note}</Text> : null}
              {/* Даалгаврын дунд сүлжээ тасарвал серверийн даалгавар хадгалагдана; одоохондоо офлайн дасгал хийж болно */}
              {!online && !practice && !foe ? <Button title={S.offline.toPractice} variant="white" small onPress={load} /> : null}
              {practice ? null : (
                <Pressable accessibilityRole="button" onPress={flag} hitSlop={8} style={styles.flag}>
                  <Text style={styles.flagText}>{S.task.flag}</Text>
                </Pressable>
              )}
            </Animated.View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

/** Баавгайн самбарын бүтэн өндөр ба хариу шалгасны дараа багасах доод хязгаар (баавгай, ✕, хөөс багтана). */
const PANEL_H = 402;
const PANEL_MIN = 250;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  panel: {
    backgroundColor: colors.stone,
    borderBottomLeftRadius: radius.sheet,
    borderBottomRightRadius: radius.sheet,
    overflow: 'hidden',
  },
  panelTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 6 },
  // хөшиг, гэр зэрэг ямар ч дэвсгэр дээр цагаан ✕ тод харагдана
  close: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(25,21,46,0.45)', alignItems: 'center', justifyContent: 'center' },
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
  progressRow: { position: 'absolute', left: 24, right: 24, bottom: 20, flexDirection: 'row', alignItems: 'center', gap: 10 },
  track: { flex: 1, height: 12, borderRadius: 6, backgroundColor: colors.white, overflow: 'hidden' },
  progressNum: { fontFamily: fonts.pixelNum, fontSize: 14, color: colors.white },
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
