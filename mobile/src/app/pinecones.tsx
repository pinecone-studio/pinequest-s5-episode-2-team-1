import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Enter, PressScale, Sprite } from '@/components/pixel';
import { BundleGrid, EarnRow, wood, WoodSign, WoodStripes } from '@/components/pinecones';
import { formatNumber } from '@/components/StatPill';
import { colors, fonts } from '@/constants/theme';
import { S } from '@/i18n/strings';
import { usePixelBear } from '@/lib/mock/pixelBear';
import { goBack } from '@/lib/nav';

/**
 * Боргоцой: модон лангуу маягийн дэлгэц. Дээр нь боргоцой олох арга замууд (дарахад тухайн хэсэг рүү очно), доор нь
 * мөнгөөр авах багцууд, хамгийн доор үлдэгдэл.
 */
export default function PineconesScreen() {
  const bear = usePixelBear();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const headH = insets.top + 150;

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.head, { height: headH }]}>
          <WoodStripes width={width} height={headH} />
          <PressScale accessibilityRole="button" accessibilityLabel={S.common.back} onPress={() => goBack('/shop')} style={[styles.back, { top: insets.top + 8 }]}>
            <Text style={styles.backGlyph}>←</Text>
          </PressScale>
          <View accessibilityRole="header" accessibilityLabel={S.pinecones.open} style={styles.title}>
            <WoodSign text={S.pinecones.title} size="lg" />
          </View>
        </View>

        <View style={styles.list}>
          {S.pinecones.earn.map((way, i) => (
            <Enter key={way.key} index={i}>
              <EarnRow way={way} />
            </Enter>
          ))}
        </View>

        <View style={styles.shelf}>
          <WoodStripes width={width - 24} height={46} />
          <View style={styles.shelfSign}>
            <WoodSign text={S.pinecones.bundles} size="sm" />
          </View>
        </View>

        <BundleGrid />
      </ScrollView>

      <View style={[styles.floor, { paddingBottom: insets.bottom + 14 }]} accessible accessibilityLabel={`${S.pinecones.balance}: ${formatNumber(bear.honey)}`}>
        <Text style={styles.floorLabel}>{S.pinecones.balance}</Text>
        <Sprite id="btn_honey_36x36" />
        <Text style={styles.floorNum}>{formatNumber(bear.honey)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: wood.bg },
  scroll: { paddingBottom: 32 },
  head: { alignItems: 'center', marginBottom: 22 },
  back: {
    position: 'absolute',
    left: 16,
    width: 60,
    height: 46,
    backgroundColor: wood.sign,
    borderWidth: 4,
    borderColor: wood.edge,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backGlyph: { fontFamily: fonts.pixel, fontSize: 26, lineHeight: 30, color: wood.signInk },
  title: { flex: 1, justifyContent: 'flex-end', paddingBottom: 26 },
  list: { paddingHorizontal: 22, gap: 26 },
  shelf: { height: 56, marginTop: 34, marginHorizontal: 12, alignItems: 'center', justifyContent: 'center', borderTopWidth: 4, borderColor: wood.edge },
  shelfSign: { position: 'absolute', top: 4 },
  floor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 14,
    paddingHorizontal: 22,
    backgroundColor: wood.floor,
    borderTopWidth: 4,
    borderColor: wood.edge,
  },
  floorLabel: { flex: 1, fontFamily: fonts.semibold, fontSize: 15, color: colors.white },
  floorNum: { fontFamily: fonts.pixelNum, fontSize: 22, color: colors.white },
});
