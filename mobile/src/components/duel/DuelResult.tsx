import type { DuelOutcome, DuelTeam } from '@shared/types';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { Motion, Sprite } from '@/components/pixel';
import { Card, Muted } from '@/components/ui';
import { colors, fonts, teamColors } from '@/constants/theme';
import type { DuelView } from '@/hooks/useDuelSocket';
import { S } from '@/i18n/strings';
import { otherTeam, teamTotals } from '@/lib/duelTeams';
import { goBack } from '@/lib/nav';
import type { SpriteKey } from '@/sprites';
import { TeamRosters } from './TeamRosters';

function noteOf(o: DuelOutcome, cancelled: boolean, team: boolean, won: boolean, draw: boolean): string | null {
  if (cancelled) return team ? S.duel.teamCancelledHint : S.duel.cancelledHint;
  if (o.reason === 'forfeit') {
    if (team) return won ? S.duel.teamForfeitWin : S.duel.teamForfeitLose;
    return won ? S.duel.forfeitWin : S.duel.forfeitLose;
  }
  return draw ? S.duel.refunded : null;
}

export function DuelResult({ view, myId, myTeam }: { view: DuelView; myId: number; myTeam: DuelTeam }) {
  const o = view.outcome!;
  const cancelled = view.phase === 'cancelled';
  const team = view.teamSize > 1;
  const winnerTeam = o.winnerTeam ?? (o.winnerId === null ? null : (view.players.find((p) => p.id === o.winnerId)?.team ?? null));
  const draw = winnerTeam === null;
  const won = winnerTeam === myTeam;
  const delta = o.deltas[myId] ?? 0;
  const totals = o.teamScores ?? teamTotals(view.players.map((p) => ({ ...p, score: o.scores[p.id] ?? 0 })));
  const title = cancelled ? S.duel.cancelledTitle : draw ? S.duel.draw : team ? (won ? S.duel.teamWin : S.duel.teamLose) : won ? S.duel.win : S.duel.lose;
  const note = noteOf(o, cancelled, team, won, draw);
  const points = o.points[myId];
  const bear: SpriteKey = cancelled ? 'bear_sleep_190x254' : draw ? 'bear_idle_scarf_164x280' : won ? 'bear_cheer_scarf_180x252' : 'bear_tired_scarf_164x280';

  return (
    <>
      <Card style={[styles.card, { backgroundColor: won ? colors.lime : cancelled || draw ? colors.white : colors.lavender }]}>
        <Motion preset={won ? 'float' : 'bob'}>
          <Sprite id={bear} />
        </Motion>
        <Text style={styles.title}>{title}</Text>
        {!cancelled && (
          <View style={styles.row}>
            <Text style={[styles.score, { color: teamColors[myTeam].ink }]}>{totals[myTeam]}</Text>
            <Text style={styles.colon}>:</Text>
            <Text style={[styles.score, { color: teamColors[otherTeam(myTeam)].ink }]}>{totals[otherTeam(myTeam)]}</Text>
          </View>
        )}
        <Text style={[styles.delta, { color: delta > 0 ? colors.okText : delta < 0 ? colors.dangerText : colors.muted }]}>{S.duel.delta(delta)}</Text>
        {note ? <Muted center>{note}</Muted> : null}
        {points !== undefined ? (
          <View style={styles.row}>
            <Sprite id="btn_honey_24x24" />
            <Text style={styles.points}>{S.duel.pointsNow(points)}</Text>
          </View>
        ) : null}
      </Card>
      {team && !cancelled ? <TeamRosters players={view.players} outcome={o} myId={myId} myTeam={myTeam} winnerTeam={winnerTeam} /> : null}
      <Button title={S.duel.backToLobby} onPress={() => goBack('/duel')} />
    </>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: 'center', gap: 12, paddingVertical: 24 },
  title: { fontFamily: fonts.semibold, fontSize: 30, letterSpacing: -0.8, color: colors.ink, textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  score: { fontFamily: fonts.pixelNum, fontSize: 30 },
  colon: { fontFamily: fonts.pixelNum, fontSize: 24, color: colors.muted },
  delta: { fontFamily: fonts.pixelNum, fontSize: 24 },
  points: { fontFamily: fonts.bold, fontSize: 16, color: colors.ink },
});
