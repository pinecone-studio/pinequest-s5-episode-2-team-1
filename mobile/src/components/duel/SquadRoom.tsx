import type { DuelSummary, DuelTeam } from '@shared/types';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { Sprite } from '@/components/pixel';
import { arena, colors, fonts, radius, subjectTheme } from '@/constants/theme';
import { S, subjectNames } from '@/i18n/strings';
import { formatCode } from '@/lib/duelTeams';
import { ArenaStripes } from './ArenaStripes';
import { TeamPanel } from './TeamPanel';

/**
 * Нээлттэй сорилтын "өрөө": хоёр багийн слот (дүүрсэн / сул), баг солих, урилгын код. 1 vs 1-д ч мөн
 * адил (Та ба сул суудал), зөвхөн багийн нэр, солих товчгүй.
 */
export function SquadRoom({
  duel,
  myId,
  busy,
  onSwitch,
  onShare,
  onCancel,
  onLeave,
}: {
  duel: DuelSummary;
  myId: number;
  busy: string | null;
  onSwitch: (team: DuelTeam) => void;
  onShare: () => void;
  onCancel: () => void;
  onLeave: () => void;
}) {
  const n = duel.teamSize;
  const team = n > 1;
  const creator = duel.creator.id === myId;
  const have = duel.members.length;
  const theme = subjectTheme[duel.subject];
  return (
    <View style={styles.card}>
      <View style={styles.hero}>
        <ArenaStripes intensity={0.55} />
        <View style={styles.heroRow}>
          <Text style={styles.mode}>{`${n} VS ${n}`}</Text>
          <View style={[styles.subject, { backgroundColor: theme.bg }]}>
            <Text style={[styles.subjectText, { color: theme.fg }]}>{subjectNames[duel.subject]}</Text>
          </View>
        </View>
        <View style={styles.heroRow}>
          <Text style={styles.heroTitle}>{team ? S.duel.squadTitle(n) : S.duel.mineTitle}</Text>
          <View style={styles.stake}>
            <Sprite id="btn_honey_12x12" />
            <Text style={styles.stakeText}>{duel.stake}</Text>
          </View>
        </View>
      </View>

      <View style={styles.body}>
        <TeamPanel team="a" duel={duel} myId={myId} busy={busy} onSwitch={onSwitch} />
        <View style={styles.vsRow}>
          <View style={styles.vsLine} />
          <Text style={styles.vs}>VS</Text>
          <View style={styles.vsLine} />
        </View>
        <TeamPanel team="b" duel={duel} myId={myId} busy={busy} onSwitch={onSwitch} />

        {duel.code ? (
          <View style={styles.codeBox}>
            <View style={{ alignItems: 'center', gap: 2 }}>
              <Text style={styles.label}>{S.duel.codeLabel}</Text>
              <Text selectable accessibilityLabel={`${S.duel.codeLabel}: ${duel.code.split('').join(' ')}`} style={styles.code}>
                {formatCode(duel.code)}
              </Text>
              <Text style={styles.hint}>{duel.visibility === 'private' ? S.duel.minePrivate : S.duel.minePublic}</Text>
            </View>
            <Button title={S.duel.share} variant="lemon" small onPress={onShare} />
          </View>
        ) : null}

        <View style={styles.waitingRow}>
          <ActivityIndicator color={colors.violet} />
          <Text style={[styles.hint, { flex: 1 }]}>
            {team ? `${S.duel.squadReady(have, n * 2)} · ${S.duel.squadHint}` : S.duel.waitingAccept}
          </Text>
        </View>
        {creator ? (
          <Button title={S.duel.cancel} variant="secondary" small loading={busy === 'cancel'} onPress={onCancel} />
        ) : (
          <Button title={S.duel.leaveTeam} variant="secondary" small loading={busy === 'leave'} onPress={onLeave} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.card, backgroundColor: colors.white, overflow: 'hidden', borderWidth: 3, borderColor: colors.indigo },
  hero: { backgroundColor: arena.bg, paddingHorizontal: 16, paddingVertical: 14, gap: 8, overflow: 'hidden' },
  heroRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  mode: { fontFamily: fonts.pixelNum, fontSize: 24, color: colors.white, letterSpacing: 1 },
  heroTitle: { flex: 1, fontFamily: fonts.bold, fontSize: 15, color: colors.white },
  subject: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  subjectText: { fontFamily: fonts.bold, fontSize: 12 },
  stake: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.white,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  stakeText: { fontFamily: fonts.pixelNum, fontSize: 13, color: colors.ink },
  body: { padding: 14, gap: 10 },
  vsRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  vsLine: { flex: 1, height: 2, backgroundColor: colors.line },
  vs: { fontFamily: fonts.pixel, fontSize: 18, color: colors.indigo },
  codeBox: { alignItems: 'center', gap: 10, backgroundColor: colors.paper, borderRadius: radius.md, padding: 14 },
  label: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase', color: colors.muted },
  code: { fontFamily: fonts.pixelNum, fontSize: 28, letterSpacing: 3, color: colors.indigo },
  hint: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 18, color: colors.muted },
  waitingRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
