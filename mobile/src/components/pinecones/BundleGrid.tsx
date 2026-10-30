import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Motion, PressScale, Sprite } from '@/components/pixel';
import { colors, fonts } from '@/constants/theme';
import { S } from '@/i18n/strings';
import type { SpriteKey } from '@/sprites';
import { PixelText } from './PixelText';
import { PixelBox } from './PixelBox';
import { wood } from './wood';

interface Bundle {
  qty: number;
  price: string;
  /** багц томрох тусам зураг нь дүүрнэ: уут → шуудай → сагс → хайрцаг → эрдэнэсийн авдар */
  sprite: SpriteKey;
}

export const BUNDLES: Bundle[] = [
  { qty: 100, price: '4 900₮', sprite: 'bundle_pouch_36x58' },
  { qty: 300, price: '12 900₮', sprite: 'bundle_sack_70x72' },
  { qty: 500, price: '19 900₮', sprite: 'bundle_basket_68x80' },
  { qty: 700, price: '26 900₮', sprite: 'bundle_crate_72x86' },
  { qty: 1000, price: '34 900₮', sprite: 'bundle_chest_76x76' },
];

/** Хамгийн том (нэгж үнээрээ хамгийн хямд) багц дээд талд өргөн карт, бусад нь 2×2. Төлбөр холбогдоогүй тул дарахад мэдэгдэл гарна. */
export function BundleGrid() {
  const [notice, setNotice] = useState(false);
  const best = BUNDLES[BUNDLES.length - 1];
  const rest = BUNDLES.slice(0, -1);

  function pick() {
    void Haptics.selectionAsync();
    setNotice(true);
  }

  return (
    <View style={styles.wrap}>
      {notice ? (
        <Animated.Text entering={FadeIn} accessibilityLiveRegion="polite" style={styles.notice}>
          {S.pinecones.payingSoon}
        </Animated.Text>
      ) : null}

      <PressScale accessibilityRole="button" accessibilityLabel={`${S.pinecones.best}. ${S.pinecones.bundleLabel(best.qty, best.price)}`} onPress={pick}>
        <PixelBox fill={wood.glow} edge={wood.edge} radius={3} shadow={[0, 2]} style={[styles.card, styles.best]}>
          <View style={styles.ribbon}>
            <PixelBox fill={wood.sign} edge={wood.edge} radius={2} style={styles.ribbonBox}>
              <PixelText text={S.pinecones.best} px={2} color={wood.signInk} shadow={wood.edge} />
            </PixelBox>
          </View>
          <Motion preset="float" style={styles.bestArt}>
            <Sprite id={best.sprite} />
          </Motion>
          <View style={styles.bestBody}>
            <Qty n={best.qty} big />
            <Price text={best.price} />
          </View>
        </PixelBox>
      </PressScale>

      <View style={styles.grid}>
        {rest.map((b) => (
          <PressScale key={b.qty} accessibilityRole="button" accessibilityLabel={S.pinecones.bundleLabel(b.qty, b.price)} onPress={pick} style={styles.cell}>
            <PixelBox fill={wood.card} edge={wood.edge} radius={3} shadow={[0, 2]} style={[styles.card, styles.fill]}>
              <View style={styles.art}>
                <Sprite id={b.sprite} />
              </View>
              <Qty n={b.qty} />
              <Price text={b.price} />
            </PixelBox>
          </PressScale>
        ))}
      </View>
    </View>
  );
}

function Qty({ n, big }: { n: number; big?: boolean }) {
  return (
    <View style={styles.qty}>
      <Sprite id={big ? 'btn_honey_30x30' : 'btn_honey_24x24'} />
      <Text style={[styles.qtyText, big && styles.qtyBig]}>{n}</Text>
    </View>
  );
}

function Price({ text }: { text: string }) {
  return (
    <PixelBox fill={wood.mint} edge={colors.ink} radius={3} shadow={[1, 1]} shadowColor={wood.shade} style={styles.price}>
      <Text style={styles.priceText} numberOfLines={1} adjustsFontSizeToFit>
        {text}
      </Text>
    </PixelBox>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingTop: 28, gap: 16 },
  card: { alignItems: 'center', padding: 12, gap: 8 },
  fill: { flex: 1 },
  best: { flexDirection: 'row', gap: 14, paddingTop: 24 },
  ribbon: { position: 'absolute', top: -15, left: 0, right: 0, alignItems: 'center' },
  ribbonBox: { paddingHorizontal: 9, paddingVertical: 6 },
  bestArt: { width: 104, alignItems: 'center' },
  bestBody: { flex: 1, gap: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  cell: { width: '47%', flexGrow: 1 },
  art: { height: 86, justifyContent: 'flex-end' },
  qty: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  qtyText: { fontFamily: fonts.pixelNum, fontSize: 18, color: colors.ink },
  qtyBig: { fontSize: 26 },
  price: { height: 45, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  priceText: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink },
  notice: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 20, color: colors.ink, textAlign: 'center', paddingHorizontal: 12 },
});
