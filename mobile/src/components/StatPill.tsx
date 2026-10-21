import { StyleSheet, Text, View } from 'react-native';
import { Sprite } from '@/components/pixel';
import { colors, fonts, radius } from '@/constants/theme';
import type { SpriteKey } from '@/sprites';

const fmt = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

/** XP: од + тоо + 4px явцын зурвас. */
export function XpPill({ text, value, max }: { text: string; value: number; max: number }) {
  const pct = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  return (
    <View style={styles.pill} accessible accessibilityLabel={`XP ${text}`}>
      <Sprite id="icon_star_24x24" />
      <View style={{ gap: 3 }}>
        <Text style={styles.xpNum}>{text}</Text>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${pct * 100}%` }]} />
        </View>
      </View>
    </View>
  );
}

/** Streak / Coin гэх мэт: pixel icon + pixel тоо. */
export function CountPill({ icon, value, label }: { icon: SpriteKey; value: number; label: string }) {
  return (
    <View style={[styles.pill, { gap: 6 }]} accessible accessibilityLabel={`${label}: ${fmt(value)}`}>
      <Sprite id={icon} />
      <Text style={styles.num}>{fmt(value)}</Text>
    </View>
  );
}

export const formatNumber = fmt;

const styles = StyleSheet.create({
  pill: {
    height: 44,
    paddingLeft: 10,
    paddingRight: 12,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  num: { fontFamily: fonts.pixel, fontSize: 17, color: colors.ink },
  xpNum: { fontFamily: fonts.pixel, fontSize: 16, lineHeight: 16, color: colors.ink },
  track: { width: 70, height: 4, borderRadius: 2, backgroundColor: colors.track },
  fill: { height: 4, borderRadius: 2, backgroundColor: colors.violet },
});
