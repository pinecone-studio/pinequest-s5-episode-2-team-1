import { Onest_400Regular, Onest_500Medium, Onest_600SemiBold, Onest_700Bold, Onest_800ExtraBold } from '@expo-google-fonts/onest';
import { PixelifySans_500Medium, PixelifySans_700Bold } from '@expo-google-fonts/pixelify-sans';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '@/auth/AuthContext';
import { Button } from '@/components/Button';
import { Sprite } from '@/components/pixel';
import { ServerStatus } from '@/components/ServerStatus';
import { colors, fonts } from '@/constants/theme';
import { type } from '@/constants/type';
import { S } from '@/i18n/strings';
import { PixelBearProvider } from '@/lib/mock/pixelBear';

void SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Onest_400Regular,
    Onest_500Medium,
    Onest_600SemiBold,
    Onest_700Bold,
    Onest_800ExtraBold,
    PixelifySans_500Medium,
    PixelifySans_700Bold,
  });
  const ready = loaded || !!error;

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <PixelBearProvider>
          <StatusBar style="dark" />
          {/* Том дэлгэц (tablet / web) дээр 430px-ийн багана голлоно */}
          <View style={styles.outer}>
            <View style={styles.column}>
              <RootNavigator />
            </View>
          </View>
        </PixelBearProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

function RootNavigator() {
  const { status, retryBoot } = useAuth();

  if (status === 'loading') {
    return (
      <View style={[styles.center, { backgroundColor: colors.violet }]}>
        <Text style={styles.wordmark}>pine{'\n'}quest</Text>
        <ActivityIndicator color={colors.white} size="large" />
      </View>
    );
  }

  if (status === 'offline') {
    return (
      <View style={styles.center}>
        <Sprite id="bear_tired_scarf_164x280" label="Ядарсан баавгай" />
        <Text style={[type.h2, { textAlign: 'center' }]}>{S.health.offlineTitle}</Text>
        <Text style={[type.bodyMuted, { textAlign: 'center' }]}>{S.health.offlineHint}</Text>
        <Button title={S.common.retry} onPress={retryBoot} style={{ alignSelf: 'stretch' }} />
        <ServerStatus />
      </View>
    );
  }

  const signedIn = status === 'signedIn';
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.paper } }}>
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="calendar" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="task/[subject]" options={{ gestureEnabled: false, animation: 'slide_from_bottom' }} />
        <Stack.Screen name="duel/[id]" options={{ gestureEnabled: false }} />
      </Stack.Protected>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="welcome" />
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
      </Stack.Protected>
    </Stack>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1, backgroundColor: colors.paper },
  column: { flex: 1, width: '100%', maxWidth: 430, alignSelf: 'center', backgroundColor: colors.paper, overflow: 'hidden' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24, backgroundColor: colors.paper },
  wordmark: { fontFamily: fonts.pixel, fontSize: 66, lineHeight: 60, letterSpacing: -1, color: colors.lemon, textAlign: 'center' },
});
