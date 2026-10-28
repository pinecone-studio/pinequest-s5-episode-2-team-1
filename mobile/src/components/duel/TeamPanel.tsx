import type { DuelMemberDto, DuelSummary, DuelTeam } from '@shared/types';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { colors, fonts, radius, teamColors } from '@/constants/theme';
import { S } from '@/i18n/strings';
import { PlayerSlot } from './PlayerSlot';

/** Нэг багийн слотууд (дүүрсэн / сул) ба "Энэ баг руу" шилжих товч. */
export function TeamPanel({
  team,
  duel,
  myId,
  busy,
  onSwitch,
}: {
  team: DuelTeam;
  duel: DuelSummary;
  myId: number;
  busy: string | null;
  onSwitch: (team: DuelTeam) => void;
}) {
  const c = teamColors[team];
  const n = duel.teamSize;
  const members = duel.members.filter((m) => m.team === team);
  const slots: (DuelMemberDto | null)[] = [...members, ...Array<null>(Math.max(0, n - members.length)).fill(null)];
  const mine = duel.myTeam === team;
  const canSwitch = n > 1 && !mine && members.length < n;
  return (
    <View style={[styles.panel, { backgroundColor: c.soft }]}>
      {n > 1 ? (
        <View style={styles.panelHead}>
          <View style={[styles.teamDot, { backgroundColor: c.main }]} />
          <Text style={[styles.teamName, { color: c.ink }]}>{team === 'a' ? S.duel.teamA : S.duel.teamB}</Text>
          {mine ? (
            <View style={[styles.mineTag, { backgroundColor: c.main }]}>
              <Text style={styles.mineTagText}>{S.duel.yourTeam}</Text>
            </View>
          ) : null}
          <Text style={[styles.count, { color: c.ink }]}>{`${members.length}/${n}`}</Text>
        </View>
      ) : null}
      <View style={styles.slots}>
        {slots.map((m, i) => (
          <PlayerSlot key={m?.id ?? `empty-${i}`} team={team} name={m?.name} look={m?.look} me={m?.id === myId} size={n > 3 ? 40 : 48} />
        ))}
      </View>
      {canSwitch ? (
        <Button title={S.duel.switchHere} variant="white" small loading={busy === `team-${team}`} disabled={busy !== null} onPress={() => onSwitch(team)} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { borderRadius: radius.md, padding: 12, gap: 10 },
  panelHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  teamDot: { width: 10, height: 10, borderRadius: 3 },
  teamName: { fontFamily: fonts.bold, fontSize: 14 },
  mineTag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill },
  mineTagText: { fontFamily: fonts.bold, fontSize: 11, color: colors.white },
  count: { marginLeft: 'auto', fontFamily: fonts.pixelNum, fontSize: 13 },
  slots: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6 },
});
