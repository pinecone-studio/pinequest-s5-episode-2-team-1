import { Image, type ImageStyle, type StyleProp } from 'react-native';
import { type SpriteKey, sprites } from '@/sprites';

/**
 * Pixel art sprite. Sprite бүр тодорхой хэмжээ (dp)-ээр, 1x/2x/3x нягтралд nearest-neighbor аргаар
 * урьдчилан томруулагдсан (mobile/scripts/build-sprites.py) тул runtime дээр дахин resample хийгдэхгүй,
 * бүдгэрэхгүй. `id` нь `<нэр>_<өргөн>x<өндөр>` хэлбэртэй бөгөөд буруу хослолыг TypeScript барина.
 */
export function Sprite({ id, style, label }: { id: SpriteKey; style?: StyleProp<ImageStyle>; label?: string }) {
  const s = sprites[id];
  return (
    <Image
      source={s.source}
      accessible={!!label}
      accessibilityLabel={label}
      accessibilityRole={label ? 'image' : undefined}
      resizeMode="stretch"
      fadeDuration={0}
      // web дээр шүүлтүүргүй (crisp) томруулалт
      style={[{ width: s.width, height: s.height, imageRendering: 'pixelated' } as ImageStyle, style]}
    />
  );
}

export function spriteSize(id: SpriteKey): { width: number; height: number } {
  const s = sprites[id];
  return { width: s.width, height: s.height };
}
