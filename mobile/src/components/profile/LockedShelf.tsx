import { StyleSheet, Text, View } from 'react-native';
import { Enter, Sprite } from '@/components/pixel';
import { colors, fonts, radius } from '@/constants/theme';
import { P } from '@/i18n/profile';
import { sectionTitle } from './Overview';

/**
 * "Сарын тэмдэг", "Амжилт"-ын тавиур: тэмдгийн pixel icon-ууд ирэх хүртэл түгжээтэй нүднүүд. `round` = сарын тэмдэг
 * (дугуй), эс бөгөөс амжилтын хавтан.
 */
export function LockedShelf({ title, slots, round, index }: { title: string; slots: number; round?: boolean; index: number }) {
  return (
    <Enter index={index} style={styles.section}>
      <View style={styles.head}>
        <Text accessibilityRole="header" style={sectionTitle}>
          {title}
        </Text>
        <Text style={styles.soon}>{P.soon}</Text>
      </View>
      <View style={styles.row} accessible accessibilityLabel={P.lockedA11y(title, slots)}>
        {Array.from({ length: slots }, (_, i) => (
          <View key={i} style={[styles.slot, round ? styles.round : styles.tile]}>
            <Sprite id="icon_lock_32x32" />
          </View>
        ))}
      </View>
    </Enter>
  );
}

const styles = StyleSheet.create({
  section: { gap: 10 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  soon: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.indigo,
    backgroundColor: colors.lavender,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', gap: 10 },
  slot: {
    flex: 1,
    aspectRatio: 1,
    maxWidth: 84,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.stoneAlt,
    borderWidth: 3,
    borderColor: colors.stone,
  },
  round: { borderRadius: 999 },
  tile: { borderRadius: radius.md, aspectRatio: 0.86 },
});
