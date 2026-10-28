import type { DuelTeam, WsPlayer } from '@shared/types';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { SlideInLeft, SlideInRight } from 'react-native-reanimated';
import { Avatar } from '@/components/Avatar';
import { colors, fonts, hardShadow, teamColors } from '@/constants/theme';
import { S } from '@/i18n/strings';
import { CheckIcon } from './PlayerSlot';
import { Spinner } from './Spinner';

/** VS дэлгэцийн нэг баг: картууд хажуунаас гулсаж орж, туузны налуугаар шатлан өгсөнө. */
export function MatchTeam({
  players,
  team,
  size,
  cardW,
  myId,
  from,
}: {
  players: WsPlayer[];
  team: DuelTeam;
  size: number;
  cardW: number;
  myId: number;
  from: 'left' | 'right';
}) {
  const c = teamColors[team];
  const slots: (WsPlayer | null)[] = [...players, ...Array<null>(Math.max(0, size - players.length)).fill(null)];
  const step = Math.min(10, 36 / Math.max(1, size - 1));
  return (
    <View style={styles.teamBlock}>
      <View style={[styles.teamLabel, { backgroundColor: c.main }]}>
        <Text style={styles.teamLabelText}>{team === 'a' ? S.duel.teamA : S.duel.teamB}</Text>
      </View>
      <View style={styles.cards}>
        {slots.map((p, i) => {
          const entering = (from === 'left' ? SlideInLeft : SlideInRight).delay(i * 90).springify().damping(15);
          return (
            <Animated.View
              key={p?.id ?? `slot-${i}`}
              entering={entering}
              style={{ width: cardW, transform: [{ translateY: (size - 1 - i) * step - ((size - 1) * step) / 2 }] }}
            >
              <PlayerCard player={p} team={team} me={p?.id === myId} width={cardW} />
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}

function PlayerCard({ player, team, me, width }: { player: WsPlayer | null; team: DuelTeam; me: boolean; width: number }) {
  const c = teamColors[team];
  const avatar = Math.max(34, Math.min(64, width - 18));
  return (
    <View
      accessible
      accessibilityLabel={player ? `${player.name}, ${player.connected ? S.duel.ready : S.duel.connecting}` : S.duel.emptySlot}
      style={[styles.card, { borderColor: me ? colors.lemon : colors.white, minHeight: avatar + 62 }]}
    >
      <View style={[styles.cardTop, { backgroundColor: c.main }]} />
      <View style={styles.cardAvatar}>
        {player ? <Avatar size={avatar} look={player.look} /> : <View style={[styles.ghost, { width: avatar, height: avatar, borderRadius: avatar / 2 }]} />}
      </View>
      <View style={[styles.nameBar, { backgroundColor: me ? colors.lemon : colors.ink }]}>
        <Text style={[styles.name, { color: me ? colors.ink : colors.white }]} numberOfLines={1}>
          {player ? (me ? S.duel.you : player.name) : '—'}
        </Text>
      </View>
      <View style={styles.status}>
        {player?.connected ? (
          <>
            <View style={styles.okDot}>
              <CheckIcon color={colors.white} size={9} />
            </View>
            <Text style={styles.statusText} numberOfLines={1}>
              {S.duel.ready}
            </Text>
          </>
        ) : (
          <Spinner size={11} color={c.main} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  teamBlock: { gap: 10 },
  teamLabel: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 6, transform: [{ skewX: '-12deg' }] },
  teamLabelText: { fontFamily: fonts.bold, fontSize: 12, color: colors.white, letterSpacing: 0.4 },
  cards: { flexDirection: 'row', justifyContent: 'center', gap: 8, paddingVertical: 18 },
  card: { backgroundColor: colors.white, borderRadius: 12, borderWidth: 2, overflow: 'hidden', ...hardShadow(4) },
  cardTop: { position: 'absolute', top: 0, left: 0, right: 0, height: '55%' },
  cardAvatar: { alignItems: 'center', paddingTop: 8 },
  ghost: { backgroundColor: 'rgba(255,255,255,0.35)', borderWidth: 2, borderStyle: 'dashed', borderColor: colors.white },
  nameBar: { marginTop: 6, paddingVertical: 4, paddingHorizontal: 4 },
  name: { fontFamily: fonts.bold, fontSize: 11, textAlign: 'center' },
  status: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 5, minHeight: 22 },
  okDot: { width: 13, height: 13, borderRadius: 7, backgroundColor: colors.okText, alignItems: 'center', justifyContent: 'center' },
  statusText: { fontFamily: fonts.bold, fontSize: 10, color: colors.okText },
});
