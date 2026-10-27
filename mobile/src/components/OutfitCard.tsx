import { StyleSheet, Text, View } from 'react-native';
import { PressScale, Sprite } from '@/components/pixel';
import { colors, fonts, radius } from '@/constants/theme';
import type { OutfitDef } from '@/lib/pixelBear/catalog';
import type { SwatchStatus } from './BgSwatch';

/** Хувцасны карт (DESIGN.md §7 OutfitCard): дээд 62px хавтан дээр баавгайн толгой/хүзүү 1×. */
export function OutfitCard({
  def,
  selected,
  status,
  onPress,
}: {
  def: OutfitDef;
  selected: boolean;
  status: SwatchStatus;
  onPress: () => void;
}) {
  return (
    <PressScale
      accessibilityRole="button"
      accessibilityLabel={`${def.name}, ${status.a11y ?? status.text}`}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.card, { borderColor: selected ? colors.violet : colors.white }]}
    >
      <View style={[styles.tile, { backgroundColor: def.tile }]}>
        <Sprite id={def.card} style={{ marginTop: def.imgTop, opacity: status.locked ? 0.55 : 1 }} />
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {def.name}
        </Text>
        <View style={styles.statusRow}>
          {status.showHoney ? <Sprite id="btn_honey_12x12" /> : null}
          <Text style={[styles.status, { color: status.color }]} numberOfLines={1}>
            {status.text}
          </Text>
        </View>
      </View>
    </PressScale>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, height: 120, borderWidth: 3, borderRadius: radius.card, backgroundColor: colors.white, overflow: 'hidden' },
  tile: { height: 62, alignItems: 'center', overflow: 'hidden' },
  info: { paddingVertical: 6, paddingHorizontal: 12, gap: 3 },
  name: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  status: { fontFamily: fonts.semibold, fontSize: 13, flexShrink: 1 },
});
