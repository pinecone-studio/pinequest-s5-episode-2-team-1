import { StyleSheet } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { wood } from './wood';

const W = 22;

/** Босоо модон банз + доод талын шүдлэг ирмэг (pixel). Эцэг View-ийг бүхэлд нь дүүргэнэ. */
export function WoodStripes({ width, height }: { width: number; height: number }) {
  const cols = Array.from({ length: Math.ceil(width / W) + 1 }, (_, i) => i);
  const fill = (i: number) => (i % 2 ? wood.light : wood.dark);
  // 3 банз тутмын нэг нь урт унжина
  const drop = (i: number) => i % 3 === 1;
  return (
    <Svg width={width} height={height + 10} style={StyleSheet.absoluteFill}>
      {cols.map((i) => (
        <Rect key={i} x={i * W} y={0} width={W} height={height + (drop(i) ? 8 : 3)} fill={fill(i)} />
      ))}
      {cols.map((i) => (
        <Rect key={`e${i}`} x={i * W} y={height + (drop(i) ? 8 : 3)} width={W} height={3} fill={wood.edge} />
      ))}
    </Svg>
  );
}
