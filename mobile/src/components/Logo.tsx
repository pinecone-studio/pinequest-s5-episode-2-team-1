import { Image, type ImageStyle, type StyleProp } from 'react-native';
import { colors } from '@/constants/theme';

/** Апп-ын лого: малгайтай баавгайн icon (scripts/logo-sprites.ts), бөөрөнхий булантай. */
export function Logo({ size = 96, style }: { size?: number; style?: StyleProp<ImageStyle> }) {
  return (
    <Image
      source={require('../../assets/images/logo.png')}
      accessibilityRole="image"
      accessibilityLabel="KUMA лого: төгсөлтийн малгайтай хүрэн баавгай"
      fadeDuration={0}
      style={[
        // web дээр шүүлтүүргүй (crisp) томруулалт
        { width: size, height: size, borderRadius: size * 0.24, borderWidth: 3, borderColor: colors.indigo, imageRendering: 'pixelated' } as ImageStyle,
        style,
      ]}
    />
  );
}
