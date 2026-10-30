import { View } from 'react-native';
import { spriteSize } from '@/components/pixel';
import { Tiled } from './Tiled';

const EDGE = 'wood_edge_144x21';

/** Босоо модон банз + доод талын шүдлэг ирмэг (pixel tile, scripts/pinecone-bg.ts). Эцэг View-ийн зүүн дээд буланд байрлана. */
export function WoodStripes({ width, height }: { width: number; height: number }) {
  return (
    <View style={{ position: 'absolute', left: 0, top: 0 }} pointerEvents="none">
      <Tiled id="wood_boards_144x144" width={width} height={height} />
      <Tiled id={EDGE} width={width} height={spriteSize(EDGE).height} />
    </View>
  );
}
