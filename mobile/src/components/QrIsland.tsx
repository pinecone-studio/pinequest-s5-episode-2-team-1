import * as Haptics from 'expo-haptics';
import qrcode from 'qrcode-generator';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Path, Rect } from 'react-native-svg';
import { ColorFade, Sprite } from '@/components/pixel';
import { colors, fonts, halo, radius } from '@/constants/theme';
import type { BgDef, OutfitDef } from '@/lib/pixelBear/catalog';

/** Хавтгай QR-ийн тал (dp) ба stage-ийн өндөр. Арал үед өргөн нь QR × √2 болно. */
const QR = 210;
const STAGE_H = 300;
/** QR-ийн төв stage-ийн дээрээс: арлын дээгүүр баавгай багтана. */
const CENTER_Y = 170;
/** Хар модуль (өвстэй блок)-ийн өндөр ба арлын шороон давхаргын зузаан (dp, арал үед). */
const BLOCK_H = 5;
const SLAB_H = 14;
/** QR-ийн эргэн тойрны цагаан зай (модулиар): уншигч QR-ийг танихад хэрэгтэй. */
const QUIET = 3;
const ROW_OVERLAP = 0.04;

const C = { ground: '#F6F1DE', top: '#2E6B3F', side: '#1D4429', slab: '#B98A55' } as const;

/**
 * Хар модулиудыг мөр бүрт дараалсан хэсгээр нэг path болгоно (олон жижиг дөрвөлжин зурахгүй). Мөр бүр доошоо бага зэрэг
 * (ROW_OVERLAP) давхцана: эргүүлж шахахад anti-aliasing мөр хооронд нарийн зураас гаргадаг.
 */
function qrPath(value: string): { size: number; d: string } {
  const qr = qrcode(0, 'M');
  qr.addData(value);
  qr.make();
  const n = qr.getModuleCount();
  let d = '';
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (!qr.isDark(r, c)) continue;
      let len = 1;
      while (c + len < n && qr.isDark(r, c + len)) len++;
      d += `M${c + QUIET} ${r + QUIET}h${len}v${1 + ROW_OVERLAP}h-${len}z`;
      c += len - 1;
    }
  }
  return { size: n + QUIET * 2, d };
}

/**
 * Профайлын QR "арал" (Instagram-ийн ICQR reel-ийн санаагаар): QR код изометрийн pixel арал болж, баавгай
 * дээр нь зогсоно. Дарахад арал нугарч хавтгай, уншигдах QR болно; дахин дарвал буцна.
 * Изометр = хавтгай QR-ийг 45° эргүүлж, босоогоор хоёр дахин шахсан (affine): QR-ийн давхарга бүр нэг transform-оор
 * хөдөлж, хар модулиуд BLOCK_H-аар өргөгдсөнөөр блок, шороон давхарга SLAB_H-аар доошилсноор арлын зузаан харагдана.
 */
export function QrIsland({
  value,
  bg,
  outfit,
  islandHint,
  qrHint,
  islandLabel,
  qrLabel,
}: {
  value: string;
  bg: BgDef;
  outfit: OutfitDef;
  islandHint: string;
  qrHint: string;
  islandLabel: string;
  qrLabel: string;
}) {
  const { size, d } = useMemo(() => qrPath(value), [value]);
  const reduce = useReducedMotion();
  const [flat, setFlat] = useState(false);
  // 1 = арал, 0 = хавтгай QR
  const p = useSharedValue(1);

  const iso = (lift: number) => {
    'worklet';
    return [{ translateY: lift * p.value }, { scaleY: 1 - 0.5 * p.value }, { rotate: `${45 * p.value}deg` }];
  };
  const slabStyle = useAnimatedStyle(() => ({ transform: iso(SLAB_H) }));
  const groundStyle = useAnimatedStyle(() => ({ transform: iso(0) }));
  const topStyle = useAnimatedStyle(() => ({ transform: iso(-BLOCK_H) }));
  const bearStyle = useAnimatedStyle(() => ({
    opacity: p.value,
    transform: [{ translateY: (1 - p.value) * -40 }, { scale: 0.6 + 0.4 * p.value }],
  }));

  function toggle() {
    const next = !flat;
    setFlat(next);
    p.value = withTiming(next ? 0 : 1, { duration: reduce ? 0 : 650, easing: Easing.inOut(Easing.cubic) });
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  const layer = (fill: string, path: string | null) => (
    <Svg width={QR} height={QR} viewBox={`0 0 ${size} ${size}`}>
      {path === null ? <Rect x={0} y={0} width={size} height={size} fill={fill} /> : <Path d={path} fill={fill} />}
    </Svg>
  );

  return (
    <View style={{ gap: 8 }}>
      <Pressable accessibilityRole="button" accessibilityLabel={flat ? qrLabel : islandLabel} onPress={toggle} style={styles.stage}>
        <ColorFade color={bg.hex} style={StyleSheet.absoluteFill} />
        <ColorFade color={bg.dark ? halo.night : halo.light} style={styles.halo} />
        <Animated.View style={[styles.layer, slabStyle]}>{layer(C.slab, null)}</Animated.View>
        <Animated.View style={[styles.layer, groundStyle]}>{layer(C.ground, null)}</Animated.View>
        <Animated.View style={[styles.layer, groundStyle]}>{layer(C.side, d)}</Animated.View>
        <Animated.View style={[styles.layer, topStyle]}>{layer(C.top, d)}</Animated.View>
        <Animated.View pointerEvents="none" style={[styles.bear, bearStyle]}>
          <Sprite id={outfit.card} />
        </Animated.View>
      </Pressable>
      <Text style={styles.hint}>{flat ? qrHint : islandHint}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { height: STAGE_H, borderRadius: radius.stage, overflow: 'hidden' },
  halo: { position: 'absolute', top: CENTER_Y - 130, left: '50%', marginLeft: -130, width: 260, height: 260, borderRadius: 130 },
  layer: { position: 'absolute', left: '50%', top: CENTER_Y - QR / 2, marginLeft: -QR / 2, width: QR, height: QR },
  // Sprite (82×140)-ийн хөл арлын төвд буухаар (BLOCK_H-аар өргөгдсөн блокууд дээр)
  bear: { position: 'absolute', left: '50%', marginLeft: -41, top: CENTER_Y - 140 + 6 - BLOCK_H },
  hint: { fontFamily: fonts.semibold, fontSize: 13, color: colors.muted, textAlign: 'center' },
});
