import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { PressScale } from '@/components/pixel';
import { colors, fonts } from '@/constants/theme';
import { S } from '@/i18n/strings';
import { BundleBag } from './BundleBag';
import { wood, woodPill } from './wood';

interface Bundle {
  qty: number;
  price: string;
  /** уутны зурвасын өнгө; олон бол солонго */
  band: string[];
}

export const BUNDLES: Bundle[] = [
  { qty: 100, price: '4 900₮', band: ['#B07A4A'] },
  { qty: 300, price: '12 900₮', band: ['#9C6A3C'] },
  { qty: 500, price: '19 900₮', band: ['#F2C531'] },
  { qty: 700, price: '26 900₮', band: ['#5B57E0'] },
  { qty: 1000, price: '34 900₮', band: ['#F25C5C', '#F2A93B', '#F2E33B', '#5FD35F', '#4FA8F2', '#9B5CF2'] },
];

/** 3 + 2 багана уут, доор нь үнийн товч. Төлбөр холбогдоогүй тул дарахад мэдэгдэл гарна. */
export function BundleGrid() {
  const [notice, setNotice] = useState(false);
  const rows = [BUNDLES.slice(0, 3), BUNDLES.slice(3)];

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
      {rows.map((row, r) => (
        <View key={r} style={styles.row}>
          {row.map((b) => (
            <PressScale key={b.qty} accessibilityRole="button" accessibilityLabel={S.pinecones.bundleLabel(b.qty, b.price)} onPress={pick} style={styles.bundle}>
              <BundleBag qty={b.qty} band={b.band} />
              <View style={styles.price}>
                <Text style={styles.priceText} numberOfLines={1} adjustsFontSizeToFit>
                  {b.price}
                </Text>
              </View>
            </PressScale>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingTop: 34, gap: 28 },
  row: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  bundle: { flex: 1, maxWidth: 124, alignItems: 'center', gap: 10 },
  price: { ...woodPill, alignSelf: 'stretch', paddingHorizontal: 6, backgroundColor: wood.mint },
  priceText: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink },
  notice: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 20, color: colors.ink, textAlign: 'center', paddingHorizontal: 12 },
});
