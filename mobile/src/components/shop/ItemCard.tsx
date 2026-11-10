import { StyleSheet, Text, View } from 'react-native';
import type { SwatchStatus } from '@/components/BgSwatch';
import { LiveBear } from '@/components/LiveBear';
import { PressScale, Sprite } from '@/components/pixel';
import { colors, fonts } from '@/constants/theme';
import { type OutfitDef, outfitItems } from '@/lib/pixelBear/catalog';

/** LiveBear-ийн бүтэн өндөр (PreviewStage-ийн 290): tile-ийн өндөрт багтаан жижгэрүүлнэ */
const BEAR_H = 290;

/**
 * Эвент, тавиурын том карт: хувцсаа өмссөн баавгай, доод туузан дээр үнэ (эсвэл түгжээ), Plus бол дээд ирмэг дээр тэмдэг.
 * `dark`: эвентийн бараан хуудсанд. `width` өгөхгүй бол мөрөнд flex: 1.
 */
export function ItemCard({
  outfit,
  status,
  badge,
  dark,
  width,
  height = 150,
  onPress,
}: {
  outfit: OutfitDef;
  status: SwatchStatus;
  badge?: string;
  dark?: boolean;
  width?: number;
  height?: number;
  onPress: () => void;
}) {
  const s = (height - 10) / BEAR_H;
  const lock = status.locked && !status.showHoney;
  // бараан тууз дээр гэрэл өнгөөр: үнэ цагаан, хүрэхгүй бол ягаавтар, таных бол ногоон
  const fg = !dark ? status.color : status.showHoney ? (status.locked ? '#FFB4A8' : colors.white) : colors.lime;
  return (
    <PressScale
      accessibilityRole="button"
      accessibilityLabel={`${outfit.name}, ${status.a11y ?? status.text}`}
      onPress={onPress}
      style={[styles.wrap, width ? { width } : { flex: 1 }]}
    >
      <View style={[styles.card, dark ? styles.cardDark : { backgroundColor: outfit.tile }, badge ? { borderColor: colors.violet } : null]}>
        <View style={{ height }}>
          <View style={[styles.halo, { width: height * 0.82, height: height * 0.82, borderRadius: height, marginLeft: -height * 0.41 }, dark && styles.haloDark]} />
          <View style={[styles.bear, { transform: [{ scale: s }], opacity: lock ? 0.6 : 1 }]}>
            <LiveBear anim="happy" w={164} items={outfitItems(outfit)} still />
          </View>
        </View>
        <View style={[styles.band, dark ? styles.bandDark : null]}>
          {lock ? (
            <View style={[styles.lockChip, dark && styles.lockChipDark]}>
              <Sprite id="icon_lock_32x32" style={styles.lock} />
            </View>
          ) : (
            <>
              {status.showHoney ? <Sprite id="btn_honey_12x12" /> : null}
              <Text style={[status.showHoney ? styles.price : styles.text, { color: fg }]} numberOfLines={1}>
                {status.text}
              </Text>
            </>
          )}
        </View>
      </View>
      {badge ? (
        <View style={[styles.badge, dark ? { borderColor: '#120A33' } : null]}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : null}
      <Text style={[styles.name, dark ? { color: colors.lavender } : null]} numberOfLines={2}>
        {outfit.name}
      </Text>
    </PressScale>
  );
}

const styles = StyleSheet.create({
  // дээд 10dp нь Plus тэмдэг картын ирмэгээс цухуйх зай
  wrap: { paddingTop: 10, gap: 8 },
  // нэг өнгийн хүрээ, доод ирмэг нь зузаан (товойсон хавтан); Plus бол хүрээ нь ягаан
  card: { borderRadius: 18, borderWidth: 2, borderBottomWidth: 5, borderColor: 'rgba(25,21,46,0.14)', overflow: 'hidden' },
  cardDark: { backgroundColor: '#2A1E66', borderColor: 'rgba(255,255,255,0.14)' },
  halo: { position: 'absolute', left: '50%', top: '10%', backgroundColor: 'rgba(255,255,255,0.4)' },
  haloDark: { backgroundColor: 'rgba(122,92,245,0.32)' },
  bear: { position: 'absolute', left: 0, right: 0, top: 6, alignItems: 'center', transformOrigin: 'center top' },
  band: {
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 8,
    borderTopWidth: 2,
    borderColor: 'rgba(25,21,46,0.1)',
    backgroundColor: colors.white,
  },
  bandDark: { borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.1)' },
  // бараан тууз дээр түгжээ бүдэг харагддаг тул цайвар дугуй дээр
  lockChip: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  lockChipDark: { backgroundColor: colors.lavender },
  lock: { transform: [{ scale: 0.6 }] },
  price: { fontFamily: fonts.pixelNum, fontSize: 14 },
  text: { fontFamily: fonts.bold, fontSize: 13, flexShrink: 1 },
  badge: {
    position: 'absolute',
    top: 0,
    alignSelf: 'center',
    height: 22,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.ink,
    backgroundColor: colors.violet,
    justifyContent: 'center',
  },
  badgeText: { fontFamily: fonts.pixelNum, fontSize: 11, color: colors.white },
  name: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 17, color: colors.ink, textAlign: 'center' },
});
