import type { MeResponse } from '@shared/types';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { api, errorText } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { Button } from '@/components/Button';
import { Card, Muted } from '@/components/ui';
import { colors } from '@/constants/theme';
import { S } from '@/i18n/strings';

/** Streak хамгаалалтын төлөв + худалдаж авах товч (Нүүр, Дэлгүүр хоёуланд). */
export function ShieldCard() {
  const { me, setMe } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (!me) return null;

  async function buy() {
    setBusy(true);
    setError('');
    try {
      setMe((await api<MeResponse>('/shield/buy', { method: 'POST' })).me);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  const { shield } = me;
  return (
    <Card style={shield.held ? styles.active : undefined}>
      <Text style={styles.title}>🛡️ {S.home.shieldTitle}</Text>
      <Muted>{shield.held ? S.home.shieldOn : S.home.shieldOff}</Muted>
      {shield.usedDay ? <Muted>{S.home.shieldUsed(shield.usedDay)}</Muted> : null}
      {!shield.held && shield.nextBuyDay ? <Muted>{S.home.shieldCooldown(shield.nextBuyDay)}</Muted> : null}
      {shield.canBuy && <Button title={S.home.shieldBuy(shield.price)} variant="secondary" small loading={busy} onPress={buy} />}
      {error ? <Muted>{error}</Muted> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 17, fontWeight: '800', color: colors.text },
  active: { borderWidth: 2, borderColor: colors.success },
});
