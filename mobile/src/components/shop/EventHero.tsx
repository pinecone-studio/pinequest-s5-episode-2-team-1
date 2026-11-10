import { Image, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { PressScale } from '@/components/pixel';
import { colors, fonts } from '@/constants/theme';
import { SH } from '@/i18n/shop';
import { S } from '@/i18n/strings';
import { daysLeft, type ShopEvent } from '@/lib/pixelBear/events';

/** poster-ийн хэмжээ (scripts/poster-sprites.ts: 320×300) */
const RATIO = 320 / 300;

/** Эвентийн хуудасны дээд хэсэг: бүтэн өргөнөөр poster, дээд талын тэнгэр дээр нь хаах товч, нэр, үлдсэн хоног. */
export function EventHero({ ev, top, onClose }: { ev: ShopEvent; top: number; onClose: () => void }) {
  return (
    <View style={[styles.hero, { backgroundColor: ev.color }]}>
      <Image source={ev.hero} resizeMode="cover" accessibilityLabel={ev.tagline} style={styles.poster} />
      <View style={[styles.bar, { paddingTop: top + 8 }]}>
        <PressScale accessibilityRole="button" accessibilityLabel={S.common.close} onPress={onClose} style={styles.close}>
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={ev.ink} strokeWidth={3} strokeLinecap="round">
            <Path d="M6 6l12 12M18 6 6 18" />
          </Svg>
        </PressScale>
        <View style={styles.center}>
          <Text accessibilityRole="header" style={[styles.title, { color: ev.ink }]} numberOfLines={2}>
            {ev.title}
          </Text>
          <View style={[styles.days, { backgroundColor: ev.deep }]}>
            <Svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={colors.lemon} strokeWidth={3} strokeLinecap="round">
              <Path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM12 7v5l3 2" />
            </Svg>
            <Text style={styles.daysText}>{SH.daysLeft(daysLeft(ev))}</Text>
          </View>
        </View>
        <View style={styles.close} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { width: '100%', aspectRatio: RATIO, overflow: 'hidden' },
  // web-д Image эх зургийн хэмжээгээ авдаг тул өргөн, өндрийг заавал өгнө
  poster: { ...StyleSheet.absoluteFill, width: '100%', height: '100%' },
  bar: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 12 },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', gap: 6, paddingTop: 8 },
  title: { fontFamily: fonts.extrabold, fontSize: 22, lineHeight: 27, textAlign: 'center' },
  days: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 26, paddingHorizontal: 10, borderRadius: 13 },
  daysText: { fontFamily: fonts.bold, fontSize: 13, color: colors.lemon },
});
