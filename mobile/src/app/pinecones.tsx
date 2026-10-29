import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Rect } from 'react-native-svg';
import { Enter, PressScale, Sprite } from '@/components/pixel';
import { formatNumber } from '@/components/StatPill';
import { colors, fonts } from '@/constants/theme';
import { S } from '@/i18n/strings';
import { usePixelBear } from '@/lib/mock/pixelBear';
import { goBack } from '@/lib/nav';
import type { SpriteKey } from '@/sprites';

/** Модон лангууны өнгө (энэ дэлгэцэд л) */
const wood = {
  bg: '#FFB676',
  light: '#C98A4E',
  dark: '#A8652F',
  edge: '#3A2316',
  floor: '#A86A3C',
  sign: '#4C7A5C',
  signInk: '#F3E08A',
  pill: '#FFF6CF',
  desc: '#9A6A3E',
  mint: '#7CF7C8',
} as const;

const EARN_ICON: Record<string, SpriteKey> = { correct: 'icon_star_36x36', chest: 'map_chest_40x30', duel: 'nav2_crew_on_30x30' };

interface Bundle {
  qty: number;
  price: string;
  /** уутны дээд, доод зурвасын өнгө; олон бол солонго */
  band: string[];
}
const BUNDLES: Bundle[] = [
  { qty: 100, price: '4 900₮', band: ['#B07A4A'] },
  { qty: 300, price: '12 900₮', band: ['#9C6A3C'] },
  { qty: 500, price: '19 900₮', band: ['#F2C531'] },
  { qty: 700, price: '26 900₮', band: ['#5B57E0'] },
  { qty: 1000, price: '34 900₮', band: ['#F25C5C', '#F2A93B', '#F2E33B', '#5FD35F', '#4FA8F2', '#9B5CF2'] },
];

/** Босоо модон банз + доод талын шүдлэг ирмэг (pixel). */
function WoodStripes({ width, height }: { width: number; height: number }) {
  const W = 22;
  const n = Math.ceil(width / W) + 1;
  return (
    <Svg width={width} height={height + 10} style={StyleSheet.absoluteFill}>
      {Array.from({ length: n }, (_, i) => (
        <Rect key={i} x={i * W} y={0} width={W} height={height} fill={i % 2 ? wood.light : wood.dark} />
      ))}
      {Array.from({ length: n }, (_, i) => (
        <Rect key={`t${i}`} x={i * W} y={height - 2} width={W} height={i % 3 === 1 ? 10 : 5} fill={i % 2 ? wood.light : wood.dark} />
      ))}
      {Array.from({ length: n }, (_, i) => (
        <Rect key={`e${i}`} x={i * W} y={height + (i % 3 === 1 ? 8 : 3)} width={W} height={3} fill={wood.edge} />
      ))}
    </Svg>
  );
}

/** Ногоон модон самбар дээрх pixel гарчиг. */
function Sign({ text, size }: { text: string; size: 'lg' | 'sm' }) {
  const lg = size === 'lg';
  return (
    <View style={[styles.signOuter, lg ? styles.signLg : styles.signSm]}>
      <View style={styles.signInner}>
        <Text style={[styles.signText, { fontSize: lg ? 34 : 22, lineHeight: lg ? 40 : 26 }]}>{text}</Text>
      </View>
    </View>
  );
}

/** Pixel уут: дээд зурвас, цагаан бие дээр боргоцой, доод зурвас, тооны тэмдэг. */
function BundleBag({ bundle }: { bundle: Bundle }) {
  const P = 5; // нэг pixel
  const cols = 18;
  const band = (x: number) => bundle.band[Math.floor((x / cols) * bundle.band.length)];
  return (
    <View style={{ width: cols * P + 24, height: 17 * P + 10 }}>
      <Svg width={cols * P} height={17 * P}>
        {/* дээд зурвас: шүдлэг ирмэг */}
        {Array.from({ length: cols }, (_, x) => (
          <Rect key={`b${x}`} x={x * P} y={x % 2 ? P : 0} width={P} height={x % 2 ? 3 * P : 4 * P} fill={band(x)} />
        ))}
        <Rect x={0} y={4 * P} width={cols * P} height={P / 2} fill={wood.edge} opacity={0.35} />
        {/* бие */}
        <Rect x={0} y={4 * P} width={(cols - 3) * P} height={10 * P} fill={colors.white} />
        <Rect x={(cols - 3) * P} y={2 * P} width={3 * P} height={12 * P} fill="#D9D9D9" />
        {/* доод зурвас */}
        {Array.from({ length: cols }, (_, x) => (
          <Rect key={`f${x}`} x={x * P} y={14 * P} width={P} height={2 * P} fill={band(x)} />
        ))}
        {/* хүрээ */}
        <Rect x={0} y={16 * P} width={cols * P} height={P} fill={wood.edge} />
        <Rect x={0} y={P} width={P / 2} height={15 * P} fill={wood.edge} />
        <Rect x={cols * P - P / 2} y={0} width={P / 2} height={16 * P} fill={wood.edge} />
      </Svg>
      <Sprite id="btn_honey_36x36" style={styles.bagCone} />
      <View style={styles.qty}>
        <Text style={styles.qtyText}>{bundle.qty}</Text>
      </View>
    </View>
  );
}

/**
 * Боргоцой: модон лангуу маягийн дэлгэц. Дээр нь боргоцой олох арга замууд (дарахад тухайн хэсэг рүү очно), доор нь
 * мөнгөөр авах багцууд. Төлбөр хараахан холбогдоогүй тул багц дарахад мэдэгдэл гарна.
 */
export default function PineconesScreen() {
  const bear = usePixelBear();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [notice, setNotice] = useState(false);
  const headH = insets.top + 150;

  function pick() {
    void Haptics.selectionAsync();
    setNotice(true);
  }

  const bagRows = [BUNDLES.slice(0, 3), BUNDLES.slice(3)];

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        <View style={[styles.head, { height: headH }]}>
          <WoodStripes width={width} height={headH} />
          <PressScale accessibilityRole="button" accessibilityLabel={S.common.back} onPress={() => goBack('/shop')} style={[styles.back, { top: insets.top + 8 }]}>
            <View style={styles.backInner}>
              <Text style={styles.backGlyph}>←</Text>
            </View>
          </PressScale>
          <View accessibilityRole="header" accessibilityLabel={S.pinecones.open} style={styles.titleWrap}>
            <Sign text={S.pinecones.title} size="lg" />
          </View>
        </View>

        <View style={styles.list}>
          {S.pinecones.earn.map((e, i) => (
            <Enter key={e.key} index={i}>
              <PressScale accessibilityRole="button" accessibilityLabel={`${e.title}. ${e.desc} ${e.reward}`} onPress={() => router.push(e.to)} style={styles.earnRow}>
                <View style={{ flex: 1, gap: 4 }}>
                  <View style={styles.earnHead}>
                    <View style={styles.earnIcon}>
                      <Sprite id={EARN_ICON[e.key]} style={{ transform: [{ scale: 0.8 }] }} />
                    </View>
                    <Text style={styles.earnTitle}>{e.title}</Text>
                  </View>
                  <Text style={styles.earnDesc}>{e.desc}</Text>
                </View>
                <View style={styles.reward}>
                  <Sprite id="btn_honey_24x24" />
                  <Text style={styles.rewardText}>{e.reward}</Text>
                </View>
              </PressScale>
            </Enter>
          ))}
        </View>

        <View style={styles.shelf}>
          <WoodStripes width={width - 24} height={46} />
          <View style={styles.shelfSign}>
            <Sign text={S.pinecones.bundles} size="sm" />
          </View>
        </View>

        <View style={styles.bundles}>
          {notice ? (
            <Animated.Text entering={FadeIn} accessibilityLiveRegion="polite" style={styles.notice}>
              {S.pinecones.payingSoon}
            </Animated.Text>
          ) : null}
          {bagRows.map((row, r) => (
            <View key={r} style={styles.bagRow}>
              {row.map((b) => (
                <PressScale key={b.qty} accessibilityRole="button" accessibilityLabel={S.pinecones.bundleLabel(b.qty, b.price)} onPress={pick} style={styles.bundle}>
                  <BundleBag bundle={b} />
                  <View style={styles.priceBtn}>
                    <Text style={styles.priceText} numberOfLines={1} adjustsFontSizeToFit>
                      {b.price}
                    </Text>
                  </View>
                </PressScale>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={[styles.floor, { paddingBottom: insets.bottom + 14 }]} accessible accessibilityLabel={`${S.pinecones.balance}: ${formatNumber(bear.honey)}`}>
        <Sprite id="btn_honey_36x36" />
        <Text style={styles.floorNum}>{formatNumber(bear.honey)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: wood.bg },
  head: { alignItems: 'center', marginBottom: 22 },
  back: { position: 'absolute', left: 16 },
  backInner: { width: 60, height: 46, backgroundColor: wood.sign, borderWidth: 4, borderColor: wood.edge, alignItems: 'center', justifyContent: 'center' },
  backGlyph: { fontFamily: fonts.pixel, fontSize: 26, lineHeight: 30, color: wood.signInk },
  titleWrap: { flex: 1, justifyContent: 'flex-end', paddingBottom: 26 },
  signOuter: { backgroundColor: wood.edge, borderRadius: 999, padding: 5 },
  signLg: { minWidth: 230 },
  signSm: { minWidth: 160 },
  signInner: { backgroundColor: wood.sign, borderRadius: 999, borderWidth: 3, borderColor: '#2E4A38', paddingHorizontal: 28, paddingVertical: 8, alignItems: 'center' },
  signText: { fontFamily: fonts.pixel, color: wood.signInk, letterSpacing: 2, textShadowColor: wood.edge, textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 0 },
  list: { paddingHorizontal: 22, gap: 26 },
  earnRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  earnHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  earnIcon: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  earnTitle: { fontFamily: fonts.bold, fontSize: 18, color: colors.ink },
  earnDesc: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 20, color: wood.desc },
  reward: {
    minWidth: 76,
    height: 44,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: colors.ink,
    backgroundColor: wood.pill,
    shadowColor: wood.edge,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 0,
    elevation: 3,
  },
  rewardText: { fontFamily: fonts.pixelNum, fontSize: 16, color: colors.ink },
  shelf: { height: 56, marginTop: 34, marginHorizontal: 12, alignItems: 'center', justifyContent: 'center', borderTopWidth: 4, borderColor: wood.edge },
  shelfSign: { position: 'absolute', top: 4 },
  bundles: { paddingHorizontal: 16, paddingTop: 34, gap: 28 },
  bagRow: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  bundle: { flex: 1, maxWidth: 124, alignItems: 'center', gap: 10 },
  bagCone: { position: 'absolute', left: 19, top: 27 },
  qty: { position: 'absolute', right: 0, bottom: 0, minWidth: 54, height: 30, paddingHorizontal: 8, borderRadius: 15, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  qtyText: { fontFamily: fonts.pixelNum, fontSize: 14, color: colors.white },
  priceBtn: {
    alignSelf: 'stretch',
    height: 44,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: colors.ink,
    backgroundColor: wood.mint,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    shadowColor: wood.edge,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 0,
    elevation: 3,
  },
  priceText: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink },
  notice: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 20, color: colors.ink, textAlign: 'center', paddingHorizontal: 12 },
  floor: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 10, paddingTop: 14, paddingHorizontal: 22, backgroundColor: wood.floor, borderTopWidth: 4, borderColor: wood.edge },
  floorNum: { fontFamily: fonts.pixelNum, fontSize: 22, color: colors.white },
});
