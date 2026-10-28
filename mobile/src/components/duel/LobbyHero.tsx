import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { Motion, Sprite } from '@/components/pixel';
import { CountPill } from '@/components/StatPill';
import { arena, colors, fonts, hardShadow, radius, teamColors } from '@/constants/theme';
import { S } from '@/i18n/strings';
import { ArenaStripes } from './ArenaStripes';

/**
 * Лобби-гийн дээд хэсэг: аажим гулсдаг ташуу туузтай бараан "arena", зүүн талдаа бүдэг давхарга (бичиг тод
 * уншигдана), баруун доод буланд тулаанд бэлэн баавгай.
 */
export function LobbyHero({ honey }: { honey: number }) {
  const reduce = useReducedMotion();
  const drift = useSharedValue(0);
  useEffect(() => {
    if (!reduce) drift.value = withRepeat(withTiming(1, { duration: 6000, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [reduce, drift]);
  const stripes = useAnimatedStyle(() => ({ transform: [{ translateX: -24 + drift.value * 24 }] }));

  return (
    <View style={styles.hero}>
      <Animated.View pointerEvents="none" style={[styles.stripes, stripes]}>
        <ArenaStripes />
      </Animated.View>
      <Svg pointerEvents="none" style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <LinearGradient id="heroScrim" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={arena.bg} stopOpacity={0.92} />
            <Stop offset="0.6" stopColor={arena.bg} stopOpacity={0.55} />
            <Stop offset="1" stopColor={arena.bg} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#heroScrim)" />
      </Svg>

      <Motion preset="float" style={styles.bear}>
        <Sprite id="bear_cheer_scarf_180x252" style={styles.bearImg} />
      </Motion>

      <View style={styles.top}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>VS</Text>
        </View>
        <CountPill icon="btn_honey_24x24" value={honey} label="Боргоцой" />
      </View>
      <Text accessibilityRole="header" style={styles.title}>
        {S.duel.title}
      </Text>
      <Text style={styles.hint}>{S.duel.hint}</Text>
      <View style={styles.chips}>
        <View style={[styles.chip, { backgroundColor: teamColors.a.main }]}>
          <Text style={styles.chipText}>1v1 — 5v5</Text>
        </View>
        <View style={[styles.chip, { backgroundColor: teamColors.b.main }]}>
          <Text style={styles.chipText}>{S.duel.visPrivate}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: arena.bg,
    borderRadius: radius.lg,
    padding: 18,
    paddingBottom: 16,
    gap: 6,
    overflow: 'hidden',
    minHeight: 196,
    borderWidth: 3,
    borderColor: colors.ink,
    ...hardShadow(5),
  },
  stripes: { position: 'absolute', top: 0, bottom: 0, left: -24, right: -24 },
  bear: { position: 'absolute', right: 6, bottom: -18 },
  bearImg: { width: 108, height: 151 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  badge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.lemon,
    borderWidth: 2,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-8deg' }],
    ...hardShadow(3),
  },
  badgeText: { fontFamily: fonts.pixel, fontSize: 18, color: colors.ink },
  title: {
    fontFamily: fonts.extrabold,
    fontSize: 40,
    lineHeight: 44,
    letterSpacing: -1.2,
    color: colors.white,
    marginTop: 10,
    textShadowColor: teamColors.b.main,
    textShadowOffset: { width: 3, height: 3 },
    textShadowRadius: 0,
  },
  hint: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 19, color: colors.white, maxWidth: '64%' },
  chips: { flexDirection: 'row', gap: 6, marginTop: 6 },
  chip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, borderWidth: 2, borderColor: colors.ink },
  chipText: { fontFamily: fonts.bold, fontSize: 12, color: colors.white },
});
