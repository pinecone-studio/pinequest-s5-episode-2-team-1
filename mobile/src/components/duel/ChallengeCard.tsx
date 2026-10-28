import type { DuelSummary } from '@shared/types';
import { StyleSheet, Text, View } from 'react-native';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Enter, Sprite } from '@/components/pixel';
import { Muted } from '@/components/ui';
import { arena, colors, fonts, radius, subjectTheme, teamColors } from '@/constants/theme';
import { S, subjectNames } from '@/i18n/strings';

/** Лобби дээрх нэгдэх боломжтой тулаан: горим, хичээл, бооцоо; багийн тулаанд хоёр багийн суудал. */
export function ChallengeCard({
  index,
  duel,
  highlight,
  canAfford,
  disabled,
  loading,
  onAccept,
}: {
  index: number;
  duel: DuelSummary;
  highlight: boolean;
  canAfford: boolean;
  disabled: boolean;
  loading: boolean;
  onAccept: () => void;
}) {
  const n = duel.teamSize;
  const team = n > 1;
  return (
    <Enter index={index} style={[styles.card, highlight && styles.match]}>
      <View style={styles.top}>
        <View style={styles.mode}>
          <Text style={styles.modeText}>{`${n} VS ${n}`}</Text>
        </View>
        <View style={[styles.tag, { backgroundColor: subjectTheme[duel.subject].bg }]}>
          <Text style={[styles.tagText, { color: subjectTheme[duel.subject].fg }]}>{subjectNames[duel.subject]}</Text>
        </View>
        <View style={styles.stakeRow}>
          <Sprite id="btn_honey_24x24" />
          <Text style={styles.stake}>{duel.stake}</Text>
        </View>
      </View>
      <View style={styles.body}>
        {team ? <Seats duel={duel} /> : <Avatar size={48} look={duel.creator.look} />}
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.name} numberOfLines={1}>
            {duel.creator.name ?? duel.creator.username}
          </Text>
          <Muted>
            {team ? S.duel.slotsLeft(n * 2 - duel.members.length) : `@${duel.creator.username}`} · {S.duel.level(duel.creator.level)}
          </Muted>
        </View>
        {canAfford ? (
          <Button title={team ? S.duel.joinTeam : S.duel.accept} small disabled={disabled} loading={loading} onPress={onAccept} />
        ) : (
          <Text style={styles.tooHigh}>{S.duel.tooHighForMe}</Text>
        )}
      </View>
    </Enter>
  );
}

/** Хоёр багийн жижиг суудлууд (дүүрсэн нь хөрөгтэй, сул нь тасархай). */
function Seats({ duel }: { duel: DuelSummary }) {
  return (
    <View style={{ gap: 4 }}>
      {(['a', 'b'] as const).map((t) => {
        const members = duel.members.filter((m) => m.team === t);
        return (
          <View key={t} style={styles.seatRow}>
            {Array.from({ length: duel.teamSize }, (_, i) =>
              members[i] ? (
                <View key={i} style={[styles.face, { borderColor: teamColors[t].main }]}>
                  <Avatar size={22} look={members[i].look} />
                </View>
              ) : (
                <View key={i} style={[styles.empty, { borderColor: teamColors[t].main }]} />
              ),
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.white, borderRadius: radius.card, padding: 14, gap: 10, borderWidth: 2, borderColor: colors.white },
  match: { borderColor: colors.violet },
  top: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  body: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  mode: { backgroundColor: arena.bg, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  modeText: { fontFamily: fonts.pixelNum, fontSize: 11, color: colors.white, letterSpacing: 1 },
  tag: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: radius.pill },
  tagText: { fontFamily: fonts.bold, fontSize: 12 },
  stakeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 'auto' },
  stake: { fontFamily: fonts.pixelNum, fontSize: 17, color: colors.ink },
  seatRow: { flexDirection: 'row', gap: 2 },
  face: { borderWidth: 1.5, borderRadius: 999 },
  empty: { width: 25, height: 25, borderRadius: 13, borderWidth: 1.5, borderStyle: 'dashed', backgroundColor: colors.paper },
  name: { fontFamily: fonts.bold, fontSize: 16, color: colors.ink },
  tooHigh: { fontFamily: fonts.semibold, fontSize: 12, color: colors.dangerText, maxWidth: 110, textAlign: 'right' },
});
