import type { HealthResponse } from '@shared/types';
import { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { API_URL, api } from '@/api/client';
import { colors } from '@/constants/theme';
import { S } from '@/i18n/strings';

/** Нэвтрэх дэлгэцийн доод хэсэгт: утас серверт хүрч байгаа эсэх (LAN асуудлыг шууд харуулна). */
export function ServerStatus() {
  const [ok, setOk] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    api<HealthResponse>('/health')
      .then(() => alive && setOk(true))
      .catch(() => alive && setOk(false));
    return () => {
      alive = false;
    };
  }, []);

  const label = ok === null ? S.health.checking : ok ? `✓ ${S.health.ok}` : `✕ ${S.health.fail}`;
  return (
    <Text style={[styles.text, ok === false && { color: colors.danger }]}>
      {label} · {API_URL}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: { fontSize: 12, color: colors.muted, textAlign: 'center' },
});
