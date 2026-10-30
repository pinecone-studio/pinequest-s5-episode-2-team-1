import { StyleSheet, View } from 'react-native';
import { AnimatedBar } from '@/components/pixel';
import { BackButton } from '@/components/ui';
import { colors } from '@/constants/theme';
import { S } from '@/i18n/strings';

/** Бүртгэл → баавгай → 7 асуулт: нэг урсгалын нийт алхам */
export const FLOW_TOTAL = 9;

/** Бүртгэл, баавгай, асуулт бүгдийн дээд мөр: буцах + нэг ижил ахицын зурвас (дэлгэц бүр өөр харагдахгүй) */
export function FlowTop({ step, total = FLOW_TOTAL, onBack }: { step: number; total?: number; onBack?: () => void }) {
  return (
    <View style={styles.top}>
      {onBack ? <BackButton onPress={onBack} label={S.onboarding.back} /> : <View style={styles.spacer} />}
      <View style={styles.track} accessible accessibilityLabel={S.onboarding.progress(step, total)}>
        <AnimatedBar value={step / total} color={colors.violet} height={12} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 },
  spacer: { width: 8 },
  track: { flex: 1, height: 12, borderRadius: 6, backgroundColor: colors.track, overflow: 'hidden' },
});
