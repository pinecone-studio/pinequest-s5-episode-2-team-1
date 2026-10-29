import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { IntroReveal, introPlayed } from '@/components/IntroReveal';
import { LiveBear } from '@/components/LiveBear';
import { Logo } from '@/components/Logo';
import { Enter, Motion, Sprite, ZoomEnter } from '@/components/pixel';
import { APP_NAME } from '@/constants/app';
import { colors, fonts } from '@/constants/theme';
import { S } from '@/i18n/strings';

/**
 * 01 · Welcome: intro (IntroReveal) дууссаны дараа дээд буланд өнгөт дугуйнууд pop хийж гараад хөвнө, уриа ба товчнууд
 * шат дараатай орж ирнэ, доод ногоон толгодын цаанаас баавгай дээш гарч ирээд гараа даллана.
 */
export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const [ready, setReady] = useState(introPlayed);

  return (
    <View style={styles.root}>
      {ready ? (
        <>
          <ZoomEnter delay={0} style={[styles.abs, { left: -70, top: -80 }]}>
            <Motion preset="float">
              <View style={[styles.dot, { width: 240, height: 240, backgroundColor: colors.lime }]} />
            </Motion>
          </ZoomEnter>
          <ZoomEnter delay={120} style={[styles.abs, { right: 96, top: insets.top + 36 }]}>
            <Motion preset="bob" delay={300}>
              <View style={[styles.dot, { width: 72, height: 72, backgroundColor: colors.indigo }]} />
            </Motion>
          </ZoomEnter>
          <ZoomEnter delay={220} style={[styles.abs, { right: -56, top: insets.top + 70 }]}>
            <Motion preset="float" delay={900}>
              <View style={[styles.dot, { width: 150, height: 150, backgroundColor: colors.violet }]} />
            </Motion>
          </ZoomEnter>

          <View style={styles.hill} />
          <Animated.View entering={SlideInDown.delay(380).springify().damping(14)} style={styles.bear}>
            <LiveBear anim="welcome" w={270} px={3} label="Шинэ найзаа угтаж гараа дэлгэсэн pixel хүрэн баавгай, ногоон ороолттой" />
          </Animated.View>
          <ZoomEnter delay={900} style={[styles.abs, { left: 28, bottom: 150 }]}>
            <Motion preset="twinkle">
              <Sprite id="icon_star_36x36" />
            </Motion>
          </ZoomEnter>
          <ZoomEnter delay={1050} style={[styles.abs, { right: 28, bottom: 190 }]}>
            <Motion preset="twinkle" delay={700}>
              <Sprite id="btn_honey_36x36" />
            </Motion>
          </ZoomEnter>

          <View style={[styles.content, { paddingTop: insets.top + 96 }]}>
            <Enter index={0} style={styles.brand}>
              <Logo size={48} />
              <Text style={styles.wordmark}>{APP_NAME}</Text>
            </Enter>
            <Enter index={1} style={styles.copy}>
              <Text accessibilityRole="header" style={styles.headline}>
                {S.auth.tagline}
              </Text>
              <Text style={styles.sub}>{S.welcome.tagline}</Text>
            </Enter>
            <Enter index={3} style={styles.actions}>
              <Button title={S.welcome.start} onPress={() => router.push('/register')} />
              <Button title={S.welcome.haveAccount} variant="ghost" onPress={() => router.push('/login')} style={styles.outline} />
            </Enter>
          </View>
        </>
      ) : (
        <IntroReveal onDone={() => setReady(true)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper, overflow: 'hidden' },
  abs: { position: 'absolute' },
  dot: { borderRadius: 999 },
  content: { paddingHorizontal: 32, gap: 18 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  wordmark: { fontFamily: fonts.pixel, fontSize: 30, lineHeight: 34, color: colors.violet },
  copy: { gap: 8 },
  headline: { fontFamily: fonts.extrabold, fontSize: 28, lineHeight: 33, letterSpacing: -0.6, color: colors.ink },
  sub: { fontFamily: fonts.medium, fontSize: 16, lineHeight: 22, color: colors.muted },
  actions: { gap: 12 },
  outline: { borderWidth: 2, borderColor: colors.indigo },
  // доод ногоон толгод: баавгайн хөл түүний ард, дэлгэцийн ёроолд тасарна
  hill: { position: 'absolute', left: -40, right: -40, bottom: -60, height: 200, borderTopLeftRadius: 200, borderTopRightRadius: 200, backgroundColor: colors.lime },
  bear: { position: 'absolute', left: 0, right: 0, bottom: -135, alignItems: 'center' },
});
