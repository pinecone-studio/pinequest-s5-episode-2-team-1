import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AnimatedBar, Sprite } from '@/components/pixel';
import { APP_NAME } from '@/constants/app';
import { fonts, radius } from '@/constants/theme';
import { S } from '@/i18n/strings';

export const ONBOARDING_COLORS = {
  bg: '#EBE9E3',
  ink: '#080605',
  coral: '#FF4A32',
  yellow: '#FAC211',
  lavender: '#B888FC',
  white: '#FFFDF8',
} as const;
export const ONBOARDING_BG = ONBOARDING_COLORS.bg;
/** 3 танилцуулга + 3 асуулт + 1 баавгайн тохиргоо. */
export const ONBOARDING_TOTAL_STEPS = 7;

/** Onboarding-ийн бүх алхамд ижил харагдах KUMA wordmark, алхмын тоо, progress. */
export function OnboardingHeader({ step, total, onBack }: { step: number; total: number; onBack?: () => void }) {
  return (
    <>
      <View style={styles.brandRow}>
        <View style={styles.brand}>
          <View style={styles.logoMark}>
            <Sprite id="icon_star_24x24" />
          </View>
          <Text style={styles.wordmark}>{APP_NAME}</Text>
        </View>
        <Text style={styles.step}>{step + 1}/{total}</Text>
      </View>

      <View style={styles.top}>
        {onBack ? (
          <Pressable accessibilityRole="button" accessibilityLabel={S.onboarding.back} onPress={onBack} style={styles.back} hitSlop={8}>
            <Text style={styles.backGlyph}>←</Text>
          </Pressable>
        ) : (
          <View style={styles.back} />
        )}
        <View style={styles.track} accessible accessibilityLabel={S.onboarding.progress(step + 1, total)}>
          <AnimatedBar value={(step + 1) / total} color={ONBOARDING_COLORS.coral} height={12} />
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  brandRow: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoMark: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: ONBOARDING_COLORS.yellow, borderWidth: 2, borderColor: ONBOARDING_COLORS.ink },
  wordmark: { fontFamily: fonts.pixel, fontSize: 28, lineHeight: 32, color: ONBOARDING_COLORS.ink, letterSpacing: 0.5 },
  step: {
    minWidth: 48,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: radius.pill,
    overflow: 'hidden',
    backgroundColor: ONBOARDING_COLORS.yellow,
    borderWidth: 2,
    borderColor: ONBOARDING_COLORS.ink,
    fontFamily: fonts.pixelNum,
    fontSize: 12,
    color: ONBOARDING_COLORS.ink,
    textAlign: 'center',
  },
  top: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  backGlyph: { fontFamily: fonts.pixel, fontSize: 28, color: ONBOARDING_COLORS.ink },
  track: { flex: 1, height: 16, padding: 2, borderRadius: 8, borderWidth: 2, borderColor: ONBOARDING_COLORS.ink, backgroundColor: ONBOARDING_COLORS.white, overflow: 'hidden' },
});
