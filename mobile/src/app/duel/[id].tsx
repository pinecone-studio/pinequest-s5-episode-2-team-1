import type { DuelTeam } from '@shared/types';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '@/auth/AuthContext';
import { DuelQuestion } from '@/components/duel/DuelQuestion';
import { DuelResult } from '@/components/duel/DuelResult';
import { MatchIntro } from '@/components/duel/MatchIntro';
import { Scoreboard } from '@/components/duel/Scoreboard';
import { Sprite } from '@/components/pixel';
import { Screen } from '@/components/ui';
import { arena, colors, fonts, radius, subjectTheme } from '@/constants/theme';
import { type DuelView, useDuelSocket } from '@/hooks/useDuelSocket';
import { useNow } from '@/hooks/useNow';
import { S, subjectNames } from '@/i18n/strings';
import { confirm } from '@/lib/confirm';
import { goBack } from '@/lib/nav';

const CONNECTION_NOTE: Partial<Record<DuelView['connection'], string>> = {
  reconnecting: S.duel.reconnecting,
  replaced: S.duel.replaced,
  failed: S.duel.connectFailed,
};

export default function DuelRoomScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { me, refreshMe } = useAuth();
  const { view, answer, serverNow } = useDuelSocket(Number(id));
  useNow(view.phase === 'waiting' || view.phase === 'countdown' || view.phase === 'question');

  const myId = me?.id ?? 0;
  const myTeam: DuelTeam = view.players.find((p) => p.id === myId)?.team ?? 'a';
  const remainingMs = view.deadline ? Math.max(0, view.deadline - serverNow()) : 0;
  const ended = view.phase === 'finished' || view.phase === 'cancelled';
  const connectionNote = ended ? undefined : CONNECTION_NOTE[view.connection];

  // Үр дүн ирмэгц бүх утсан дээр боргоцойн үлдэгдлийг шинэчилнэ; haptic.
  const notified = useRef(false);
  useEffect(() => {
    if (view.outcome && !notified.current) {
      notified.current = true;
      void refreshMe();
      const won = view.outcome.winnerTeam ? view.outcome.winnerTeam === myTeam : view.outcome.winnerId === myId;
      void Haptics.notificationAsync(won ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning);
    }
  }, [view.outcome, myId, myTeam, refreshMe]);

  const lastReveal = useRef<number | null>(null);
  useEffect(() => {
    if (view.reveal && lastReveal.current !== view.reveal.q) {
      lastReveal.current = view.reveal.q;
      const good = !!view.reveal.correct?.includes(myId);
      void Haptics.impactAsync(good ? Haptics.ImpactFeedbackStyle.Heavy : Haptics.ImpactFeedbackStyle.Light);
    }
  }, [view.reveal, myId]);

  async function leave() {
    if (ended || view.phase === null || (await confirm(S.duel.leaveConfirm, S.duel.leave))) goBack('/duel');
  }

  // Холбогдох, 3-2-1: бүтэн дэлгэцийн VS.
  if (view.phase === null || view.phase === 'waiting' || view.phase === 'countdown') {
    return (
      <Screen scroll={false} background={arena.bg} edges={['top', 'left', 'right', 'bottom']} contentStyle={styles.intro}>
        <MatchIntro
          players={view.players}
          myId={myId}
          teamSize={view.teamSize}
          subject={view.subject}
          stake={view.stake}
          phase={view.phase}
          remainingMs={remainingMs}
          note={connectionNote}
          onLeave={leave}
        />
      </Screen>
    );
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
          <Sprite id="btn_honey_24x24" />
          <Text style={styles.stake}>{view.stake}</Text>
        </View>
      </View>
      {connectionNote ? <Text style={styles.banner}>{connectionNote}</Text> : null}
      {view.players.length ? <Scoreboard view={view} myId={myId} myTeam={myTeam} /> : null}
      {(view.phase === 'question' || view.phase === 'reveal') && view.question && (
        <DuelQuestion
          view={view}
          myTeam={myTeam}
          remainingMs={remainingMs}
          onAnswer={(choice) => {
            if (!view.question) return;
            void Haptics.selectionAsync();
            answer(view.question.q, choice);
          }}
        />
      )}
      {ended && view.outcome && <DuelResult view={view} myId={myId} myTeam={myTeam} />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { paddingHorizontal: 0, paddingTop: 0, paddingBottom: 0 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  backBtn: { minHeight: 44, justifyContent: 'center' },
  back: { fontFamily: fonts.bold, fontSize: 16, color: colors.indigo },
  subjectTag: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill },
  subject: { fontFamily: fonts.bold, fontSize: 14 },
  stakeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stake: { fontFamily: fonts.pixelNum, fontSize: 15, color: colors.ink },
  banner: { backgroundColor: colors.lemon, color: colors.ink, textAlign: 'center', padding: 8, borderRadius: radius.sm, fontFamily: fonts.bold, overflow: 'hidden' },
});
