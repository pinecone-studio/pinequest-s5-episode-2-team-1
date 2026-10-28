import { StyleSheet, Text, TextInput, View } from 'react-native';
import { PressScale, Sprite } from '@/components/pixel';
import { colors, fonts, radius } from '@/constants/theme';
import { S } from '@/i18n/strings';

/** Бооцоо: −/+ товч ба боргоцойн тэмдэгтэй тоон талбар. */
export function StakeStepper({ value, onChange, invalid }: { value: string; onChange: (v: string) => void; invalid: boolean }) {
  const n = Number.parseInt(value, 10);
  const change = (d: number) => onChange(String(Math.max(1, (Number.isInteger(n) ? n : 1) + d)));
  return (
    <View style={styles.row}>
      <StepButton label="−" onPress={() => change(-1)} />
      <View style={[styles.field, invalid && { borderColor: colors.dangerText }]}>
        <Sprite id="btn_honey_24x24" />
        <TextInput
          value={value}
          onChangeText={(t) => onChange(t.replace(/[^0-9]/g, ''))}
          keyboardType="number-pad"
          maxLength={4}
          accessibilityLabel={S.duel.stake}
          style={[styles.input, invalid && { color: colors.dangerText }]}
        />
      </View>
      <StepButton label="+" onPress={() => change(1)} />
    </View>
  );
}

function StepButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <PressScale accessibilityRole="button" accessibilityLabel={label === '+' ? 'Нэмэх' : 'Хасах'} onPress={onPress} style={styles.step} hitSlop={6}>
      <Text style={styles.stepText}>{label}</Text>
    </PressScale>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  step: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center' },
  stepText: { fontFamily: fonts.semibold, fontSize: 26, lineHeight: 30, color: colors.ink },
  field: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 2,
    borderColor: colors.line,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    paddingHorizontal: 12,
  },
  input: { minWidth: 48, textAlign: 'center', fontFamily: fonts.pixelNum, fontSize: 22, color: colors.ink, paddingVertical: 8 },
});
