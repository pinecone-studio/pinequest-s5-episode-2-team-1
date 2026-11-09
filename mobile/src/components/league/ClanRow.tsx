import { clanTitle } from '@shared/clan';
import { leagueTier } from '@shared/league';
import type { LeagueClanDto } from '@shared/types';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ClanEmblem } from '@/components/clan/ClanEmblem';
import { AnimatedBar } from '@/components/pixel';
import { colors, fonts, radius } from '@/constants/theme';
import { L } from '@/i18n/league';

const MEDAL = ['#F2C94C', '#C9CDD6', '#D9935B'];

/** Уралдааны нэг мөр: байр, нэр, энэ 7 хоногийн XP ба тэргүүлэгчтэй харьцуулсан зурвас (`max` = 1-р байрны XP). */
export function ClanRow({ clan, max, onPress }: { clan: LeagueClanDto; max: number; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={L.rowA11y(clan.rank, clan.name, clan.weekXp, clan.isMine)}
      onPress={onPress}
      style={({ pressed }) => [styles.row, clan.isMine && styles.rowMine, pressed && { opacity: 0.85 }]}
    >
      <View style={[styles.rank, clan.rank <= 3 && { backgroundColor: MEDAL[clan.rank - 1] }]}>
        <Text style={styles.rankText}>{clan.rank}</Text>
      </View>
      <ClanEmblem icon={clan.icon} />
      <View style={styles.texts}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>
            {clanTitle(clan.name)}
          </Text>
          {clan.isMine ? <Text style={styles.tag}>{L.mineTag}</Text> : null}
        </View>
        <Text style={styles.meta} numberOfLines={1}>
          {`${leagueTier(clan.tier).name} · ${L.members(clan.members)}`}
        </Text>
        <View style={styles.track}>
          <AnimatedBar value={max > 0 ? clan.weekXp / max : 0} height={6} color={clan.isMine ? colors.violet : colors.mutedIcon} />
        </View>
      </View>
      <Text style={styles.points}>{L.weekXp(clan.weekXp)}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.line,
  },
  rowMine: { borderColor: colors.violet, backgroundColor: colors.trackAlt },
  rank: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.track },
  rankText: { fontFamily: fonts.pixelNum, fontSize: 13, color: colors.ink },
  texts: { flex: 1, gap: 3 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { flexShrink: 1, fontFamily: fonts.bold, fontSize: 16, color: colors.ink },
  tag: {
    flexShrink: 0,
    fontFamily: fonts.bold,
    fontSize: 11,
    color: colors.white,
    backgroundColor: colors.violet,
    borderRadius: radius.pill,
    paddingHorizontal: 7,
    paddingVertical: 1,
    overflow: 'hidden',
  },
  meta: { fontFamily: fonts.medium, fontSize: 12, color: colors.muted },
  track: { height: 6, borderRadius: 3, backgroundColor: colors.track, overflow: 'hidden' },
  points: { fontFamily: fonts.extrabold, fontSize: 15, color: colors.indigo },
});
