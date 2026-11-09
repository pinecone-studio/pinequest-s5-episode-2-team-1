import { leagueTier } from '@shared/league';
import { StyleSheet, Text, View } from 'react-native';
import { Enter, Sprite } from '@/components/pixel';
import { colors, fonts, radius } from '@/constants/theme';
import { P } from '@/i18n/profile';
import type { SpriteKey } from '@/sprites';

/** "Тойм": өдөр дараалан, лиг (ангигүй бол саарал), нийт XP, шат — 2×2 хавтан, icon нь pixel sprite. */
export function Overview({ streak, tier, xp, level, index }: { streak: number; tier: number | null; xp: number; level: number; index: number }) {
  const league = tier !== null ? leagueTier(tier) : null;
  return (
    <Enter index={index} style={styles.section}>
      <Text accessibilityRole="header" style={styles.title}>
        {P.overview}
      </Text>
      <View style={styles.grid}>
        <Tile icon="icon_flame_24x24" value={String(streak)} label={P.streak} />
        <Tile
          icon={league ? (`league_${league.key}_32x32` as SpriteKey) : 'nav2_league_off_30x30'}
          value={league ? league.name : P.noLeague}
          label={P.league}
          muted={!league}
        />
        <Tile icon="icon_star_24x24" value={xp.toLocaleString('en-US').replace(/,/g, ' ')} label={P.xp} />
        <Tile icon="nav2_path_on_30x30" value={P.levelValue(level)} label={P.level} />
      </View>
    </Enter>
  );
}

function Tile({ icon, value, label, muted }: { icon: SpriteKey; value: string; label: string; muted?: boolean }) {
  return (
    <View style={styles.tile} accessible accessibilityLabel={`${label}: ${value}`}>
      <View style={styles.icon}>
        <Sprite id={icon} />
      </View>
      <View style={styles.texts}>
        <Text style={[styles.value, muted && { color: colors.muted }]} numberOfLines={1}>
          {value}
        </Text>
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
      </View>
    </View>
  );
}

export const sectionTitle = { fontFamily: fonts.bold, fontSize: 13, letterSpacing: 0.8, textTransform: 'uppercase', color: colors.muted } as const;

const styles = StyleSheet.create({
  section: { gap: 10 },
  title: sectionTitle,
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: {
    flexBasis: '47%',
    flexGrow: 1,
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.white,
  },
  icon: { width: 34, alignItems: 'center' },
  texts: { flex: 1, gap: 1 },
  value: { fontFamily: fonts.extrabold, fontSize: 17, color: colors.ink },
  label: { fontFamily: fonts.semibold, fontSize: 13, color: colors.muted },
});
