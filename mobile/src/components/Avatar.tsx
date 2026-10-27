import type { BearLook } from '@shared/types';
import { StyleSheet, View } from 'react-native';
import { Sprite } from '@/components/pixel';
import { colors } from '@/constants/theme';
import { type SpriteKey, sprites } from '@/sprites';

export type PortraitLook = Pick<BearLook, 'fur' | 'face' | 'chest'>;

/** Тохируулаагүй (эсвэл төрх нь ирээгүй өрсөлдөгчийн) баавгай */
const DEFAULT: PortraitLook = { fur: 'brown', face: 'calm', chest: true };

/** Баавгайн хөрөг (scripts/avatar-sprites.ts): 48 нь аватарт, 160 нь том урьдчилсан харагдацад. */
export function avatarSprite({ fur, face, chest }: PortraitLook, px: 48 | 160): SpriteKey {
  const key = `avatar_${fur}_${face}_${chest ? 'patch' : 'plain'}_${px}x${px}`;
  // хуучин (офлайн кэшэлсэн) профайлд үс, царай байхгүй
  return key in sprites ? (key as SpriteKey) : avatarSprite(DEFAULT, px);
}

/** Профайлын аватар: ягаан тойрог, доороосоо тогтсон баавгайн хөрөг (сонгосон үс, царай, цээж). */
export function Avatar({ size = 48, look = DEFAULT, border, label }: { size?: number; look?: PortraitLook; border?: number; label?: string }) {
  return (
    <View
      style={[
        styles.circle,
        { width: size, height: size, borderRadius: size / 2 },
        border ? { borderWidth: border, borderColor: colors.white } : null,
      ]}
    >
      <Sprite id={avatarSprite(look, size > 100 ? 160 : 48)} label={label} />
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { backgroundColor: colors.violet, overflow: 'hidden', alignItems: 'center', justifyContent: 'flex-end' },
});
