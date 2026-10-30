import { StyleSheet, Text, View } from 'react-native';
import { PressScale } from '@/components/pixel';
import { colors, fonts, radius } from '@/constants/theme';

/** 2 табтай цагаан pill (сонгосон = indigo). */
export function SegmentedTabs<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <View accessibilityRole="tablist" accessibilityLabel={label} style={styles.wrap}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <PressScale
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(o.value)}
            style={[styles.tab, active && styles.tabOn]}
          >
            <Text style={[styles.text, active && styles.textOn]}>{o.label}</Text>
          </PressScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  // 52 − 2×4 = 44: таб бүр 44px-ийн хүрэх талбартай
  wrap: { height: 52, padding: 4, borderRadius: radius.pill, backgroundColor: colors.white, flexDirection: 'row', gap: 4 },
  tab: { flex: 1, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  tabOn: { backgroundColor: colors.indigo },
  text: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
  textOn: { color: colors.white },
});
