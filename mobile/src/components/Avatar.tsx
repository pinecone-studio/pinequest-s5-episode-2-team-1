import { StyleSheet, View } from 'react-native';
import { Sprite } from '@/components/pixel';
import { colors } from '@/constants/theme';
import type { SpriteKey } from '@/sprites';

/** Профайлын аватар: ягаан тойрог, доороосоо тогтсон баавгайн толгой. */
export function Avatar({
  size = 48,
  head = 'head_idle_49x42',
  border,
}: {
  size?: number;
  head?: SpriteKey;
  border?: number;
}) {
  return (
    <View
      style={[
        styles.circle,
        { width: size, height: size, borderRadius: size / 2 },
        border ? { borderWidth: border, borderColor: colors.white } : null,
      ]}
    >
      <Sprite id={head} />
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { backgroundColor: colors.violet, overflow: 'hidden', alignItems: 'center', justifyContent: 'flex-end' },
});
