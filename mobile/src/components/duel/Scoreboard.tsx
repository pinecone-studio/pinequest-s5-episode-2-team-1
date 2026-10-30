import type { DuelTeam, WsPlayer } from '@shared/types';
import { StyleSheet, Text, View } from 'react-native';
import { Avatar } from '@/components/Avatar';
import { Pop } from '@/components/pixel';
import { arena, colors, fonts, radius, teamColors } from '@/constants/theme';
import type { DuelView } from '@/hooks/useDuelSocket';
import { S } from '@/i18n/strings';
import { otherTeam, teamName, teamTotals } from '@/lib/duelTeams';
import { ArenaStripes } from './ArenaStripes';
import { CheckIcon } from './PlayerSlot';

const DIM = 'rgba(255,255,255,0.25)';

/** Асуултын үеийн самбар: өөрийн баг зүүн, өрсөлдөгч баруун; гишүүн бүр хариулсан эсэхийн тэмдэгтэй. */
export function Scoreboard({ view, myId, myTeam }: { view: DuelView; myId: number; myTeam: DuelTeam }) {
  const totals = teamTotals(view.players);
  const side = (team: DuelTeam) => {
    const members = view.players.filter((p) => (p.team ?? 'a') === team);
    const label = view.teamSize > 1 ? teamName(team, myTeam) : members[0]?.id === myId ? S.duel.you : (members[0]?.name ?? '');
    return (
      <View style={[styles.side, team !== myTeam && styles.right]}>
        <Text style={[styles.label, { color: teamColors[team].main }]} numberOfLines={1}>
          {label}
        </Text>
        <Pop trigger={totals[team]} from={0.6}>
          <Text style={styles.score}>{totals[team]}</Text>
        </Pop>
        <View style={[styles.faces, team !== myTeam && styles.facesRight]}>
          {members.map((p) => (
            <Face key={p.id} player={p} view={view} myId={myId} />
          ))}
        </View>
      </View>
    );
  };
  return (
    <View style={styles.board}>
      <ArenaStripes intensity={0.45} />
      {side(myTeam)}
      <Text style={styles.vs}>VS</Text>
      {side(otherTeam(myTeam))}
    </View>
  );
}

/** Хэн хариулсныг шууд, хэн зөв хариулсныг зөвхөн reveal-ийн дараа (бүгд хариулах эсвэл хугацаа дуусахад) харуулна. */
function Face({ player: p, view, myId }: { player: WsPlayer; view: DuelView; myId: number }) {
  const inQuestion = view.phase === 'question';
  const answered = p.id === myId ? view.myAnswer !== null : view.answered.includes(p.id);
  let ring = DIM;
  if (view.phase === 'reveal' && view.reveal) ring = view.reveal.correct?.includes(p.id) ? colors.lime : DIM;
  else if (answered) ring = colors.white;
  return (
    <View style={[styles.face, { borderColor: ring }, !p.connected && { opacity: 0.4 }]}>
      <Avatar size={view.teamSize > 3 ? 24 : 30} look={p.look} />
      {answered && inQuestion ? (
        <View style={styles.dot}>
          <CheckIcon color={colors.ink} size={7} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  board: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: arena.bg,
    borderRadius: radius.card,
    paddingHorizontal: 14,
    paddingVertical: 12,
    overflow: 'hidden',
    gap: 8,
  },
  side: { flex: 1, gap: 2 },
  right: { alignItems: 'flex-end' },
  label: { fontFamily: fonts.bold, fontSize: 12, letterSpacing: 0.4 },
  score: { fontFamily: fonts.pixelNum, fontSize: 30, color: colors.white },
  faces: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 2 },
  facesRight: { justifyContent: 'flex-end' },
  face: { borderWidth: 2, borderRadius: 999, padding: 1 },
  dot: {
    position: 'absolute',
    right: -3,
    bottom: -3,
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: colors.lemon,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vs: { fontFamily: fonts.pixel, fontSize: 20, color: colors.lemon },
});
