import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { BgArt } from '@/components/BgArt';
import { PressScale, Sprite } from '@/components/pixel';
import { colors, fonts } from '@/constants/theme';
import type { BgDef } from '@/lib/pixelBear/catalog';

export interface SwatchStatus {
  text: string;
  color: string;
  showHoney: boolean;
  locked: boolean;
  /** дэлгэц уншигчид зориулсан бүтэн текст (жишээ нь "60 · хүрэхгүй") */
  a11y?: string;
}

/** Дэвсгэр өнгийн swatch (DESIGN.md §7 BgSwatch). */
export function BgSwatch({
  name,
  hex,
  bg,
  selected,
  equipped,
  status,
  label,
  onPress,
}: {
  name: string;
  hex: string;
  /** зурагтай/pixel үзэгдэлтэй дэвсгэр бол swatch-д нь харуулна */
  bg?: BgDef;
  selected: boolean;
  equipped: boolean;
  status: SwatchStatus;
  label: string;
  onPress: () => void;
}) {
  return (
    <PressScale accessibilityRole="button" accessibilityLabel={`${label}, ${status.a11y ?? status.text}`} accessibilityState={{ selected }} onPress={onPress} style={styles.item}>
      <View style={[styles.block, { backgroundColor: hex, borderColor: selected ? colors.ink : 'transparent', opacity: status.locked ? 0.55 : 1 }]}>
        {bg ? <BgArt bg={bg} /> : null}
        {equipped ? (
          <View style={styles.check}>
            <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={colors.white} strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M5 12.5 10 17.5 19 7" />
            </Svg>
          </View>
        ) : null}
      </View>
      <Text style={styles.name} numberOfLines={1}>
        {name}
      </Text>
      <View style={styles.statusRow}>
        {status.showHoney ? <Sprite id="btn_honey_12x12" /> : null}
        <Text style={[styles.status, { color: status.color }]} numberOfLines={1}>
          {status.text}
        </Text>
      </View>
    </PressScale>
  );
}

const styles = StyleSheet.create({
  item: { flex: 1, gap: 5 },
  block: { height: 64, borderRadius: 18, borderWidth: 3, overflow: 'hidden' },
  check: {
    position: 'absolute',
    right: 4,
    top: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { fontFamily: fonts.bold, fontSize: 12, color: colors.ink, paddingLeft: 2 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingLeft: 2 },
  status: { fontFamily: fonts.semibold, fontSize: 11, flexShrink: 1 },
});
