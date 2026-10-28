import type { DuelPhase, DuelTeam, Subject, WsPlayer } from '@shared/types';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { Pop, Sprite } from '@/components/pixel';
import { arena, colors, fonts, hardShadow, radius, subjectTheme } from '@/constants/theme';
import { S, subjectNames } from '@/i18n/strings';
import { ArenaStripes } from './ArenaStripes';
import { MatchTeam } from './MatchTeam';
import { Spinner } from './Spinner';

/**
 * Тулаан эхлэхийн өмнөх VS дэлгэц (утасны босоо чиглэл): өрсөлдөгч баг дээр, өөрийн баг доор, дунд нь
 * ташуу туузан дээр VS. Countdown үед VS-ийн оронд 3-2-1.
 */
export function MatchIntro({
  players,
  myId,
  teamSize,
  subject,
  stake,
  phase,
  remainingMs,
  note,
  onLeave,
}: {
  players: WsPlayer[];
  myId: number;
  teamSize: number;
  subject: Subject | null;
  stake: number;
  phase: DuelPhase | null;
  remainingMs: number;
  note?: string;
  onLeave: () => void;
}) {
  const { width } = useWindowDimensions();
  const myTeam: DuelTeam = players.find((p) => p.id === myId)?.team ?? 'a';
  const theirTeam: DuelTeam = myTeam === 'a' ? 'b' : 'a';
  const mine = players.filter((p) => p.team === myTeam).sort((x, y) => Number(y.id === myId) - Number(x.id === myId));
  const theirs = players.filter((p) => p.team === theirTeam);
  const n = Math.max(teamSize, mine.length, theirs.length, 1);
  // Нэг мөрөнд n карт: 16px gutter-тай, хэт өргөн биш.
  const cardW = Math.min(118, (Math.min(width, 520) - 32 - (n - 1) * 8) / n);
  const online = players.filter((p) => p.connected).length;
  const countdown = phase === 'countdown';
  const seconds = Math.max(1, Math.ceil(remainingMs / 1000));

  return (
    <View style={styles.root}>
      <ArenaStripes />
      <View style={styles.top}>
        <Pressable accessibilityRole="button" onPress={onLeave} hitSlop={12} style={styles.backBtn}>
          <Text style={styles.back}>‹ {S.duel.back}</Text>
        </Pressable>
        <View style={styles.topChips}>
          {subject ? (
            <View style={[styles.chip, { backgroundColor: subjectTheme[subject].bg }]}>
              <Text style={[styles.chipText, { color: subjectTheme[subject].fg }]}>{subjectNames[subject]}</Text>
            </View>
          ) : null}
          <View style={[styles.chip, { backgroundColor: colors.white }]}>
            <Sprite id="btn_honey_12x12" />
            <Text style={styles.stakeText}>{stake}</Text>
          </View>
        </View>
      </View>
      <Text accessibilityRole="header" style={styles.title}>
        {S.duel.matchFound}
      </Text>
      {note ? <Text style={styles.banner}>{note}</Text> : null}

      <View style={styles.stage}>
        <MatchTeam players={theirs} team={theirTeam} size={n} cardW={cardW} myId={myId} from="right" />
        <Animated.View entering={ZoomIn.delay(260).springify().damping(12)} style={styles.vsWrap}>
          <View style={styles.vsDiamond}>
            {countdown ? (
              <Pop trigger={seconds} from={0.4}>
                <Text style={styles.count}>{seconds}</Text>
              </Pop>
            ) : (
              <Text style={styles.vs}>VS</Text>
            )}
          </View>
          <Text style={styles.mode}>{`${n} VS ${n}`}</Text>
        </Animated.View>
        <MatchTeam players={mine} team={myTeam} size={n} cardW={cardW} myId={myId} from="left" />
      </View>

      <View style={styles.footer}>
        {countdown ? (
          <Text style={styles.ready}>{S.duel.getReady}</Text>
        ) : (
          <>
            <View style={styles.loadingRow}>
              <Spinner />
              <Text style={styles.loading}>{S.duel.loading}…</Text>
            </View>
            <Text style={styles.footHint}>
              {players.length ? S.duel.waitingPlayers(online, players.length) : S.duel.connecting}
              {phase === 'waiting' ? ` · ${S.duel.waitingHint(Math.ceil(remainingMs / 1000))}` : ''}
            </Text>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: arena.bg, overflow: 'hidden', paddingHorizontal: 16, paddingBottom: 16 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8 },
  backBtn: { minHeight: 44, justifyContent: 'center' },
  back: { fontFamily: fonts.bold, fontSize: 16, color: colors.white },
  topChips: { flexDirection: 'row', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, flexDirection: 'row', alignItems: 'center', gap: 5 },
  chipText: { fontFamily: fonts.bold, fontSize: 13 },
  stakeText: { fontFamily: fonts.pixelNum, fontSize: 13, color: colors.ink },
  title: { fontFamily: fonts.extrabold, fontSize: 26, letterSpacing: -0.6, color: colors.white, marginTop: 6 },
  banner: { marginTop: 8, backgroundColor: colors.lemon, color: colors.ink, textAlign: 'center', padding: 8, borderRadius: radius.sm, fontFamily: fonts.bold, overflow: 'hidden' },
  stage: { flex: 1, justifyContent: 'space-evenly' },
  vsWrap: { alignItems: 'center', gap: 10 },
  vsDiamond: {
    width: 84,
    height: 84,
    borderRadius: 18,
    backgroundColor: colors.lemon,
    borderWidth: 3,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '45deg' }],
    ...hardShadow(5),
  },
  vs: { fontFamily: fonts.pixel, fontSize: 34, color: colors.ink, transform: [{ rotate: '-45deg' }] },
  count: { fontFamily: fonts.pixelNum, fontSize: 40, color: colors.ink, transform: [{ rotate: '-45deg' }] },
  mode: { fontFamily: fonts.pixelNum, fontSize: 13, color: colors.white, letterSpacing: 2, marginTop: 8 },
  footer: { alignItems: 'center', gap: 6, minHeight: 56, justifyContent: 'center' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  loading: { fontFamily: fonts.pixelNum, fontSize: 16, color: colors.white, letterSpacing: 2 },
  ready: { fontFamily: fonts.extrabold, fontSize: 22, color: colors.lemon },
  footHint: { fontFamily: fonts.medium, fontSize: 13, color: 'rgba(255,255,255,0.78)', textAlign: 'center' },
});
