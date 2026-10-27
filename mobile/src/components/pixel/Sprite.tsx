import type { BearFur } from '@shared/types';
import { createContext, useContext, useEffect, useState } from 'react';
import { Image, type ImageStyle, type StyleProp, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { type SpriteKey, sprites } from '@/sprites';

/**
 * Pixel art sprite. Sprite бүр тодорхой хэмжээ (dp)-ээр, 1x/2x/3x нягтралд nearest-neighbor аргаар
 * урьдчилан томруулагдсан (mobile/scripts/build-sprites.ts) тул runtime дээр дахин resample хийгдэхгүй,
 * бүдгэрэхгүй. `id` нь `<нэр>_<өргөн>x<өндөр>` хэлбэртэй бөгөөд буруу хослолыг TypeScript барина.
 */
/** Баавгайн үсний өнгө: баавгайтай sprite нь энэ өнгөний хувилбараараа зурагдана (анхдагч нь нэвтэрсэн хэрэглэгчийнх). */
export const FurContext = createContext<BearFur>('brown');

/** `<нэр>_<w>x<h>` → `<нэр>_<өнгө>_<w>x<h>` (scripts/build-sprites.ts); хувилбаргүй sprite өөрөө үлдэнэ */
function furVariant(id: SpriteKey, fur: BearFur): SpriteKey {
  if (fur === 'brown') return id;
  const key = id.replace(/_(\d+x\d+)$/, `_${fur}_$1`);
  return key in sprites ? (key as SpriteKey) : id;
}

export function Sprite({ id, style, label }: { id: SpriteKey; style?: StyleProp<ImageStyle>; label?: string }) {
  const s = sprites[furVariant(id, useContext(FurContext))];
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

/** Sprite sheet-ийн `frame` дахь frame: `frames` тэнцүү хэсэг, `cols` баганатай grid (өгөөгүй бол нэг мөр). */
export function SheetFrame({ id, frames, frame, label, cols = frames }: { id: SpriteKey; frames: number; frame: number; label?: string; cols?: number }) {
  const { width: w, height: h } = frameSize(id, frames, cols);
  return (
    <View style={{ width: w, height: h, overflow: 'hidden' }}>
      <Sprite id={id} label={label} style={{ marginLeft: -(frame % cols) * w, marginTop: -Math.floor(frame / cols) * h }} />
    </View>
  );
}

/** Sheet-ийн `loop` frame-уудыг `ms` тутамд ээлжлэн тоглуулна ("motion бууруулах" үед эхний frame дээр зогсоно). */
export function SheetLoop({
  id,
  frames,
  loop,
  ms,
  label,
  cols = frames,
}: {
  id: SpriteKey;
  frames: number;
  loop: number[];
  ms: number;
  label?: string;
  /** grid sheet-ийн баганын тоо (өгөөгүй бол нэг мөр) */
  cols?: number;
}) {
  const reduce = useReducedMotion();
  const [i, setI] = useState(0);
  useEffect(() => {
    if (reduce) return;
    const t = setInterval(() => setI((n) => (n + 1) % loop.length), ms);
    return () => clearInterval(t);
  }, [reduce, loop.length, ms]);
  return <SheetFrame id={id} frames={frames} cols={cols} frame={loop[reduce ? 0 : i]} label={label} />;
}

/** Sheet-ийн нэг frame-ийн хэмжээ (frames = 1 бол бүтэн зураг; `cols` баганатай grid). */
export function frameSize(id: SpriteKey, frames: number, cols = frames): { width: number; height: number } {
  const s = sprites[id];
  return { width: s.width / cols, height: s.height / Math.ceil(frames / cols) };
}

export function spriteSize(id: SpriteKey): { width: number; height: number } {
  const s = sprites[id];
  return { width: s.width, height: s.height };
}
