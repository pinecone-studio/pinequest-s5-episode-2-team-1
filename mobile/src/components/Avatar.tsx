import type { BearLook } from '@shared/types';
import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import { API_URL } from '@/api/client';
import { Sprite } from '@/components/pixel';
import { colors } from '@/constants/theme';
import { type SpriteKey, sprites } from '@/sprites';

export type PortraitLook = Pick<BearLook, 'fur' | 'face' | 'chest' | 'photo'>;

/** Тохируулаагүй (эсвэл төрх нь ирээгүй өрсөлдөгчийн) баавгай */
const DEFAULT: PortraitLook = { fur: 'brown', face: 'calm', chest: true };

/** Баавгайн хөрөг (scripts/avatar-sprites.ts): 48 нь аватарт, 160 нь том урьдчилсан харагдацад. */
export function avatarSprite({ fur, face, chest }: PortraitLook, px: 48 | 160): SpriteKey {
  const key = `avatar_${fur}_${face}_${chest ? 'patch' : 'plain'}_${px}x${px}`;
  // хуучин (офлайн кэшэлсэн) профайлд үс, царай байхгүй
  return key in sprites ? (key as SpriteKey) : avatarSprite(DEFAULT, px);
}

/**
 * Профайлын аватар: ягаан тойрог, доороосоо тогтсон баавгайн хөрөг (сонгосон үс, царай, цээж); өөрийн зураг
 * (look.photo) оруулсан бол тойргийг тэр зураг дүүргэнэ. Хөрөг тойргийн
 * дотор талыг дүүргэнэ: хэмжээ бүрт (тулааны 22 px-ээс засварын 172 px хүртэл) ижил харагдана. 48 px-ээс том бол
 * 160-ын зургийг багасгаж зурна (48-ыг томруулбал бүдэг, том пиксел болно).
 */
export function Avatar({ size = 48, look = DEFAULT, border, label }: { size?: number; look?: PortraitLook; border?: number; label?: string }) {
  const inner = size - 2 * (border ?? 0);
  return (
    <View
      style={[
        styles.circle,
        { width: size, height: size, borderRadius: size / 2 },
        border ? { borderWidth: border, borderColor: colors.white } : null,
      ]}
    >
      {look.photo ? (
        <Image source={{ uri: `${API_URL}/photos/${look.photo}` }} accessibilityLabel={label} style={{ width: inner, height: inner }} contentFit="cover" />
      ) : (
        <Sprite id={avatarSprite(look, inner > 48 ? 160 : 48)} label={label} style={{ width: inner, height: inner }} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { backgroundColor: colors.violet, overflow: 'hidden', alignItems: 'center', justifyContent: 'flex-end' },
});
