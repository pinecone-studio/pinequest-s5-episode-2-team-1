import { type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';
import Svg, { Polygon } from 'react-native-svg';
import { teamColors } from '@/constants/theme';

/**
 * VS дэлгэцийн ташуу туузууд (цэнхэр, ягаан, цагаан): зүүн доороос баруун дээш. viewBox 100×100-г
 * хайрцагт нь сунгана, тиймээс ямар ч хэмжээтэй карт, дэлгэц дээр ижил хэв маяг.
 */
export function ArenaStripes({ style, intensity = 1 }: { style?: StyleProp<ViewStyle>; intensity?: number }) {
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, style]}>
      <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
        <Polygon points="-10,78 110,8 110,30 -10,100" fill={teamColors.b.main} opacity={0.85 * intensity} />
        <Polygon points="-10,70 110,0 110,6 -10,76" fill="#FFFFFF" opacity={0.9 * intensity} />
        <Polygon points="-10,62 110,-8 110,-3 -10,67" fill={teamColors.a.main} opacity={0.9 * intensity} />
        <Polygon points="-10,104 110,34 110,37 -10,107" fill="#FFFFFF" opacity={0.35 * intensity} />
        <Polygon points="-10,46 110,-24 110,-21 -10,49" fill={teamColors.a.main} opacity={0.45 * intensity} />
      </Svg>
    </View>
  );
}
