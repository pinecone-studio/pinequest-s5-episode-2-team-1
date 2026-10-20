import type { WsPlayer } from '@shared/types';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '@/auth/AuthContext';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { OptionButton, type OptionState } from '@/components/OptionButton';
import { Card, Muted, ProgressBar, Screen } from '@/components/ui';
import { colors, radius, spacing, subjectColors } from '@/constants/theme';
import { useDuelSocket } from '@/hooks/useDuelSocket';
import { useNow } from '@/hooks/useNow';
import { S, subjectIcons, subjectNames } from '@/i18n/strings';
import { confirm } from '@/lib/confirm';

export default function DuelRoomScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const duelId = Number(id);
  const { me, refreshMe } = useAuth();
  const { view, answer, serverNow } = useDuelSocket(duelId);
  const ticking = view.phase === 'waiting' || view.phase === 'countdown' || view.phase === 'question';
  useNow(ticking);

  const myId = me?.id ?? 0;
  const mine = view.players.find((p) => p.id === myId);
  const theirs = view.players.find((p) => p.id !== myId);
  const remainingMs = view.deadline ? Math.max(0, view.deadline - serverNow()) : 0;
  const color = view.subject ? subjectColors[view.subject] : colors.primary;
  const ended = view.phase === 'finished' || view.phase === 'cancelled';

  // Үр дүн ирмэгц хоёр утсан дээр оноог шинэчилнэ; haptic.
  const notified = useRef(false);
  useEffect(() => {
    if (view.outcome && !notified.current) {
      notified.current = true;
      void refreshMe();
      const won = view.outcome.winnerId === myId;
      void Haptics.notificationAsync(won ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning);
    }
  }, [view.outcome, myId, refreshMe]);

  const lastReveal = useRef<number | null>(null);
  useEffect(() => {
    if (view.reveal && lastReveal.current !== view.reveal.q) {
      lastReveal.current = view.reveal.q;
      void Haptics.impactAsync(view.reveal.winnerId === myId ? Haptics.ImpactFeedbackStyle.Heavy : Haptics.ImpactFeedbackStyle.Light);
    }
  }, [view.reveal, myId]);

  async function leave() {
    if (ended || view.phase === null || (await confirm(S.duel.leaveConfirm, S.duel.leave))) router.back();
  }

  return (
    <Screen>
      <View style={styles.top}>
        <Pressable onPress={leave} hitSlop={12}>
          <Text style={styles.back}>‹ {S.duel.back}</Text>
        </Pressable>
        {view.subject ? (
          <Text style={[styles.subject, { color }]}>
            {subjectIcons[view.subject]} {subjectNames[view.subject]}
          </Text>
        ) : null}
        <Text style={styles.stake}>🪙 {view.stake}</Text>
      </View>

      {view.connection === 'reconnecting' && !ended ? <Text style={styles.banner}>{S.duel.reconnecting}</Text> : null}

      {mine && theirs ? (
        <View style={styles.versus}>
          <PlayerBadge player={mine} label={S.duel.you} highlight={view.reveal?.winnerId === mine.id} />
          <Text style={styles.vs}>VS</Text>
          <PlayerBadge player={theirs} label={theirs.username} highlight={view.reveal?.winnerId === theirs.id} />
        </View>
      ) : null}

      {view.phase === null && (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      )}

      {view.phase === 'waiting' && (
        <Card style={styles.centerCard}>
          <ActivityIndicator color={color} size="large" />
          <Text style={styles.big}>{S.duel.waiting}</Text>
          <Muted center>{S.duel.waitingHint(Math.ceil(remainingMs / 1000))}</Muted>
        </Card>
      )}

      {view.phase === 'countdown' && (
        <Card style={styles.centerCard}>
          <Text style={styles.big}>{S.duel.getReady}</Text>
          <Text style={[styles.countdown, { color }]}>{Math.max(1, Math.ceil(remainingMs / 1000))}</Text>
        </Card>
      )}

      {(view.phase === 'question' || view.phase === 'reveal') && view.question && (
        <QuestionView
          view={view}
          myId={myId}
          opponentName={theirs?.username ?? ''}
          color={color}
          remainingMs={remainingMs}
          onAnswer={(choice) => {
            if (!view.question) return;
            void Haptics.selectionAsync();
            answer(view.question.q, choice);
          }}
        />
      )}

      {ended && view.outcome && <ResultView view={view} myId={myId} />}
    </Screen>
  );
}

function PlayerBadge({ player, label, highlight }: { player: WsPlayer; label: string; highlight: boolean }) {
  return (
    <View style={[styles.player, highlight && { borderColor: colors.success, backgroundColor: colors.successSoft }]}>
      <Avatar look={player.avatar} size={54} />
      <Text style={styles.playerName} numberOfLines={1}>
        {label}
      </Text>
      <Text style={styles.score}>{player.score}</Text>
      <Text style={[styles.dot, { color: player.connected ? colors.success : colors.danger }]}>
        ● {player.connected ? '' : S.duel.offline}
      </Text>
    </View>
  );
}

function QuestionView({
  view,
  myId,
  opponentName,
  color,
  remainingMs,
  onAnswer,
}: {
  view: ReturnType<typeof useDuelSocket>['view'];
  myId: number;
  opponentName: string;
  color: string;
  remainingMs: number;
  onAnswer: (choice: number) => void;
}) {
  const q = view.question!;
  const reveal = view.phase === 'reveal' ? view.reveal : null;
  const my = view.myAnswer;
  const locked = !!my || view.phase !== 'question';

  const stateOf = (i: number): OptionState => {
    if (reveal) {
      if (i === reveal.correctIndex) return 'correct';
      if (my && i === my.choice) return 'wrong';
      return 'dim';
    }
    if (my && i === my.choice) return my.correct ? 'correct' : 'wrong';
    return my ? 'dim' : 'idle';
  };

  const iWon = !!reveal && reveal.winnerId === myId;
  const iLost = (!!my && !my.correct && !reveal) || (!!reveal && reveal.winnerId !== null && reveal.winnerId !== myId);
  let status: string | null = null;
  if (reveal) status = reveal.winnerId === myId ? S.duel.youGot : reveal.winnerId ? S.duel.theyGot(opponentName) : S.duel.nobody;
  else if (my && !my.correct) status = S.duel.youWrong;
  else if (view.opponentWrong) status = S.duel.opponentWrong;

  return (
    <>
      <Card>
        <View style={styles.qHeader}>
          <Muted>{S.duel.questionOf(q.q + 1, q.total)}</Muted>
          {view.phase === 'question' ? <Text style={[styles.timer, remainingMs < 5000 && { color: colors.danger }]}>{S.duel.seconds(Math.ceil(remainingMs / 1000))}</Text> : null}
        </View>
        {view.phase === 'question' ? (
          <ProgressBar value={remainingMs} max={view.questionTotalMs} color={remainingMs < 5000 ? colors.danger : color} height={8} />
        ) : null}
        <Text style={styles.prompt}>{q.prompt}</Text>
      </Card>
      <View style={{ gap: spacing.sm }}>
        {q.options.map((opt, i) => (
          <OptionButton key={i} index={i} label={opt} state={stateOf(i)} disabled={locked} onPress={() => onAnswer(i)} />
        ))}
      </View>
      {status ? (
        <Text
          style={[styles.status, iWon && { color: colors.success }, iLost && { color: colors.danger }]}
        >
          {status}
        </Text>
      ) : null}
      {reveal ? <Muted center>{reveal.explanation}</Muted> : null}
    </>
  );
}

function ResultView({ view, myId }: { view: ReturnType<typeof useDuelSocket>['view']; myId: number }) {
  const o = view.outcome!;
  const cancelled = view.phase === 'cancelled';
  const won = o.winnerId === myId;
  const delta = o.deltas[myId] ?? 0;
  const title = cancelled ? S.duel.cancelledTitle : o.winnerId === null ? S.duel.draw : won ? S.duel.win : S.duel.lose;
  const note = cancelled
    ? S.duel.cancelledHint
    : o.reason === 'forfeit'
      ? won
        ? S.duel.forfeitWin
        : S.duel.forfeitLose
      : o.winnerId === null
        ? S.duel.refunded
        : null;
  const points = o.points[myId];

  return (
    <>
      <Card style={[styles.centerCard, { borderWidth: 3, borderColor: won ? colors.success : cancelled || o.winnerId === null ? colors.border : colors.danger }]}>
        <Text style={styles.resultEmoji}>{cancelled ? '⏳' : o.winnerId === null ? '🤝' : won ? '🏆' : '💪'}</Text>
        <Text style={styles.resultTitle}>{title}</Text>
        {!cancelled && (
          <Text style={styles.finalScore}>
            {o.scores[myId] ?? 0} : {Object.entries(o.scores).find(([k]) => Number(k) !== myId)?.[1] ?? 0}
          </Text>
        )}
        <Text style={[styles.delta, { color: delta > 0 ? colors.success : delta < 0 ? colors.danger : colors.muted }]}>{S.duel.delta(delta)}</Text>
        {note ? <Muted center>{note}</Muted> : null}
        {points !== undefined ? <Text style={styles.pointsNow}>🪙 {S.duel.pointsNow(points)}</Text> : null}
      </Card>
      <Button title={S.duel.backToLobby} onPress={() => router.back()} />
    </>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  back: { fontSize: 17, fontWeight: '700', color: colors.primaryDark },
  subject: { fontSize: 17, fontWeight: '800' },
  stake: { fontSize: 17, fontWeight: '900', color: colors.gold },
  banner: {
    backgroundColor: colors.accent,
    color: colors.text,
    textAlign: 'center',
    padding: spacing.sm,
    borderRadius: radius.sm,
    fontWeight: '700',
    overflow: 'hidden',
  },
  versus: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  vs: { fontSize: 20, fontWeight: '900', color: colors.muted },
  player: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
    gap: 2,
  },
  playerName: { fontSize: 14, fontWeight: '800', color: colors.text, maxWidth: '90%' },
  score: { fontSize: 28, fontWeight: '900', color: colors.primary },
  dot: { fontSize: 11, fontWeight: '700' },
  center: { paddingVertical: spacing.xxl, alignItems: 'center' },
  centerCard: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xl },
  big: { fontSize: 20, fontWeight: '800', color: colors.text, textAlign: 'center' },
  countdown: { fontSize: 72, fontWeight: '900' },
  qHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  timer: { fontSize: 16, fontWeight: '900', color: colors.text },
  prompt: { fontSize: 20, fontWeight: '700', color: colors.text, lineHeight: 28 },
  status: { fontSize: 17, fontWeight: '800', color: colors.text, textAlign: 'center' },
  resultEmoji: { fontSize: 64 },
  resultTitle: { fontSize: 28, fontWeight: '900', color: colors.text },
  finalScore: { fontSize: 22, fontWeight: '800', color: colors.muted },
  delta: { fontSize: 26, fontWeight: '900' },
  pointsNow: { fontSize: 17, fontWeight: '800', color: colors.gold },
});
