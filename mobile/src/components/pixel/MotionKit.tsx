import { type ReactNode, useEffect, useRef, useState } from 'react';
import { Pressable, type PressableProps, type StyleProp, Text, type TextStyle, View, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';
import type { SpriteKey } from '@/sprites';
import { Sprite } from './Sprite';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Дарахад spring-ээр бага зэрэг шахагдаж, буцаж үсэрдэг Pressable (товч, карт, swatch).
 * `style` нь энгийн style (function биш).
 */
export function PressScale({
  style,
  children,
  scaleTo = 0.95,
  ...props
}: Omit<PressableProps, 'style' | 'children'> & { style?: StyleProp<ViewStyle>; children?: ReactNode; scaleTo?: number }) {
  const reduce = useReducedMotion();
  const s = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <AnimatedPressable
      {...props}
      onPressIn={(e) => {
        if (!reduce) s.value = withSpring(scaleTo, { damping: 15, stiffness: 400 });
        props.onPressIn?.(e);
      }}
      onPressOut={(e) => {
        s.value = withSpring(1, { damping: 9, stiffness: 260 });
        props.onPressOut?.(e);
      }}
      style={[style, animated]}
    >
      {children}
    </AnimatedPressable>
  );
}

/** Дэвсгэр өнгийг 0.35с-д зөөлөн шилжүүлнэ (DESIGN.md §6 "Stage bg color change"). */
export function ColorFade({ color, style, children }: { color: string; style?: StyleProp<ViewStyle>; children?: ReactNode }) {
  const reduce = useReducedMotion();
  const prev = useRef(color);
  const from = useSharedValue(color);
  const to = useSharedValue(color);
  const t = useSharedValue(1);
  useEffect(() => {
    if (prev.current === color) return;
    from.value = prev.current;
    to.value = color;
    prev.current = color;
    if (reduce) {
      t.value = 1;
      return;
    }
    t.value = 0;
    t.value = withTiming(1, { duration: 350, easing: Easing.out(Easing.quad) });
  }, [color, reduce, from, to, t]);
  const animated = useAnimatedStyle(() => ({ backgroundColor: interpolateColor(t.value, [0, 1], [from.value, to.value]) }));
  return <Animated.View style={[style, animated]}>{children}</Animated.View>;
}

/** `trigger` өөрчлөгдөх бүрт spring-ээр "pop" хийнэ (баавгай солигдох, зөв хариулт, nav icon). */
export function Pop({
  trigger,
  children,
  style,
  from = 0.82,
}: {
  trigger: unknown;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  from?: number;
}) {
  const reduce = useReducedMotion();
  const s = useSharedValue(1);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (reduce) return;
    s.value = from;
    s.value = withSpring(1, { damping: 8, stiffness: 220 });
  }, [trigger, reduce, from, s]);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return <Animated.View style={[style, animated]}>{children}</Animated.View>;
}

/** `trigger` өөрчлөгдөх бүрт хэвтээ чиглэлд сэгсэрнэ (буруу хариулт). */
export function Shake({ trigger, children, style }: { trigger: unknown; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const reduce = useReducedMotion();
  const x = useSharedValue(0);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (reduce || !trigger) return;
    const d = 55;
    x.value = withSequence(
      withTiming(-10, { duration: d }),
      withTiming(10, { duration: d }),
      withTiming(-7, { duration: d }),
      withTiming(7, { duration: d }),
      withTiming(-3, { duration: d }),
      withTiming(0, { duration: d }),
    );
  }, [trigger, reduce, x]);
  const animated = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  return <Animated.View style={[style, animated]}>{children}</Animated.View>;
}

/** Өргөнийг (0–1) зөөлөн гулсуулж өөрчилдөг явцын зурвас. */
export function AnimatedBar({
  value,
  color,
  height,
  style,
}: {
  value: number;
  color: string;
  height: number;
  style?: StyleProp<ViewStyle>;
}) {
  const reduce = useReducedMotion();
  const w = useSharedValue(value);
  useEffect(() => {
    w.value = reduce ? value : withSpring(value, { damping: 18, stiffness: 140 });
  }, [value, reduce, w]);
  const animated = useAnimatedStyle(() => ({ width: `${Math.max(0, Math.min(1, w.value)) * 100}%` }));
  return <Animated.View style={[{ height, borderRadius: height / 2, backgroundColor: color }, style, animated]} />;
}

/** 0-ээс `value` хүртэл тоолж гүйдэг тоо (шагналын дэлгэц). */
export function CountUp({
  value,
  style,
  prefix = '',
  suffix = '',
  duration = 900,
  delay = 0,
}: {
  value: number;
  style?: StyleProp<TextStyle>;
  prefix?: string;
  suffix?: string;
  duration?: number;
  delay?: number;
}) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(reduce ? value : 0);
  useEffect(() => {
    if (reduce) {
      setShown(value);
      return;
    }
    let raf = 0;
    let start = 0;
    const timer = setTimeout(() => {
      const tick = (t: number) => {
        if (!start) start = t;
        const k = Math.min(1, (t - start) / duration);
        const eased = 1 - (1 - k) ** 3;
        setShown(Math.round(value * eased));
        if (k < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, delay);
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
  }, [value, duration, delay, reduce]);
  return (
    <Text style={style} accessibilityLabel={`${prefix}${value}${suffix}`}>
      {prefix}
      {shown}
      {suffix}
    </Text>
  );
}

/** Доороос дээш хөвж, бүдгэрэн алга болох pixel icon-ууд (шагнал: зүрх, зөгийн бал). */
export function Rising({ sprite, left, bottom, delay = 0, distance = 120, duration = 2600 }: {
  sprite: SpriteKey;
  left: number | `${number}%`;
  bottom: number;
  delay?: number;
  distance?: number;
  duration?: number;
}) {
  const reduce = useReducedMotion();
  const p = useSharedValue(0);
  useEffect(() => {
    if (reduce) return;
    p.value = withDelay(delay, withRepeat(withTiming(1, { duration, easing: Easing.out(Easing.quad) }), -1, false));
  }, [reduce, delay, duration, p]);
  const animated = useAnimatedStyle(() => ({
    opacity: interpolate(p.value, [0, 0.15, 0.75, 1], [0, 1, 1, 0]),
    transform: [{ translateY: -distance * p.value }, { translateX: interpolate(p.value, [0, 0.5, 1], [0, 8, -4]) }],
  }));
  if (reduce) return null;
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left, bottom }, animated]}>
      <Sprite id={sprite} />
    </Animated.View>
  );
}

/** Дэлгэц нээгдэхэд элементүүд доороос шат дараатай гарч ирнэ. */
export function Enter({ index = 0, children, style }: { index?: number; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <Animated.View entering={FadeInDown.delay(60 + index * 70).duration(380).springify().damping(16)} style={style}>
      {children}
    </Animated.View>
  );
}

/** Шинээр гарч ирэх (key солигдох үед) элементийг томруулж үзүүлнэ. */
export function ZoomEnter({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <Animated.View entering={ZoomIn.springify().damping(12)} style={style}>
      {children}
    </Animated.View>
  );
}

export const Spacer = ({ flex = 1 }: { flex?: number }) => <View style={{ flex }} />;
