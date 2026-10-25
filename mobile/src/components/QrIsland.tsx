import * as Haptics from 'expo-haptics';
import qrcode from 'qrcode-generator';
import { type ComponentProps, type ReactNode, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, Extrapolation, interpolate, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Path, Polygon, Rect } from 'react-native-svg';
import { ColorFade, Motion } from '@/components/pixel';
import { colors, fonts, halo, radius } from '@/constants/theme';
import type { BgDef } from '@/lib/pixelBear/catalog';

/** Хавтгай QR-ийн тал (dp) ба stage-ийн өндөр. Арал үед өргөн нь QR × √2 болно. */
const QR = 210;
const STAGE_H = 300;
/** QR-ийн төв stage-ийн дээрээс: арлын дээгүүр мод багтана. */
const CENTER_Y = 170;
/** Хар модуль (өвстэй блок)-ийн өндөр ба арлын шороон давхаргын зузаан (dp, арал үед). */
const BLOCK_H = 5;
const SLAB_H = 14;
/** QR-ийн эргэн тойрны цагаан зай (модулиар): уншигч QR-ийг танихад хэрэгтэй. */
const QUIET = 3;
const ROW_OVERLAP = 0.04;

const C = { ground: '#F6F1DE', top: '#2E6B3F', side: '#1D4429', slab: '#B98A55' } as const;

type AnimatedViewStyle = ComponentProps<typeof Animated.View>['style'];

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

/** Модны воксел: дээд талын ромбын өргөн (өндөр нь хагас), хажуугийн өндөр, дэлгэц дээрх томруулалт. */
const VOXEL_W = 14;
const VOXEL_H = 9;
const TREE_SCALE = 1.25;
/** Воксел бүрийн [дээд, зүүн, баруун] талын өнгө: гэрэл зүүн дээрээс. */
const FACES = {
  trunk: ['#9A6A3E', '#7A4F2B', '#5E3B20'],
  leaf: ['#5DB563', '#45934C', '#357A3C'],
  light: ['#7DCB6A', '#62AE52', '#4E9443'],
} as const;

/**
 * Изометрийн воксел мод (их бие 3 блок, дээр нь 5 давхар бөөрөнхий титэм) нэг SVG-д. x, y нь газрын тор (+x баруун доош, +y зүүн
 * доош), z нь өндөр. Ар талаас урагш (x + y), доороос дээш (z) дарааллаар зурснаар урд блок хойдохоо далдална.
 */
const TREE = (() => {
  const voxels: [number, number, number, keyof typeof FACES][] = [];
  for (let z = 0; z < 3; z++) voxels.push([0, 0, z, 'trunk']);
  // r = титмийн давхаргын радиус: |x| + |y| <= r бол навч (r = 3 нь буланг тайрсан 5×5)
  const crown = (z: number, r: number) => {
    for (let x = -2; x <= 2; x++) {
      for (let y = -2; y <= 2; y++) {
        if (Math.abs(x) + Math.abs(y) <= r) voxels.push([x, y, z, (x + 2 * y + z + 12) % 3 === 0 ? 'light' : 'leaf']);
      }
    }
  };
  crown(3, 2);
  crown(4, 3);
  crown(5, 3);
  crown(6, 2);
  crown(7, 1);
  voxels.sort((a, b) => a[0] + a[1] - (b[0] + b[1]) || a[2] - b[2]);

  const w = VOXEL_W / 2;
  const q = VOXEL_W / 4;
  const h = VOXEL_H;
  const polys: { points: string; fill: string }[] = [];
  let minX = 0, maxX = 0, minY = 0, maxY = 0;
  for (const [x, y, z, kind] of voxels) {
    // дээд талын төв; (0, 0) = их биеийн газарт хүрэх цэг
    const cx = (x - y) * w;
    const cy = (x + y) * q - (z + 1) * h;
    const [top, left, right] = FACES[kind];
    polys.push(
      { points: `${cx},${cy - q} ${cx + w},${cy} ${cx},${cy + q} ${cx - w},${cy}`, fill: top },
      { points: `${cx - w},${cy} ${cx},${cy + q} ${cx},${cy + q + h} ${cx - w},${cy + h}`, fill: left },
      { points: `${cx + w},${cy} ${cx},${cy + q} ${cx},${cy + q + h} ${cx + w},${cy + h}`, fill: right },
    );
    minX = Math.min(minX, cx - w);
    maxX = Math.max(maxX, cx + w);
    minY = Math.min(minY, cy - q);
    maxY = Math.max(maxY, cy + q + h);
  }
  const vw = maxX - minX;
  const vh = maxY - minY;
  return {
    polys,
    viewBox: `${minX} ${minY} ${vw} ${vh}`,
    width: vw * TREE_SCALE,
    height: vh * TREE_SCALE,
    // их биеийн газарт хүрэх цэг (мод доошоо хураагдах төв)
    baseX: -minX * TREE_SCALE,
    baseY: -minY * TREE_SCALE,
  };
})();

function VoxelTree() {
  return (
    <Svg width={TREE.width} height={TREE.height} viewBox={TREE.viewBox}>
      {TREE.polys.map((p, i) => (
        // ижил өнгийн нимгэн хүрээ: хөрш блокуудын хооронд anti-aliasing-ийн зураас гаргахгүй
        <Polygon key={i} points={p.points} fill={p.fill} stroke={p.fill} strokeWidth={0.4} strokeLinejoin="round" />
      ))}
    </Svg>
  );
}

/**
 * Профайлын QR "арал" (Instagram-ийн ICQR reel-ийн санаагаар): QR код изометрийн pixel арал болж, голд нь воксел мод
 * ургана. Дарахад камер модны дээгүүр гарч доош харсан мэт: мод, блокуудын өндөр хураагдаж, арал эргэж хавтгай,
 * уншигдах QR болно. Дахин дарвал буцна.
 *
 * Изометр = хавтгай QR-ийг 45° эргүүлж, босоогоор хоёр дахин шахсан. Эргүүлэх (дотор view), шахах (гадна view) хоёрыг
 * тусад нь хийнэ: нэг view дээр хамт байвал налуу (skew) үүсдэг, Android үүнийг хаяж арлыг энгийн эргэсэн дөрвөлжин
 * болгодог. Хар модулиуд BLOCK_H-аар өргөгдсөнөөр блок, шороон давхарга SLAB_H-аар доошилсноор арлын зузаан харагдана.
 */
export function QrIsland({
  value,
  bg,
  islandHint,
  qrHint,
  islandLabel,
  qrLabel,
}: {
  value: string;
  bg: BgDef;
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

  const spin = useAnimatedStyle(() => ({ transform: [{ rotate: `${45 * p.value}deg` }] }));
  const slabStyle = useAnimatedStyle(() => ({ transform: [{ translateY: SLAB_H * p.value }, { scaleY: 1 - 0.5 * p.value }] }));
  const groundStyle = useAnimatedStyle(() => ({ transform: [{ scaleY: 1 - 0.5 * p.value }] }));
  const topStyle = useAnimatedStyle(() => ({ transform: [{ translateY: -BLOCK_H * p.value }, { scaleY: 1 - 0.5 * p.value }] }));
  // Мод арлаас түрүүлж хураагдана: QR болох үед ул мөр үлдэхгүй
  const shadowStyle = useAnimatedStyle(() => ({ opacity: interpolate(p.value, [0.3, 0.55], [0, 1], Extrapolation.CLAMP) }));
  const treeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(p.value, [0.3, 0.55], [0, 1], Extrapolation.CLAMP),
    transform: [{ translateY: BLOCK_H * (1 - p.value) }, { scaleY: interpolate(p.value, [0.3, 1], [0, 1], Extrapolation.CLAMP) }],
  }));

  function toggle() {
    const next = !flat;
    setFlat(next);
    p.value = withTiming(next ? 0 : 1, { duration: reduce ? 0 : 750, easing: Easing.inOut(Easing.cubic) });
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  const layer = (squash: AnimatedViewStyle, art: ReactNode, extra?: AnimatedViewStyle) => (
    <Animated.View style={[styles.layer, squash, extra]}>
      <Animated.View style={spin}>
        <Svg width={QR} height={QR} viewBox={`0 0 ${size} ${size}`}>
          {art}
        </Svg>
      </Animated.View>
    </Animated.View>
  );

  return (
    <View style={{ gap: 8 }}>
      <Pressable accessibilityRole="button" accessibilityLabel={flat ? qrLabel : islandLabel} onPress={toggle} style={styles.stage}>
        <ColorFade color={bg.hex} style={StyleSheet.absoluteFill} />
        <ColorFade color={bg.dark ? halo.night : halo.light} style={styles.halo} />
        {layer(slabStyle, <Rect x={0} y={0} width={size} height={size} fill={C.slab} />)}
        {layer(groundStyle, <Rect x={0} y={0} width={size} height={size} fill={C.ground} />)}
        {layer(groundStyle, <Path d={d} fill={C.side} />)}
        {layer(topStyle, <Path d={d} fill={C.top} />)}
        {layer(topStyle, <Circle cx={size * 0.53} cy={size / 2} r={size * 0.12} fill="#000" opacity={0.2} />, shadowStyle)}
        <Animated.View pointerEvents="none" style={[styles.tree, treeStyle]}>
          <Motion preset="saplingSway" originBottom>
            <VoxelTree />
          </Motion>
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
  // Их биеийн газарт хүрэх цэг арлын төвд (BLOCK_H-аар өргөгдсөн блокууд дээр) буухаар
  tree: {
    position: 'absolute',
    left: '50%',
    marginLeft: -TREE.baseX,
    top: CENTER_Y - BLOCK_H - TREE.baseY,
    transformOrigin: `${(TREE.baseX / TREE.width) * 100}% ${(TREE.baseY / TREE.height) * 100}%`,
  },
  hint: { fontFamily: fonts.semibold, fontSize: 13, color: colors.muted, textAlign: 'center' },
});
