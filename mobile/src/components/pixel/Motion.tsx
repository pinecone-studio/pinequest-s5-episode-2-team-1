import { type ReactNode, useEffect } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

/** DESIGN.md §6-ийн keyframe-үүд. `pingpong` = 0→1→0 (CSS-ийн 0%,50%,100%), `loop` = 0→1 дахин эхлэх. */
export type MotionPreset =
  | 'float'
  | 'bob'
  | 'breathe'
  | 'sway'
  | 'twinkle'
  | 'drop'
  | 'shadow'
  | 'hop'
  | 'blink'
  | 'ring'
  | 'arrow'
  | 'wiggle'
  | 'saplingSway'
  | 'blockBob'
  | 'driftA'
  | 'driftB'
  | 'flyA'
  | 'flyB'
  | 'shake';

interface Config {
  /** CSS-ийн animation-duration (ms) */
  duration: number;
  pingpong: boolean;
  easing?: (t: number) => number;
}

const inOut = Easing.inOut(Easing.sin);

const CONFIG: Record<MotionPreset, Config> = {
  float: { duration: 2600, pingpong: true, easing: inOut },
  bob: { duration: 1600, pingpong: true, easing: inOut },
  breathe: { duration: 3000, pingpong: true, easing: inOut },
  sway: { duration: 2800, pingpong: true, easing: inOut },
  twinkle: { duration: 1800, pingpong: true, easing: inOut },
  drop: { duration: 1400, pingpong: false, easing: Easing.in(Easing.quad) },
  shadow: { duration: 2600, pingpong: true, easing: inOut },
  hop: { duration: 2800, pingpong: false },
  blink: { duration: 3600, pingpong: false },
  ring: { duration: 1600, pingpong: true, easing: inOut },
  arrow: { duration: 1000, pingpong: true, easing: Easing.steps(2, true) },
  wiggle: { duration: 3000, pingpong: false },
  saplingSway: { duration: 2400, pingpong: true, easing: inOut },
  blockBob: { duration: 1600, pingpong: true, easing: Easing.steps(4, true) },
  driftA: { duration: 38000, pingpong: false },
  driftB: { duration: 52000, pingpong: false },
  flyA: { duration: 9000, pingpong: false },
  flyB: { duration: 7000, pingpong: false },
  shake: { duration: 1400, pingpong: false },
};

/**
 * View-г preset-ээр хөдөлгөнө. Системд "motion бууруулах" асаалттай бол хөдөлгөөнгүй
 * (prefers-reduced-motion: reduce) анхны байрлалдаа үлдэнэ.
 */
export function Motion({
  preset,
  delay = 0,
  style,
  children,
  originBottom,
}: {
  preset: MotionPreset;
  /** CSS-ийн animation-delay (ms) */
  delay?: number;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
  /** transform-origin: 50% 100% (breathe, sway) */
  originBottom?: boolean;
}) {
  const reduce = useReducedMotion();
  const p = useSharedValue(0);

  useEffect(() => {
    if (reduce) {
      cancelAnimation(p);
      p.value = 0;
      return;
    }
    const cfg = CONFIG[preset];
    const anim = cfg.pingpong
      ? withRepeat(withTiming(1, { duration: cfg.duration / 2, easing: cfg.easing }), -1, true)
      : withRepeat(withTiming(1, { duration: cfg.duration, easing: cfg.easing ?? Easing.linear }), -1, false);
    p.value = 0;
    p.value = delay > 0 ? withDelay(delay, anim) : anim;
    return () => cancelAnimation(p);
  }, [preset, delay, reduce, p]);

  const animated = useAnimatedStyle(() => {
    const v = p.value;
    switch (preset) {
      case 'float':
        return { transform: [{ translateY: interpolate(v, [0, 1], [0, -16]) }] };
      case 'bob':
        return { transform: [{ translateY: interpolate(v, [0, 1], [0, -5]) }] };
      case 'breathe':
        return { transform: [{ scaleY: interpolate(v, [0, 1], [1, 0.975]) }] };
      case 'sway':
        return { transform: [{ rotate: `${interpolate(v, [0, 1], [-3, 3])}deg` }] };
      case 'twinkle':
        return { opacity: interpolate(v, [0, 1], [1, 0.3]), transform: [{ scale: interpolate(v, [0, 1], [1, 0.6]) }] };
      case 'drop':
        return { opacity: interpolate(v, [0, 1], [1, 0]), transform: [{ translateY: interpolate(v, [0, 1], [0, 14]) }] };
      case 'shadow':
        return { opacity: interpolate(v, [0, 1], [0.22, 0.12]), transform: [{ scaleX: interpolate(v, [0, 1], [1, 0.72]) }] };
      case 'hop': {
        const k = [0, 0.4, 0.46, 0.56, 0.66, 0.72, 1];
        return {
          transform: [
            { translateY: interpolate(v, k, [0, 0, 2, -22, 0, 0, 0]) },
            { scaleX: interpolate(v, k, [1, 1, 1.06, 0.95, 1.07, 1, 1]) },
            { scaleY: interpolate(v, k, [1, 1, 0.92, 1.06, 0.92, 1, 1]) },
          ],
        };
      }
      case 'blink':
        return { opacity: interpolate(v, [0, 0.88, 0.89, 0.93, 0.94, 1], [0, 0, 1, 1, 0, 0]) };
      case 'ring':
        return { opacity: interpolate(v, [0, 1], [0.45, 1]), transform: [{ scale: interpolate(v, [0, 1], [1, 1.08]) }] };
      case 'arrow':
        return { transform: [{ translateY: interpolate(v, [0, 1], [0, -8]) }] };
      case 'wiggle':
        return {
          transform: [{ rotate: `${interpolate(v, [0, 0.7, 0.76, 0.82, 0.88, 0.94, 1], [0, 0, -8, 8, -5, 3, 0])}deg` }],
        };
      case 'saplingSway':
        return { transform: [{ rotate: `${interpolate(v, [0, 1], [-4, 4])}deg` }] };
      case 'blockBob':
        return { transform: [{ translateY: interpolate(v, [0, 1], [0, -8]) }] };
      case 'driftA':
        return { transform: [{ translateX: interpolate(v, [0, 1], [-90, 470]) }] };
      case 'driftB':
        return { transform: [{ translateX: interpolate(v, [0, 1], [420, -80]) }] };
      case 'flyA':
        return {
          transform: [
            { translateX: interpolate(v, [0, 0.25, 0.5, 0.75, 1], [0, 40, 90, 50, 0]) },
            { translateY: interpolate(v, [0, 0.25, 0.5, 0.75, 1], [0, -30, -10, 20, 0]) },
          ],
        };
      case 'flyB':
        return {
          transform: [
            { translateX: interpolate(v, [0, 0.33, 0.66, 1], [0, -50, -20, 0]) },
            { translateY: interpolate(v, [0, 0.33, 0.66, 1], [0, -24, 26, 0]) },
          ],
        };
      case 'shake':
        return {
          transform: [{ rotate: `${interpolate(v, [0, 0.55, 0.6, 0.66, 0.72, 0.78, 1], [0, 0, -9, 9, -6, 4, 0])}deg` }],
        };
    }
  }, [preset]);

  return (
    <Animated.View style={[originBottom ? { transformOrigin: '50% 100%' } : null, style, animated]}>{children}</Animated.View>
  );
}
