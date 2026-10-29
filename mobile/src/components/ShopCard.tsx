import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { BgArt } from '@/components/BgArt';
import { type ItemId, LiveBear } from '@/components/LiveBear';
import { PressScale, Sprite } from '@/components/pixel';
import { colors, fonts, radius } from '@/constants/theme';
import type { BgDef } from '@/lib/pixelBear/catalog';
import type { SwatchStatus } from './BgSwatch';

/** PreviewStage-ийн баавгай (164dp өргөн, ~290dp өндөр) энэ хэмжээгээр жижгэрнэ */
const SCALE = 0.38;

/** Дэлгүүрийн 3 баганат карт: item-ийг өмссөн (эсвэл дэвсгэр дээр зогссон) жижиг баавгай + үнийн pill. */
export function ShopCard({
  items,
  bg,
  label,
  status,
  equipped,
  onPress,
}: {
  items: ItemId[];
  /** дэвсгэрийн карт бол баавгайн ард зурна */
  bg?: BgDef;
  label: string;
  status: SwatchStatus;
  equipped: boolean;
  onPress: () => void;
}) {
  return (
    <PressScale accessibilityRole="button" accessibilityLabel={`${label}, ${status.a11y ?? status.text}`} onPress={onPress} style={styles.item}>
      <View style={[styles.tile, bg ? { backgroundColor: bg.hex } : null]}>
        {bg ? <BgArt bg={bg} /> : null}
        <View style={[styles.bear, { top: items.includes('warrior_helmet') ? 10 : 4, opacity: status.locked ? 0.55 : 1 }]}>
          <LiveBear anim="happy" w={164} items={items} still />
        </View>
        {equipped ? (
          <View style={styles.check}>
            <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={colors.white} strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M5 12.5 10 17.5 19 7" />
            </Svg>
          </View>
        ) : null}
      </View>
      <View style={styles.pill}>
        {status.showHoney ? <Sprite id="btn_honey_12x12" /> : null}
        <Text style={[styles.status, status.showHoney && styles.price, { color: status.color }]} numberOfLines={1}>
          {status.text}
        </Text>
      </View>
    </PressScale>
  );
}

const styles = StyleSheet.create({
  item: { flex: 1, alignItems: 'center', gap: 8 },
  tile: { alignSelf: 'stretch', height: 116, borderRadius: radius.md, backgroundColor: colors.white, overflow: 'hidden' },
  bear: { position: 'absolute', left: 0, right: 0, alignItems: 'center', transform: [{ scale: SCALE }], transformOrigin: 'center top' },
  check: {
    position: 'absolute',
    right: 6,
    top: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    maxWidth: '100%',
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
  },
  status: { fontFamily: fonts.semibold, fontSize: 12, flexShrink: 1 },
  price: { fontFamily: fonts.pixelNum, fontSize: 14 },
});
