import type { HealthResponse } from '@shared/types';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { API_URL, api, errorText } from '@/api/client';
import { APP_NAME } from '@/constants/app';
import { colors, radius, spacing } from '@/constants/theme';
import { S } from '@/i18n/strings';

// M0: утаснаас /health дуудагдаж байгааг шалгах түр дэлгэц.
export default function HealthScreen() {
  const [state, setState] = useState<{ status: 'loading' | 'ok' | 'fail'; data?: HealthResponse; error?: string }>({
    status: 'loading',
  });

  const check = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      const data = await api<HealthResponse>('/health');
      setState({ status: 'ok', data });
    } catch (e) {
      setState({ status: 'fail', error: errorText(e) });
    }
  }, []);

  useEffect(() => {
    check();
  }, [check]);

  return (
    <SafeAreaView style={styles.safe}>
      <Text style={styles.title}>{APP_NAME}</Text>
      <View style={styles.card}>
        {state.status === 'loading' && (
          <>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.text}>{S.health.checking}</Text>
          </>
        )}
        {state.status === 'ok' && (
          <>
            <Text style={[styles.status, { color: colors.success }]}>✓ {S.health.ok}</Text>
            <Text style={styles.text}>{S.health.questions(state.data?.questions ?? 0)}</Text>
          </>
        )}
        {state.status === 'fail' && (
          <>
            <Text style={[styles.status, { color: colors.danger }]}>✕ {S.health.fail}</Text>
            <Text style={styles.text}>{state.error}</Text>
          </>
        )}
        <Text style={styles.muted}>
          {S.health.apiUrl}: {API_URL}
        </Text>
      </View>
      <Pressable style={styles.button} onPress={check}>
        <Text style={styles.buttonText}>{S.common.retry}</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.xl },
  title: { fontSize: 34, fontWeight: '800', color: colors.primary },
  card: {
    alignSelf: 'stretch',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.md,
    alignItems: 'center',
  },
  status: { fontSize: 20, fontWeight: '700' },
  text: { fontSize: 16, color: colors.text, textAlign: 'center' },
  muted: { fontSize: 13, color: colors.muted },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
  },
  buttonText: { color: colors.white, fontSize: 16, fontWeight: '700' },
});
