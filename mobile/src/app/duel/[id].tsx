import type { WsPlayer } from '@shared/types';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '@/auth/AuthContext';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { OptionButton, type OptionState } from '@/components/OptionButton';
import { Motion, Pop, Sprite } from '@/components/pixel';
import { Card, Muted, ProgressBar, Screen } from '@/components/ui';
import { colors, fonts, radius, subjectTheme } from '@/constants/theme';
import { type DuelView, useDuelSocket } from '@/hooks/useDuelSocket';
import { useNow } from '@/hooks/useNow';
import { S, subjectNames } from '@/i18n/strings';
import { goBack } from '@/lib/nav';
import type { SpriteKey } from '@/sprites';
import { confirm } from '@/lib/confirm';

const CONNECTION_NOTE: Partial<Record<DuelView['connection'], string>> = {
  reconnecting: S.duel.reconnecting,
  replaced: S.duel.replaced,
  failed: S.duel.connectFailed,
};

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
  const color = colors.violet;
  const ended = view.phase === 'finished' || view.phase === 'cancelled';
  const connectionNote = ended ? undefined : CONNECTION_NOTE[view.connection];

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
    if (ended || view.phase === null || (await confirm(S.duel.leaveConfirm, S.duel.leave))) goBack('/duel');
  }

  return (
    <Screen>
      <View style={styles.top}>
        <Pressable accessibilityRole="button" onPress={leave} hitSlop={12} style={styles.backBtn}>
          <Text style={styles.back}>‹ {S.duel.back}</Text>
        </Pressable>
        {view.subject ? (
          <View style={[styles.subjectTag, { backgroundColor: subjectTheme[view.subject].bg }]}>
            <Text style={[styles.subject, { color: subjectTheme[view.subject].fg }]}>{subjectNames[view.subject]}</Text>
          </View>
        ) : null}
        <View style={styles.stakeRow}>
          <Sprite id="icon_coin_24x24" />
          <Text style={styles.stake}>{view.stake}</Text>
        </View>
      </View>

      {connectionNote ? <Text style={styles.banner}>{connectionNote}</Text> : null}

      {mine && theirs ? (
        <View style={styles.versus}>
          <PlayerBadge player={mine} label={S.duel.you} highlight={view.reveal?.winnerId === mine.id} />
          <Text style={styles.vs}>VS</Text>
          <PlayerBadge player={theirs} label={theirs.name ?? theirs.username} highlight={view.reveal?.winnerId === theirs.id} />
        </View>
      ) : null}

      {view.phase === null && (
        <View style={styles.center}>
          <ActivityIndicator color={colors.violet} size="large" />
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
          <Pop trigger={Math.ceil(remainingMs / 1000)} from={0.5}>
            <Text style={[styles.countdown, { color }]}>{Math.max(1, Math.ceil(remainingMs / 1000))}</Text>
          </Pop>
        </Card>
      )}

      {(view.phase === 'question' || view.phase === 'reveal') && view.question && (
        <QuestionView
          view={view}
          myId={myId}
          opponentName={theirs?.name ?? theirs?.username ?? ''}
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
    <View style={[styles.player, highlight && { borderColor: colors.ink, backgroundColor: colors.lime }]}>
      <Avatar size={54} />
      <Text style={styles.playerName} numberOfLines={1}>
        {label}
      </Text>
      <Pop trigger={player.score} from={0.6}>
        <Text style={styles.score}>{player.score}</Text>
      </Pop>
      <View style={styles.presence}>
        <View style={[styles.presenceDot, { backgroundColor: player.connected ? colors.okText : colors.dangerText }]} />
        {player.connected ? null : <Text style={styles.dot}>{S.duel.offline}</Text>}
      </View>
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
          {view.phase === 'question' ? <Text style={[styles.timer, remainingMs < 5000 && { color: colors.dangerText }]}>{S.duel.seconds(Math.ceil(remainingMs / 1000))}</Text> : null}
        </View>
        {view.phase === 'question' ? (
          <ProgressBar value={remainingMs} max={view.questionTotalMs} color={remainingMs < 5000 ? '#E58FB4' : color} height={8} />
        ) : null}
        <Text style={styles.prompt}>{q.prompt}</Text>
      </Card>
      <View style={{ gap: 8 }}>
        {q.options.map((opt, i) => (
          <OptionButton key={i} index={i} label={opt} state={stateOf(i)} disabled={locked} onPress={() => onAnswer(i)} />
        ))}
      </View>
      {status ? (
        <Text
          style={[styles.status, iWon && { color: colors.okText }, iLost && { color: colors.dangerText }]}
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
  const resultBear: SpriteKey = cancelled
    ? 'bear_sleep_190x254'
    : o.winnerId === null
      ? 'bear_idle_scarf_164x280'
      : won
        ? 'bear_cheer_scarf_180x252'
        : 'bear_tired_scarf_164x280';

  return (
    <>
      <Card style={[styles.centerCard, { backgroundColor: won ? colors.lime : cancelled || o.winnerId === null ? colors.white : colors.lavender }]}>
        <Motion preset={won ? 'float' : 'bob'}>
          <Sprite id={resultBear} />
        </Motion>
        <Text style={styles.resultTitle}>{title}</Text>
        {!cancelled && (
          <Text style={styles.finalScore}>
            {o.scores[myId] ?? 0} : {Object.entries(o.scores).find(([k]) => Number(k) !== myId)?.[1] ?? 0}
          </Text>
        )}
        <Text style={[styles.delta, { color: delta > 0 ? colors.okText : delta < 0 ? colors.dangerText : colors.muted }]}>{S.duel.delta(delta)}</Text>
        {note ? <Muted center>{note}</Muted> : null}
        {points !== undefined ? (
          <View style={styles.stakeRow}>
            <Sprite id="icon_coin_24x24" />
            <Text style={styles.pointsNow}>{S.duel.pointsNow(points)}</Text>
          </View>
        ) : null}
      </Card>
      <Button title={S.duel.backToLobby} onPress={() => goBack('/duel')} />
    </>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  backBtn: { minHeight: 44, justifyContent: 'center' },
  back: { fontFamily: fonts.bold, fontSize: 16, color: colors.indigo },
  subjectTag: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill },
  subject: { fontFamily: fonts.bold, fontSize: 14 },
  stakeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stake: { fontFamily: fonts.pixel, fontSize: 18, color: colors.ink },
  banner: {
    backgroundColor: colors.lemon,
    color: colors.ink,
    textAlign: 'center',
    padding: 8,
    borderRadius: radius.sm,
    fontFamily: fonts.bold,
    overflow: 'hidden',
  },
  versus: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  vs: { fontFamily: fonts.pixel, fontSize: 22, color: colors.muted },
  player: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.card,
    borderWidth: 3,
    borderColor: colors.white,
    paddingVertical: 10,
    gap: 2,
  },
  playerName: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink, maxWidth: '90%' },
  score: { fontFamily: fonts.pixel, fontSize: 30, color: colors.violet },
  presence: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 14 },
  presenceDot: { width: 8, height: 8, borderRadius: 4 },
  dot: { fontFamily: fonts.bold, fontSize: 11, color: colors.dangerText },
  center: { paddingVertical: 32, alignItems: 'center' },
  centerCard: { alignItems: 'center', gap: 12, paddingVertical: 24 },
  big: { fontFamily: fonts.semibold, fontSize: 20, color: colors.ink, textAlign: 'center' },
  countdown: { fontFamily: fonts.pixel, fontSize: 80 },
  qHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  timer: { fontFamily: fonts.pixel, fontSize: 18, color: colors.ink },
  prompt: { fontFamily: fonts.semibold, fontSize: 21, lineHeight: 28, color: colors.ink },
  status: { fontFamily: fonts.bold, fontSize: 17, color: colors.ink, textAlign: 'center' },
  resultTitle: { fontFamily: fonts.semibold, fontSize: 30, letterSpacing: -0.8, color: colors.ink },
  finalScore: { fontFamily: fonts.pixel, fontSize: 24, color: colors.muted },
  delta: { fontFamily: fonts.pixel, fontSize: 28 },
  pointsNow: { fontFamily: fonts.bold, fontSize: 16, color: colors.ink },
});
