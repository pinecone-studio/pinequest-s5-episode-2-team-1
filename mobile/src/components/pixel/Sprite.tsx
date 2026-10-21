import { useEffect, useState } from 'react';
import { Image, type ImageStyle, type StyleProp, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
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

/** Хэвтээ sprite sheet-ийн `frame` дахь frame (sheet-ийг `frames` тэнцүү хэсэгт хуваана). */
export function SheetFrame({ id, frames, frame, label }: { id: SpriteKey; frames: number; frame: number; label?: string }) {
  const s = sprites[id];
  const w = s.width / frames;
  return (
    <View style={{ width: w, height: s.height, overflow: 'hidden' }}>
      <Sprite id={id} label={label} style={{ marginLeft: -frame * w }} />
    </View>
  );
}

/** Sheet-ийн `loop` frame-уудыг `ms` тутамд ээлжлэн тоглуулна ("motion бууруулах" үед эхний frame дээр зогсоно). */
export function SheetLoop({ id, frames, loop, ms, label }: { id: SpriteKey; frames: number; loop: number[]; ms: number; label?: string }) {
  const reduce = useReducedMotion();
  const [i, setI] = useState(0);
  useEffect(() => {
    if (reduce) return;
    const t = setInterval(() => setI((n) => (n + 1) % loop.length), ms);
    return () => clearInterval(t);
  }, [reduce, loop.length, ms]);
  return <SheetFrame id={id} frames={frames} frame={loop[reduce ? 0 : i]} label={label} />;
}

/** Sheet-ийн нэг frame-ийн хэмжээ (frames = 1 бол бүтэн зураг). */
export function frameSize(id: SpriteKey, frames: number): { width: number; height: number } {
  const s = sprites[id];
  return { width: s.width / frames, height: s.height };
}

export function spriteSize(id: SpriteKey): { width: number; height: number } {
  const s = sprites[id];
  return { width: s.width, height: s.height };
}
