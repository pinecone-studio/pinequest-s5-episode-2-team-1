import type { MeResponse } from '@shared/types';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { api, errorText } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { Button } from '@/components/Button';
import { Sprite } from '@/components/pixel';
import { Muted } from '@/components/ui';
import { colors, fonts, radius } from '@/constants/theme';
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
    <View style={[styles.card, { backgroundColor: shield.held ? colors.sky : colors.white }]}>
      <View style={styles.head}>
        <Sprite id="icon_flame_24x24" />
        <Text accessibilityRole="header" style={styles.title}>
          {S.home.shieldTitle}
        </Text>
      </View>
      <Muted>{shield.held ? S.home.shieldOn : S.home.shieldOff}</Muted>
      {shield.usedDay ? <Muted>{S.home.shieldUsed(shield.usedDay)}</Muted> : null}
      {!shield.held && shield.nextBuyDay ? <Muted>{S.home.shieldCooldown(shield.nextBuyDay)}</Muted> : null}
      {shield.canBuy && <Button title={S.home.shieldBuy(shield.price)} variant="primary" small loading={busy} onPress={buy} />}
      {error ? <Muted>{error}</Muted> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.card, padding: 16, gap: 8 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontFamily: fonts.semibold, fontSize: 17, color: colors.ink },
});
