import { StyleSheet, Text, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { Sprite } from '@/components/pixel';
import { colors, fonts } from '@/constants/theme';
import { wood } from './wood';

/** нэг pixel (dp) ба уутны өргөн (pixel) */
const P = 5;
const COLS = 18;

/** Pixel уут: шүдлэг дээд зурвас, цагаан бие дээр боргоцой, доод зурвас, тооны тэмдэг. `band` олон өнгөтэй бол солонго. */
export function BundleBag({ qty, band }: { qty: number; band: string[] }) {
  const color = (x: number) => band[Math.floor((x / COLS) * band.length)];
  const xs = Array.from({ length: COLS }, (_, x) => x);
  return (
    <View style={styles.wrap}>
      <Svg width={COLS * P} height={17 * P}>
        {xs.map((x) => (
          <Rect key={`t${x}`} x={x * P} y={x % 2 ? P : 0} width={P} height={(x % 2 ? 3 : 4) * P} fill={color(x)} />
        ))}
        <Rect x={0} y={4 * P} width={(COLS - 3) * P} height={10 * P} fill={colors.white} />
        <Rect x={(COLS - 3) * P} y={2 * P} width={3 * P} height={12 * P} fill="#D9D9D9" />
        {xs.map((x) => (
          <Rect key={`b${x}`} x={x * P} y={14 * P} width={P} height={2 * P} fill={color(x)} />
        ))}
        <Rect x={0} y={16 * P} width={COLS * P} height={P} fill={wood.edge} />
        <Rect x={0} y={P} width={P / 2} height={15 * P} fill={wood.edge} />
        <Rect x={COLS * P - P / 2} y={0} width={P / 2} height={16 * P} fill={wood.edge} />
      </Svg>
      <Sprite id="btn_honey_36x36" style={styles.cone} />
      <View style={styles.qty}>
        <Text style={styles.qtyText}>{qty}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: COLS * P + 24, height: 17 * P + 10 },
  // цагаан биеийн голд (бие: 15×10 pixel, 4-р мөрөөс)
  cone: { position: 'absolute', left: (15 * P - 36) / 2, top: 4 * P + (10 * P - 36) / 2 },
  qty: { position: 'absolute', right: 0, bottom: 0, minWidth: 54, height: 30, paddingHorizontal: 8, borderRadius: 15, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  qtyText: { fontFamily: fonts.pixelNum, fontSize: 14, color: colors.white },
});
