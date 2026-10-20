import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '@/auth/AuthContext';
import { Button } from '@/components/Button';
import { ServerStatus } from '@/components/ServerStatus';
import { APP_NAME } from '@/constants/app';
import { colors, spacing } from '@/constants/theme';
import { S } from '@/i18n/strings';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <RootNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

function RootNavigator() {
  const { status, retryBoot } = useAuth();

  if (status === 'loading') {
    return (
      <View style={styles.center}>
        <Text style={styles.brand}>{APP_NAME}</Text>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (status === 'offline') {
    return (
      <View style={styles.center}>
        <Text style={styles.brand}>{APP_NAME}</Text>
        <Text style={styles.title}>{S.health.offlineTitle}</Text>
        <Text style={styles.hint}>{S.health.offlineHint}</Text>
        <Button title={S.common.retry} onPress={retryBoot} />
        <ServerStatus />
      </View>
    );
  }

  const signedIn = status === 'signedIn';
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="task/[subject]" />
        <Stack.Screen name="duel/[id]" options={{ gestureEnabled: false }} />
      </Stack.Protected>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
      </Stack.Protected>
    </Stack>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    padding: spacing.xl,
    backgroundColor: colors.bg,
  },
  brand: { fontSize: 36, fontWeight: '900', color: colors.primary },
  title: { fontSize: 20, fontWeight: '800', color: colors.text, textAlign: 'center' },
  hint: { fontSize: 15, color: colors.muted, textAlign: 'center', lineHeight: 22 },
});
