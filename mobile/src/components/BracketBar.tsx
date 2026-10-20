import { StyleSheet, Text, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { colors, fonts } from '@/constants/theme';

/** Charlie маягийн "[ ▮▮▮▯▯ ]" pixel явцын зурвас. */
export function BracketBar({
  value,
  max,
  segments = 10,
  color = colors.ink,
  track = '#DCD9E4',
  label,
}: {
  value: number;
  max: number;
  segments?: number;
  color?: string;
  track?: string;
  label?: string;
}) {
  const filled = max > 0 ? Math.max(0, Math.min(segments, Math.round((value / max) * segments))) : 0;
  return (
    <View style={styles.row} accessible accessibilityRole="progressbar" accessibilityLabel={label} accessibilityValue={{ min: 0, max, now: value }}>
      <Text style={styles.bracket}>[</Text>
      <View style={styles.segs}>
        {Array.from({ length: segments }, (_, i) =>
          i < filled ? (
            <Animated.View key={`f${i}-${filled}`} entering={ZoomIn.delay(i * 40).springify().damping(12)} style={[styles.seg, { backgroundColor: color }]} />
          ) : (
            <View key={`e${i}`} style={[styles.seg, { backgroundColor: track }]} />
          ),
        )}
      </View>
      <Text style={styles.bracket}>]</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  bracket: { fontFamily: fonts.pixel, fontSize: 28, lineHeight: 30, color: colors.ink },
  segs: { flex: 1, flexDirection: 'row', gap: 3 },
  seg: { flex: 1, height: 12 },
});
