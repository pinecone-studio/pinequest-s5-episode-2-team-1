import { type StyleProp, View, type ViewStyle } from 'react-native';
import { Sprite, spriteSize } from '@/components/pixel';
import type { SpriteKey } from '@/sprites';

/** Sprite-ийг width×height талбайд давтан дүүргэнэ (web дээр resizeMode="repeat" нэг л удаа зурдаг тул өөрсдөө давтана). */
export function Tiled({ id, width, height, style }: { id: SpriteKey; width: number; height: number; style?: StyleProp<ViewStyle> }) {
  const { width: tw, height: th } = spriteSize(id);
  const cols = Math.ceil(width / tw);
  const rows = Math.ceil(height / th);
  return (
    <View style={[{ width, height, overflow: 'hidden' }, style]} pointerEvents="none">
      {Array.from({ length: rows }, (_, r) => (
        <View key={r} style={{ flexDirection: 'row', width: cols * tw }}>
          {Array.from({ length: cols }, (_, c) => (
            <Sprite key={c} id={id} />
          ))}
        </View>
      ))}
    </View>
  );
}
