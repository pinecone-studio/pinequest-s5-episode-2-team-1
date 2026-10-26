import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  type SharedValue,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

const COLORS = ['#35D8FF', '#FFFFFF', '#B84DFF', '#F0C45B'];
const COUNT = 12;

function Particle({ index, progress }: { index: number; progress: SharedValue<number> }) {
  const angle = (index / COUNT) * Math.PI * 2;
  const reach = 38 + (index % 3) * 16;
  const size = index % 3 === 0 ? 11 : 7;
  const style = useAnimatedStyle(() => ({
    opacity: progress.value < 0.75 ? 1 - progress.value * 0.45 : (1 - progress.value) * 4,
    transform: [
      { translateX: Math.cos(angle) * reach * progress.value },
      { translateY: Math.sin(angle) * reach * progress.value },
      { scale: 1 - progress.value * 0.35 },
    ],
  }));

  return <Animated.View style={[styles.particle, { width: size, height: size, backgroundColor: COLORS[index % COLORS.length] }, style]} />;
}

/** Таяг руу чиглэсэн гэрэлт сум, очийг сонгосон хэвээр байхад давтан харуулна. */
export function MagicBurst({ active, castKey }: { active: boolean; castKey: number }) {
  const progress = useSharedValue(0);
  const reduced = useReducedMotion();

  useEffect(() => {
    cancelAnimation(progress);
    progress.value = 0;
    if (active && !reduced) {
      progress.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) }),
          withTiming(0, { duration: 400 }),
        ),
        -1,
      );
    }
    return () => cancelAnimation(progress);
  }, [active, castKey, progress, reduced]);

  const projectile = useAnimatedStyle(() => ({
    opacity: progress.value < 0.8 ? 1 : (1 - progress.value) * 5,
    transform: [
      { translateX: progress.value * 88 },
      { translateY: -progress.value * 82 },
      { scale: 0.75 + progress.value * 0.5 },
    ],
  }));

  if (!active) return null;

  if (reduced) {
    return (
      <View pointerEvents="none" style={styles.root}>
        <View style={styles.staticSpell}>
          <View style={styles.staticTrail} />
          <View style={styles.staticOrb} />
          <View style={styles.staticSpark} />
        </View>
      </View>
    );
  }

  return (
    <View pointerEvents="none" style={styles.root}>
      <View style={styles.castOrigin}>
        {Array.from({ length: COUNT }, (_, index) => (
          <Particle key={index} index={index} progress={progress} />
        ))}
      </View>
      <Animated.View style={[styles.projectile, projectile]}>
        <View style={styles.trail} />
        <View style={styles.orb} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFill, zIndex: 2 },
  castOrigin: { position: 'absolute', left: '70%', top: '24%' },
  particle: { position: 'absolute', left: -5, top: -5 },
  projectile: { position: 'absolute', left: '70%', top: '24%', width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  trail: { position: 'absolute', width: 54, height: 10, borderRadius: 5, backgroundColor: '#B84DFF', transform: [{ rotate: '-43deg' }], opacity: 0.85 },
  orb: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#FFFFFF', borderWidth: 4, borderColor: '#35D8FF' },
  staticSpell: { position: 'absolute', left: '70%', top: '12%', width: 110, height: 90 },
  staticTrail: { position: 'absolute', left: 22, top: 42, width: 60, height: 12, borderRadius: 6, backgroundColor: '#B84DFF', transform: [{ rotate: '-43deg' }] },
  staticOrb: { position: 'absolute', left: 71, top: 2, width: 22, height: 22, borderRadius: 11, backgroundColor: '#FFFFFF', borderWidth: 4, borderColor: '#35D8FF' },
  staticSpark: { position: 'absolute', left: 14, top: 5, width: 16, height: 16, backgroundColor: '#F0C45B', transform: [{ rotate: '45deg' }] },
});
