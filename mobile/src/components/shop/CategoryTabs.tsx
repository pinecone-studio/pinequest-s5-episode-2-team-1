import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PressScale } from '@/components/pixel';
import { colors, fonts } from '@/constants/theme';

/** Дэлгүүрийн ангилал (Хувцас / Дэвсгэр): нэр + жижиг зураг бүхий том карт, сонгосон нь нимбэг өнгөөр товойно. */
export function CategoryTabs<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string; art: ReactNode }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <View accessibilityRole="tablist" accessibilityLabel={label} style={styles.row}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <PressScale
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={o.label}
            onPress={() => onChange(o.value)}
            style={[styles.card, on && styles.cardOn]}
          >
            <Text style={styles.label}>{o.label}</Text>
            <View style={styles.art}>{o.art}</View>
          </PressScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10 },
  card: {
    flex: 1,
    height: 68,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
    borderRadius: 20,
    borderWidth: 2,
    borderBottomWidth: 5,
    borderColor: 'rgba(25,21,46,0.12)',
    backgroundColor: colors.white,
    overflow: 'hidden',
  },
  cardOn: { borderColor: '#BDC03A', backgroundColor: colors.lemon },
  label: { flex: 1, fontFamily: fonts.extrabold, fontSize: 16, color: colors.ink },
  art: { width: 70, height: '100%', alignItems: 'center', justifyContent: 'center' },
});
