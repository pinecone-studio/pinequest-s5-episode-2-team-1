import { StyleSheet, View } from 'react-native';
import { PressScale, Sprite } from '@/components/pixel';
import { colors } from '@/constants/theme';
import type { SpriteKey } from '@/sprites';

/** Charlie маягийн дөрвөлжин товч: цагаан, ink хүрээ, баруун-доош хатуу сүүдэр, голдоо pixel icon. */
export function PixelButton({ icon, label, onPress }: { icon: SpriteKey; label: string; onPress: () => void }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.shadow} />
      <PressScale accessibilityRole="button" accessibilityLabel={label} onPress={onPress} scaleTo={0.9} style={styles.btn}>
        <Sprite id={icon} />
      </PressScale>
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
});
