import { StyleSheet, Text, View } from 'react-native';
import { PressScale } from '@/components/pixel';
import { colors, fonts, hardShadow, radius, teamColors } from '@/constants/theme';
import { S } from '@/i18n/strings';

/** 1 vs 1 … 5 vs 5 сонгогч: хавтан бүр хоёр багийн хүнийг цэнхэр, ягаан дөрвөлжингөөр харуулна. */
export function TeamSizePicker({ value, onChange, max = 5 }: { value: number; onChange: (n: number) => void; max?: number }) {
  const sizes = Array.from({ length: max }, (_, i) => i + 1);
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={S.duel.mode} style={styles.row}>
      {sizes.map((n) => {
        const on = n === value;
        return (
          <PressScale
            key={n}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            accessibilityLabel={S.duel.modeLabel(n)}
            onPress={() => onChange(n)}
            style={[styles.tile, on && styles.tileOn]}
          >
            <Text style={[styles.label, on && styles.labelOn]}>{`${n}v${n}`}</Text>
            <View style={styles.dots}>
              <DotRow n={n} color={teamColors.a.main} />
              <DotRow n={n} color={teamColors.b.main} />
            </View>
          </PressScale>
        );
      })}
    </View>
  );
}

function DotRow({ n, color }: { n: number; color: string }) {
  return (
    <View style={styles.dotRow}>
      {Array.from({ length: n }, (_, i) => (
        <View key={i} style={[styles.dot, { backgroundColor: color }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6 },
  tile: {
    flex: 1,
    minHeight: 64,
    borderRadius: radius.sm,
    backgroundColor: colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderWidth: 2,
    borderColor: colors.paper,
  },
  tileOn: { backgroundColor: colors.indigo, borderColor: colors.ink, ...hardShadow(3) },
  label: { fontFamily: fonts.pixelNum, fontSize: 13, color: colors.ink },
  labelOn: { color: colors.white },
  dots: { gap: 3, alignItems: 'center' },
  dotRow: { flexDirection: 'row', gap: 2 },
  dot: { width: 5, height: 5, borderRadius: 1 },
});
