import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { PixelBox, PixelText, Tiled, wood } from '@/components/pinecones';

const PLAQUE = '#2B2420';
const PLAQUE_RIM = '#E8C9A0';
const INK = '#F7EBD8';

/** Дэлгүүрийн хэсгийн гарчиг: дэлгэцийн өргөнөөр тоосгон хана, зүүн доод талд нь бараан самбар дээр pixel бичиг. */
export function BrickBanner({ title }: { title: string }) {
  const { width } = useWindowDimensions();
  return (
    <View accessible accessibilityRole="header" accessibilityLabel={title} style={styles.wrap}>
      <Tiled id="wall_bricks_144x60" width={width} height={60} />
      <PixelBox fill={PLAQUE_RIM} edge={wood.edge} border={1} radius={1} style={styles.plaque}>
        <PixelBox fill={PLAQUE} edge={PLAQUE} border={0} radius={0} style={styles.inner}>
          <PixelText text={title} px={3} color={INK} shadow="#000000" />
        </PixelBox>
      </PixelBox>
    </View>
  );
}

const styles = StyleSheet.create({
  // Screen-ий 20 padding-ийг давж дэлгэцийн ирмэг хүртэл; самбар доошоо 21dp унжина
  wrap: { marginHorizontal: -20, marginTop: 12, marginBottom: 33 },
  plaque: { position: 'absolute', left: 18, bottom: -21, padding: 6 },
  inner: { paddingHorizontal: 12, paddingVertical: 6 },
});
