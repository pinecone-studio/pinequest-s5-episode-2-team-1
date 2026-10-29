import { useEffect, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSpring, withTiming } from 'react-native-reanimated';
import { Logo } from '@/components/Logo';
import { Sprite } from '@/components/pixel';
import { colors } from '@/constants/theme';

let played = false;
/** Апп нээгдсэнээс хойш intro тоглосон эсэх: welcome руу буцахад дахин тоглохгүй */
export const introPlayed = () => played;

const FACES = { calm: 'avatar_brown_calm_plain_160x160', wink: 'avatar_brown_wink_plain_160x160', happy: 'avatar_brown_happy_plain_160x160' } as const;

/**
 * Welcome-ийн intro (Ahead апп-ын splash маягаар): нил ягаан дээр баавгай нүд ирмээд жижгэрнэ → төвөөс цайвар тойрог
 * тэлж дэлгэцийг бүрхэнэ, лого spring-ээр гарна → бүдгэрч welcome харагдана. Нийт ~2.4с.
 */
export function IntroReveal({ onDone }: { onDone: () => void }) {
  const reduce = useReducedMotion();
  const { width, height } = useWindowDimensions();
  const [face, setFace] = useState<keyof typeof FACES>('calm');
  const bear = useSharedValue(1);
  const circle = useSharedValue(0);
  const logo = useSharedValue(0);
  const fade = useSharedValue(1);

  useEffect(() => {
    played = true;
    if (reduce) {
      onDone();
      return;
    }
    const timers = [setTimeout(() => setFace('wink'), 350), setTimeout(() => setFace('happy'), 700), setTimeout(onDone, 2450)];
    bear.value = withDelay(950, withTiming(0, { duration: 260, easing: Easing.in(Easing.back(2)) }));
    circle.value = withDelay(1150, withTiming(1, { duration: 520, easing: Easing.out(Easing.cubic) }));
    logo.value = withDelay(1300, withSpring(1, { damping: 13, stiffness: 180 }));
    fade.value = withDelay(2100, withTiming(0, { duration: 320 }));
    return () => timers.forEach(clearTimeout);
    // нэг л удаа тоглоно
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const d = Math.hypot(width, height); // дэлгэцийн булан хүртэл бүрхэх тойрог
  const rootStyle = useAnimatedStyle(() => ({ opacity: fade.value }));
  const bearStyle = useAnimatedStyle(() => ({ transform: [{ scale: bear.value }] }));
  const circleStyle = useAnimatedStyle(() => ({ transform: [{ scale: circle.value }] }));
  const logoStyle = useAnimatedStyle(() => ({ opacity: logo.value > 0.05 ? 1 : 0, transform: [{ scale: logo.value }] }));

  if (reduce) return null;
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.root, rootStyle]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Animated.View style={bearStyle}>
        <Sprite id={FACES[face]} />
      </Animated.View>
      <Animated.View style={[styles.circle, { width: d, height: d, borderRadius: d / 2, left: (width - d) / 2, top: (height - d) / 2 }, circleStyle]} />
      <View style={styles.center}>
        <Animated.View style={logoStyle}>
          <Logo size={120} />
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: colors.violet, alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  circle: { position: 'absolute', backgroundColor: colors.paper },
  center: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
});
