import { type ReactNode, useState } from 'react';
import { type StyleProp, View, type ViewStyle } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { P, stepShape } from './pixelShape';

/**
 * Pixel хүрээтэй хайрцаг: шатлсан булан, `border` pixel зузаан хүрээ, сонголтоор баруун/доош pixel сүүдэр (хайрцагны
 * гадна зурагдана). Хэмжээг onLayout-оор авч хүрээг хүүхдүүдийн ард SVG-ээр зурна. `radius`, `border`, `shadow` нь pixel (P dp).
 */
export function PixelBox({
  fill,
  edge,
  radius = 2,
  border = 1,
  shadow,
  shadowColor,
  style,
  children,
}: {
  fill: string;
  edge: string;
  radius?: number;
  border?: number;
  shadow?: [number, number];
  shadowColor?: string;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}) {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [sx, sy] = shadow ?? [0, 0];
  let frame: ReactNode = null;
  if (size) {
    const w = Math.round(size.w / P);
    const h = Math.round(size.h / P);
    const layers: [string, [number, number, number, number][]][] = [
      [shadowColor ?? edge, shadow ? stepShape(w, h, radius, sx, sy) : []],
      [edge, stepShape(w, h, radius)],
      [fill, stepShape(w - 2 * border, h - 2 * border, Math.max(0, radius - border), border, border)],
    ];
    frame = (
      <Svg width={(w + sx) * P} height={(h + sy) * P} style={{ position: 'absolute', left: 0, top: 0 }} pointerEvents="none">
        {layers.flatMap(([color, rects], l) =>
          rects.map(([x, y, rw, rh], i) => <Rect key={`${l}-${i}`} x={x * P} y={y * P} width={rw * P} height={rh * P} fill={color} />),
        )}
      </Svg>
    );
  }
  return (
    <View style={style} onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      {frame}
      {children}
    </View>
  );
}
