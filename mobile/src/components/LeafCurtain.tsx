import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { SheetFrame, SheetLoop } from '@/components/pixel';
import { colors, fonts, radius } from '@/constants/theme';
import room from '@/lib/pixelBear/classroom.json';
import type { SpriteKey } from '@/sprites';
import { useColumnWidth } from '@/hooks/useColumnWidth';

type Kind = (typeof room.branch.kinds)[number];
type Side = 'left' | 'right' | 'top' | 'bottom';

/** scripts/classroom-sprites.ts: хэвтээ (зүүн/баруун захаас) ба 90° эргүүлсэн (дээд/доод захаас) sheet */
const SHEETS: Record<Kind, { h: SpriteKey; v: SpriteKey }> = {
  leaf: { h: 'branch_leaf_1170x756', v: 'branch_leaf_v_756x1170' },
  blossom: { h: 'branch_blossom_1170x756', v: 'branch_blossom_v_756x1170' },
  pine: { h: 'branch_pine_1170x756', v: 'branch_pine_v_756x1170' },
};
const PX = 3;
const LONG = room.branch.frameSize.w * PX;
const SHORT = room.branch.frameSize.h * PX;
/** найгах: 0 → сүүлч → 1 (ping-pong) */
const SWAY = [...Array.from({ length: room.branch.frames }, (_, i) => i), ...Array.from({ length: room.branch.frames - 2 }, (_, i) => room.branch.frames - 2 - i)];
/** хөшиг бүрэн хаагдсаны дараа ядаж ийм удаан (ms) хаалттай байна: хурдан холбогдсон ч навч орж ирээд буцна */
const MIN_SHUT = 2200;
/** номын хуудас эргэх: 0-р frame дээр түр зогсоод (440ms) хуудсаа эргүүлнэ */
const BOOK_LOOP = [0, 0, 0, 0, 1, 2, 3, 4, 5, 6, 7];
/** нээгдэж эхэлснээс мөчрүүд бүрэн гарч дуусах хүртэл (ms) */
const OPEN_MS = 1300;

/** `covered` нь shutAt-д true болж, одоо false болсон бол хөшиг бүрэн нээгдэх агшин (баавгай түүнээс өмнө ярихгүй). */
export const curtainOpenAt = (shutAt: number) => Math.max(Date.now(), shutAt + MIN_SHUT) + OPEN_MS;

/**
 * Мөчир бүр: [аль захаас, төрөл, захын дагуух төв (0–1), дэлгэц рүү хэр гүн орох (0–1), хоцрогдол ms].
 * Дөрвөн захаас ээлжлэн, зүүн/баруун нь сондгой-тэгш мөрөөр шигтгэгдэж дэлгэцийг дүүргэнэ.
 */
const PIECES: [Side, Kind, number, number, number][] = [
  ['left', 'leaf', 0.04, 0.72, 0],
  ['top', 'blossom', 0.2, 0.4, 60],
  ['right', 'pine', 0.14, 0.7, 110],
  ['bottom', 'leaf', 0.78, 0.36, 150],
  ['left', 'pine', 0.27, 0.66, 190],
  ['top', 'leaf', 0.56, 0.34, 230],
  ['right', 'leaf', 0.38, 0.74, 260],
  ['bottom', 'pine', 0.22, 0.34, 300],
  ['left', 'blossom', 0.5, 0.7, 330],
  ['right', 'blossom', 0.62, 0.68, 360],
  ['top', 'pine', 0.86, 0.4, 390],
  ['left', 'leaf', 0.73, 0.74, 420],
  ['bottom', 'blossom', 0.52, 0.3, 440],
  ['right', 'leaf', 0.86, 0.72, 470],
  ['left', 'pine', 0.96, 0.68, 500],
];
/** хамгийн сүүлийн мөчир орж ирж дуусах агшин (ms): хоцрогдол + орох хугацаа (Branch-ийн 720ms) */
const ALL_IN = Math.max(...PIECES.map((p) => p[4])) + 720;

/**
 * Баавгай бэлдэж байх үед (`covered`) утасны дөрвөн захаас янз бүрийн мөчир (навч, сакура, нарс; PixelLab) салхинд
 * найгасаар ээлжлэн орж ирж дэлгэцийг бүрхэнэ; бэлэн болмогц мөчрүүд хойшоо татагдаж захаараа алга болно.
 * «Motion бууруулах» үед гулсалтгүй, найгалтгүй шууд гарч/алга болно.
 * `failed` = холбогдож чадсангүй: MIN_SHUT хүлээлгүй, бүх мөчир орж ирж дуусмагц (ALL_IN) нээнэ; «бэлдэж байна» бичиг шууд
 * алга болно.
 */
export function LeafCurtain({ covered, failed, label }: { covered: boolean; failed?: boolean; label: string }) {
  const reduce = useReducedMotion();
  // мөчир баганын хоёр захаас ургана: өргөн цонхонд ч баганын өргөнөөр
  const width = useColumnWidth();
  const { height } = useWindowDimensions();
  const [closed, setClosed] = useState(false);
  const [tick, setTick] = useState(0);
  const [visible, setVisible] = useState(false);
  const shutAt = useRef(0);
  const shade = useSharedValue(0);

  useEffect(() => {
    if (covered) {
      shutAt.current = Date.now();
      setClosed(true);
      return;
    }
    const t = setTimeout(() => setClosed(false), Math.max(0, shutAt.current + (failed ? ALL_IN : MIN_SHUT) - Date.now()));
    return () => clearTimeout(t);
  }, [covered, failed]);

  useEffect(() => {
    shade.value = reduce ? (closed ? 1 : 0) : withDelay(closed ? 200 : 150, withTiming(closed ? 1 : 0, { duration: 450 }));
    if (closed) {
      setVisible(true);
      return;
    }
    const t = setTimeout(() => setVisible(false), reduce ? 0 : OPEN_MS); // мөчрүүд гарч дууссаны дараа
    return () => clearTimeout(t);
  }, [closed, reduce, shade]);

  useEffect(() => {
    if (!visible || reduce) return;
    const t = setInterval(() => setTick((n) => n + 1), room.branch.duration);
    return () => clearInterval(t);
  }, [visible, reduce]);

  const shadeStyle = useAnimatedStyle(() => ({ opacity: shade.value }));
  if (!visible && !closed) return null;

  return (
    // самбар (zIndex 1)-ын дээр, хаах товчтой дээд мөр (zIndex 3)-ийн доор
    <View style={[StyleSheet.absoluteFill, { zIndex: 2 }]} pointerEvents="none">
      <Animated.View style={[StyleSheet.absoluteFill, styles.shade, shadeStyle]} />
      {PIECES.map(([side, kind, along, depth, delay], i) => (
        <Branch
          key={i}
          side={side}
          kind={kind}
          along={along}
          reach={depth * (side === 'left' || side === 'right' ? width : height)}
          span={side === 'left' || side === 'right' ? height : width}
          delay={delay}
          closed={closed}
          reduce={reduce}
          frame={SWAY[(tick + i * 3) % SWAY.length]}
        />
      ))}
      {failed ? null : (
        <Animated.View style={[styles.chipWrap, shadeStyle]} accessible accessibilityLabel={label} accessibilityLiveRegion="polite">
          <View style={styles.chipShadow} />
          <View style={styles.chip}>
            <SheetLoop id="fx_book_flip_sheet_448x36" frames={8} loop={BOOK_LOOP} ms={110} />
            <Text style={styles.chipText}>
              {label}
              <Dots reduce={reduce} />
            </Text>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

/** «…» ээлжлэн асна (өргөн нь тогтмол: бичиг үсрэхгүй); motion бууруулахад гурвуулаа асаалттай */
function Dots({ reduce }: { reduce: boolean }) {
  const [n, setN] = useState(3);
  useEffect(() => {
    if (reduce) return;
    const t = setInterval(() => setN((v) => (v % 3) + 1), 420);
    return () => clearInterval(t);
  }, [reduce]);
  return [0, 1, 2].map((i) => (
    <Text key={i} style={{ opacity: i < n ? 1 : 0.2 }}>
      .
    </Text>
  ));
}

function Branch({
  side,
  kind,
  along,
  reach,
  span,
  delay,
  closed,
  reduce,
  frame,
}: {
  side: Side;
  kind: Kind;
  along: number;
  /** мөчрийн үзүүр захаас хэдэн dp дотогш орох */
  reach: number;
  /** захын урт (dp) */
  span: number;
  delay: number;
  closed: boolean;
  reduce: boolean;
  frame: number;
}) {
  const shown = useSharedValue(0);
  const across = side === 'left' || side === 'right';
  const sign = side === 'left' || side === 'top' ? -1 : 1; // нуугдах чиглэл
  const hide = reach + 12;

  useEffect(() => {
    // орохдоо хэтрээд буцах (намирах), гарахдаа бага зэрэг дотогш тэнийгээд татагдана
    shown.value = reduce
      ? closed
        ? 1
        : 0
      : withDelay(
          closed ? delay : 500 - delay,
          withTiming(closed ? 1 : 0, closed ? { duration: 720, easing: Easing.out(Easing.back(1.7)) } : { duration: 560, easing: Easing.in(Easing.back(1.9)) }),
        );
  }, [closed, reduce, delay, shown]);

  const move = useAnimatedStyle(() => {
    const d = (1 - shown.value) * hide * sign;
    return { transform: across ? [{ translateX: d }] : [{ translateY: d }] };
  });

  // үзүүр нь захаас `reach` dp-д, үндэс нь дэлгэцийн гадна
  const pos = across
    ? { top: along * span - SHORT / 2, [side]: reach - LONG, width: LONG, height: SHORT }
    : { left: along * span - SHORT / 2, [side]: reach - LONG, width: SHORT, height: LONG };
  // баруун: хэвтээ sheet-ийг толиор, доод: босоо sheet-ийг доош нь эргүүлнэ (үндэс доод захад)
  const flip = side === 'right' ? [{ scaleX: -1 }] : side === 'bottom' ? [{ scaleY: -1 }] : [];

  return (
    <Animated.View style={[styles.piece, pos, move]}>
      <View style={{ transform: flip }}>
        <SheetFrame
          id={SHEETS[kind][across ? 'h' : 'v']}
          frames={room.branch.frames}
          cols={room.branch.columns[across ? 'h' : 'v']}
          frame={frame}
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  shade: { backgroundColor: '#173A22' },
  piece: { position: 'absolute' },
  // pixel товч шиг: шар карт, бараан хүрээ, хатуу сүүдэр, номын хуудас эргэнэ
  chipWrap: { position: 'absolute', alignSelf: 'center', top: '44%' },
  chipShadow: { position: 'absolute', left: 5, top: 6, right: -5, bottom: -6, borderRadius: radius.md, backgroundColor: colors.ink },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingLeft: 10,
    paddingRight: 18,
    borderRadius: radius.md,
    borderWidth: 3,
    borderColor: colors.ink,
    backgroundColor: colors.lemon,
  },
  chipText: { fontFamily: fonts.pixel, fontSize: 19, color: colors.ink },
});
