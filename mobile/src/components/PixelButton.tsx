import { StyleSheet, Text, View } from 'react-native';
import { PressScale, Sprite } from '@/components/pixel';
import { colors, fonts } from '@/constants/theme';
import type { SpriteKey } from '@/sprites';

/**
 * Charlie маягийн дөрвөлжин товч: цагаан, ink хүрээ, баруун-доош хатуу сүүдэр, голдоо pixel icon.
 * `badge` > 0 бол баруун дээд буланд тоо; `bg` нь товчны өнгө.
 */
export function PixelButton({
  icon,
  label,
  onPress,
  badge,
  bg = colors.white,
}: {
  icon: SpriteKey;
  label: string;
  onPress: () => void;
  badge?: number;
  bg?: string;
}) {
  return (
    <View style={styles.wrap}>
      <View style={styles.shadow} />
      <PressScale accessibilityRole="button" accessibilityLabel={label} onPress={onPress} scaleTo={0.9} style={[styles.btn, { backgroundColor: bg }]}>
        <Sprite id={icon} />
      </PressScale>
      {badge ? (
        <View style={styles.badge} pointerEvents="none">
          <Text style={styles.badgeText}>{badge > 9 ? '9+' : badge}</Text>
        </View>
      ) : null}
    </View>
  );
}

const SIZE = 60;
const styles = StyleSheet.create({
  wrap: { width: SIZE + 4, height: SIZE + 4 },
  shadow: { position: 'absolute', left: 4, top: 4, width: SIZE, height: SIZE, borderRadius: 18, backgroundColor: '#C9C6D3' },
  btn: {
    width: SIZE,
    height: SIZE,
    borderRadius: 18,
    borderWidth: 2.5,
    borderColor: colors.ink,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    right: -6,
    top: -6,
    minWidth: 24,
    height: 24,
    paddingHorizontal: 5,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.ink,
    backgroundColor: colors.violet,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontFamily: fonts.pixelNum, fontSize: 12, lineHeight: 14, color: colors.white },
});
