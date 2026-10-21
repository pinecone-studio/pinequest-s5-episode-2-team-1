import type { HealthResponse } from '@shared/types';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { API_URL, api } from '@/api/client';
import { colors, fonts } from '@/constants/theme';
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

  const label = ok === null ? S.health.checking : ok ? S.health.ok : S.health.fail;
  return (
    <View style={styles.row} accessible accessibilityLabel={`${label} · ${API_URL}`}>
      <View style={[styles.dot, { backgroundColor: ok === null ? colors.stone : ok ? colors.okText : colors.dangerText }]} />
      <Text style={[styles.text, ok === false && { color: colors.dangerText }]}>
        {label} · {API_URL}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  text: { fontFamily: fonts.medium, fontSize: 12, color: colors.muted, textAlign: 'center' },
});
