import { useEffect } from 'react';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { colors } from '@/constants/theme';

/** Эргэлддэг цагираг (reduce motion үед зогсонги). */
export function Spinner({ size = 20, color = colors.white }: { size?: number; color?: string }) {
  const reduce = useReducedMotion();
  const r = useSharedValue(0);
  useEffect(() => {
    if (!reduce) r.value = withRepeat(withTiming(360, { duration: 900, easing: Easing.linear }), -1, false);
  }, [reduce, r]);
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${r.value}deg` }] }));
  return (
    <Animated.View
      style={[
        { width: size, height: size, borderRadius: size / 2, borderWidth: Math.max(2, size / 7), borderColor: color, borderTopColor: 'transparent' },
        style,
      ]}
    />
  );
}
