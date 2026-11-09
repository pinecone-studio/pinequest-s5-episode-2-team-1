import { leagueTier, raceStatus } from '@shared/league';
import type { LeagueResponse } from '@shared/types';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { api } from '@/api/client';
import { Button } from '@/components/Button';
import { AnimatedBar, Sprite } from '@/components/pixel';
import { colors, fonts, radius } from '@/constants/theme';
import { L } from '@/i18n/league';

/**
 * Ангийн картын уралдааны хэсэг (Duolingo лиг шиг): лиг ба байрын мөр (дарвал Анги tab-ийн уралдаан), дээд ангийг давахад
 * хэдэн XP дутуу ба явцын зурвас, XP цуглуулах гол товч. /league-ийг өөрөө ачаална; ачаалж чадаагүй бол харагдахгүй.
 */
export function RaceBox() {
  const [data, setData] = useState<LeagueResponse | null>(null);
  useFocusEffect(
    useCallback(() => {
      api<LeagueResponse>('/league')
        .then(setData)
        .catch(() => undefined);
    }, []),
  );

  const clan = data?.standings.find((c) => c.isMine);
  const status = data ? raceStatus(data.standings) : null;
  if (!data || !clan || !status) return null;
  const tier = leagueTier(data.me.tier);
  const text = status.kind === 'lead' ? L.statusLead(status.gap) : status.kind === 'chase' ? L.statusChase(status.rank, status.need) : L.statusAlone;
  // дээд ангийг давах хүртэлх явц; тэргүүлж байвал дүүрэн
  const progress = status.kind === 'lead' ? 1 : status.kind === 'chase' ? clan.weekXp / (clan.weekXp + status.need) : null;

  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${L.tierName(tier.name)}, ${clan.rank}-р ${L.place}. ${L.seeRace}`}
        onPress={() => router.push('/league')}
        style={({ pressed }) => [styles.league, pressed && { opacity: 0.7 }]}
      >
        <Sprite id={`league_${tier.key}_32x32`} />
        <View style={styles.texts}>
          <Text style={styles.title}>{L.tierName(tier.name)}</Text>
          <Text style={styles.meta}>{data.me.grade !== null ? L.standings(data.me.grade) : L.standingsAny}</Text>
        </View>
        <View style={styles.place}>
          <Text style={styles.placeNum}>{clan.rank}</Text>
          <Text style={styles.placeLabel}>{L.place}</Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </Pressable>
      <View style={styles.status}>
        <Text style={styles.statusText} accessibilityLiveRegion="polite">
          {text}
        </Text>
        {progress !== null ? (
          <View style={styles.track}>
            <AnimatedBar value={progress} height={12} color={status.kind === 'lead' ? colors.okText : colors.violet} />
          </View>
        ) : null}
      </View>
      <Button title={L.doTasks} variant="lemon" onPress={() => router.push('/tasks')} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 16 },
  league: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.md,
    backgroundColor: colors.trackAlt,
  },
  texts: { flex: 1, gap: 2 },
  title: { fontFamily: fonts.extrabold, fontSize: 17, color: colors.ink },
  meta: { fontFamily: fonts.medium, fontSize: 13, color: colors.muted },
  place: { alignItems: 'center', minWidth: 44 },
  placeNum: { fontFamily: fonts.pixelNum, fontSize: 26, lineHeight: 30, color: colors.indigo },
  placeLabel: { fontFamily: fonts.bold, fontSize: 12, color: colors.muted },
  chevron: { fontFamily: fonts.bold, fontSize: 22, color: colors.mutedIcon },
  status: { gap: 10 },
  statusText: { fontFamily: fonts.extrabold, fontSize: 18, lineHeight: 24, color: colors.indigo },
  track: { height: 12, borderRadius: radius.pill, backgroundColor: colors.track, overflow: 'hidden' },
});
