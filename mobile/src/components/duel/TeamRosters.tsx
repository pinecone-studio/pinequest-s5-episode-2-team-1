import type { DuelOutcome, DuelTeam, WsPlayer } from '@shared/types';
import { StyleSheet, Text, View } from 'react-native';
import { Avatar } from '@/components/Avatar';
import { colors, fonts, radius, teamColors } from '@/constants/theme';
import { S } from '@/i18n/strings';
import { otherTeam, teamName } from '@/lib/duelTeams';

/** Багийн тулааны дүн: баг бүрийн гишүүд онооны дарааллаар, хамгийн их оноотой нь "Шилдэг". */
export function TeamRosters({
  players,
  outcome: o,
  myId,
  myTeam,
  winnerTeam,
}: {
  players: WsPlayer[];
  outcome: DuelOutcome;
  myId: number;
  myTeam: DuelTeam;
  winnerTeam: DuelTeam | null;
}) {
  const score = (id: number) => o.scores[id] ?? 0;
  const best = Math.max(0, ...players.map((p) => score(p.id)));
  return (
    <View style={styles.wrap}>
      {[myTeam, otherTeam(myTeam)].map((team) => (
        <View key={team} style={[styles.roster, { backgroundColor: teamColors[team].soft }]}>
          <Text style={[styles.title, { color: teamColors[team].ink }]}>
            {teamName(team, myTeam)}
            {winnerTeam === team ? ' 🏆' : ''}
          </Text>
          {players
            .filter((p) => p.team === team)
            .sort((x, y) => score(y.id) - score(x.id))
            .map((p) => (
              <View key={p.id} style={styles.row}>
                <Avatar size={30} look={p.look} />
                <Text style={styles.name} numberOfLines={1}>
                  {p.id === myId ? S.duel.you : p.name}
                </Text>
                {best > 0 && score(p.id) === best ? (
                  <View style={styles.mvp}>
                    <Text style={styles.mvpText}>{S.duel.mvp}</Text>
                  </View>
                ) : null}
                <Text style={styles.score}>{S.duel.pts(score(p.id))}</Text>
              </View>
            ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  roster: { borderRadius: radius.md, padding: 12, gap: 8 },
  title: { fontFamily: fonts.bold, fontSize: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  name: { flex: 1, fontFamily: fonts.semibold, fontSize: 15, color: colors.ink },
  score: { fontFamily: fonts.bold, fontSize: 13, color: colors.ink },
  mvp: { backgroundColor: colors.lemon, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  mvpText: { fontFamily: fonts.bold, fontSize: 11, color: colors.ink },
});
