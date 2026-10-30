import { View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { GLYPH_ROWS, pixelsOf } from './pixelFont';

/** pixelFont-оор зурсан гарчиг: `px` dp-ийн дөрвөлжин бүр, баруун доош нэг pixel-ийн сүүдэртэй. */
export function PixelText({ text, px, color, shadow }: { text: string; px: number; color: string; shadow: string }) {
  const { cells, width } = pixelsOf(text);
  // View-д ороосон: web дээр static <svg> нь PixelBox-ийн absolute хүрээний доор зурагддаг
  return (
    <View accessible accessibilityLabel={text}>
      <Svg width={(width + 1) * px} height={(GLYPH_ROWS + 1) * px}>
        {cells.map(([x, y]) => (
          <Rect key={`s${x},${y}`} x={(x + 1) * px} y={(y + 1) * px} width={px} height={px} fill={shadow} />
        ))}
        {cells.map(([x, y]) => (
          <Rect key={`${x},${y}`} x={x * px} y={y * px} width={px} height={px} fill={color} />
        ))}
      </Svg>
    </View>
  );
}
