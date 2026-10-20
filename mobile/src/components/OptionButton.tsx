import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Pop, PressScale, Shake } from '@/components/pixel';
import { colors, fonts, radius } from '@/constants/theme';

export type OptionState = 'idle' | 'selected' | 'correct' | 'wrong' | 'dim';

const LETTERS = ['А', 'Б', 'В', 'Г'];

const look: Record<OptionState, { bg: string; border: string; text: string }> = {
  idle: { bg: colors.white, border: '#DDDAD1', text: colors.ink },
  selected: { bg: colors.lavender, border: colors.violet, text: colors.ink },
  correct: { bg: colors.lime, border: colors.ink, text: colors.ink },
  wrong: { bg: colors.pink, border: colors.ink, text: colors.ink },
  dim: { bg: colors.white, border: '#DDDAD1', text: colors.muted },
};

/** Хариултын товч (05 · Хичээл): `grid` = 2×2 богино хариулт, үгүй бол урт хариултын мөр. */
export function OptionButton({
  index,
  label,
  state,
  disabled,
  onPress,
  grid,
}: {
  index: number;
  label: string;
  state: OptionState;
  disabled?: boolean;
  onPress: () => void;
  grid?: boolean;
}) {
  const l = look[state];
  return (
    <Shake trigger={state === 'wrong'} style={grid ? styles.gridCell : undefined}>
      <Pop trigger={state === 'correct' || state === 'selected' ? state : null} from={0.92}>
        <PressScale
          accessibilityRole="button"
          accessibilityLabel={`${LETTERS[index]}. ${label}`}
          accessibilityState={{ disabled: !!disabled, selected: state === 'selected' }}
          disabled={disabled}
          onPress={onPress}
          scaleTo={0.96}
          style={[grid ? styles.gridBox : styles.rowBox, { backgroundColor: l.bg, borderColor: l.border }, state === 'dim' && { opacity: 0.55 }]}
        >
          {grid ? null : (
            <View style={[styles.badge, { backgroundColor: state === 'idle' || state === 'dim' ? colors.paper : colors.white }]}>
              {state === 'correct' || state === 'wrong' ? (
                <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={colors.ink} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                  <Path d={state === 'correct' ? 'M5 12.5 10 17.5 19 7' : 'M6 6l12 12M18 6 6 18'} />
                </Svg>
              ) : (
                <Text style={styles.letter}>{LETTERS[index]}</Text>
              )}
            </View>
          )}
          <Text style={[grid ? styles.gridText : styles.rowText, { color: l.text }]} numberOfLines={grid ? 2 : undefined} adjustsFontSizeToFit={grid}>
            {label}
          </Text>
        </PressScale>
      </Pop>
    </Shake>
  );
}

const styles = StyleSheet.create({
  gridCell: { width: '48.5%' },
  gridBox: {
    height: 60,
    borderRadius: radius.md,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  gridText: { fontFamily: fonts.semibold, fontSize: 20, textAlign: 'center' },
  rowBox: {
    minHeight: 58,
    borderRadius: radius.md,
    borderWidth: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  badge: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  letter: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink },
  rowText: { flex: 1, fontFamily: fonts.semibold, fontSize: 17, lineHeight: 22 },
});
