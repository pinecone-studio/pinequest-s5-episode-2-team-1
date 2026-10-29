import { ActivityIndicator, StyleSheet, Text, type ViewStyle } from 'react-native';
import { PressScale } from '@/components/pixel';
import { colors, fonts, hardShadow, radius } from '@/constants/theme';

type Variant = 'primary' | 'lime' | 'lemon' | 'ink' | 'white' | 'secondary' | 'pink' | 'ghost';

const palette: Record<Variant, { bg: string; fg: string; border?: string }> = {
  primary: { bg: colors.indigo, fg: colors.white },
  lime: { bg: colors.lime, fg: colors.ink },
  lemon: { bg: colors.lemon, fg: colors.ink, border: colors.ink },
  ink: { bg: colors.ink, fg: colors.white, border: colors.ink },
  white: { bg: colors.white, fg: colors.ink },
  secondary: { bg: colors.stoneAlt, fg: colors.ink },
  pink: { bg: colors.pink, fg: colors.dangerText },
  ghost: { bg: 'transparent', fg: colors.indigo },
};

/** DESIGN.md §7: 60px pill. `lime` = "Үргэлжлүүлэх" (том үсэг, зайтай), `lemon` = замын CTA (ink хүрээ + хатуу сүүдэр). */
export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  small,
  style,
  accessibilityLabel,
}: {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  small?: boolean;
  style?: ViewStyle;
  accessibilityLabel?: string;
}) {
  const p = palette[variant];
  const inactive = disabled || loading;
  const dim = disabled && variant !== 'ghost';
  return (
    <PressScale
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      onPress={onPress}
      disabled={inactive}
      scaleTo={0.96}
      style={[
        styles.base,
        small && styles.small,
        { backgroundColor: dim ? colors.stoneAlt : p.bg },
        p.border && !dim ? { borderWidth: 2, borderColor: p.border, ...hardShadow(4) } : null,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={p.fg} />
      ) : (
        <Text
          style={[
            styles.text,
            small && styles.smallText,
            variant === 'lime' && styles.limeText,
            { color: dim ? colors.muted : p.fg },
          ]}
        >
          {title}
        </Text>
      )}
    </PressScale>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 60,
    borderRadius: radius.pill,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  small: { minHeight: 44, paddingHorizontal: 16 },
  text: { fontFamily: fonts.semibold, fontSize: 18 },
  smallText: { fontFamily: fonts.bold, fontSize: 14 },
  limeText: { fontFamily: fonts.bold, fontSize: 16, letterSpacing: 1.4, textTransform: 'uppercase' },
});
