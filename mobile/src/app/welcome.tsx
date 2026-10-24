import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { LiveBear } from '@/components/LiveBear';
import { Motion, Sprite } from '@/components/pixel';
import { APP_NAME } from '@/constants/app';
import { colors, fonts } from '@/constants/theme';
import { S } from '@/i18n/strings';

/** 01 · Welcome */
export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const sheetHeight = 136 + Math.max(insets.bottom, 16);

  return (
    <View style={styles.root}>
      <View style={[styles.circle, { left: -60, top: 250, width: 510, height: 510, borderRadius: 255, backgroundColor: '#8C73FF' }]} />
      <View style={[styles.circle, { left: 30, top: 330, width: 330, height: 330, borderRadius: 165, backgroundColor: '#9C86FF' }]} />

      <View style={[styles.head, { top: Math.max(insets.top, 44) + 20 }]}>
        <Text accessibilityRole="header" style={styles.wordmark}>
          {APP_NAME}
        </Text>
        <Text style={styles.tagline}>{S.welcome.tagline}</Text>
      </View>

      <View style={[styles.abs, { left: 22, top: 300 }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Svg width={64} height={40} viewBox="0 0 64 40">
          <Path d="M4 30 L18 10 L28 26 L42 6 L56 24" fill="none" stroke={colors.lime} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      </View>
      <View style={[styles.abs, { right: 24, top: 270 }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Svg width={56} height={36} viewBox="0 0 56 36">
          <Path d="M4 26 L16 8 L26 22 L38 4 L50 20" fill="none" stroke={colors.lemon} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      </View>

      <Motion preset="twinkle" style={[styles.abs, { left: 44, top: 410 }]}>
        <Sprite id="icon_heart_36x36" />
      </Motion>
      <Motion preset="twinkle" delay={700} style={[styles.abs, { right: 40, top: 380 }]}>
        <Sprite id="icon_star_36x36" />
      </Motion>
      <Motion preset="twinkle" delay={700} style={[styles.abs, { right: 56, top: 560 }]}>
        <Sprite id="icon_coin_36x36" />
      </Motion>

      <View style={[styles.bear, { bottom: sheetHeight - 38 }]}>
        <LiveBear anim="welcome" w={270} px={3} label="Шинэ найзаа угтаж гараа дэлгээд өөрийгөө тэврэх pixel хүрэн баавгай, ногоон ороолттой" />
      </View>

      <View style={[styles.sheet, { height: sheetHeight }]}>
        <Button title={S.welcome.start} onPress={() => router.push('/register')} style={{ alignSelf: 'stretch' }} />
        <Pressable accessibilityRole="link" onPress={() => router.push('/login')} hitSlop={10} style={styles.linkWrap}>
          <Text style={styles.link}>{S.welcome.haveAccount}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.violet, overflow: 'hidden' },
  abs: { position: 'absolute' },
  circle: { position: 'absolute' },
  head: { position: 'absolute', left: 28, right: 28, gap: 14 },
  wordmark: { fontFamily: fonts.pixel, fontSize: 66, lineHeight: 60, letterSpacing: -1, color: colors.lemon },
  tagline: { fontFamily: fonts.medium, fontSize: 27, lineHeight: 31, letterSpacing: -0.5, color: colors.white },
  bear: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 26,
    paddingHorizontal: 24,
    backgroundColor: colors.paper,
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    gap: 4,
    alignItems: 'center',
  },
  linkWrap: { minHeight: 44, justifyContent: 'center' },
  link: { fontFamily: fonts.semibold, fontSize: 16, color: colors.ink },
});
