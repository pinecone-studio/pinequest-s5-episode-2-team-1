import type { AvatarLook, MeResponse, ShopItem, ShopResponse, Slot } from '@shared/types';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { api, errorText } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { Avatar } from '@/components/Avatar';
import { ShieldCard } from '@/components/ShieldCard';
import { Card, ErrorText, Muted, Screen, SectionTitle, Title } from '@/components/ui';
import { colors, radius, spacing } from '@/constants/theme';
import { S } from '@/i18n/strings';
import { confirm } from '@/lib/confirm';

const SLOTS: Slot[] = ['top', 'bottom', 'hair', 'shoes', 'accessory', 'skin'];

export default function ShopScreen() {
  const { me, setMe } = useAuth();
  const [items, setItems] = useState<ShopItem[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const apply = useCallback(
    (r: ShopResponse) => {
      setItems(r.items);
      setMe(r.me);
    },
    [setMe],
  );

  const load = useCallback(async () => {
    try {
      apply(await api<ShopResponse>('/shop'));
    } catch (e) {
      setError(errorText(e));
    }
  }, [apply]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function act(key: string, fn: () => Promise<void>) {
    setBusy(key);
    setError('');
    setMessage('');
    try {
      await fn();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(null);
    }
  }

  async function onItem(item: ShopItem) {
    if (busy) return;
    if (item.equipped) {
      if (item.slot !== 'accessory') return;
      await act(item.id, async () => {
        setMe((await api<MeResponse>('/avatar/equip', { body: { slot: item.slot, itemId: null } })).me);
        await load();
      });
      return;
    }
    if (item.owned) {
      await act(item.id, async () => {
        setMe((await api<MeResponse>('/avatar/equip', { body: { slot: item.slot, itemId: item.id } })).me);
        await load();
      });
      return;
    }
    if (item.locked) return;
    if (!(await confirm(S.shop.buyConfirm(item.name, item.price), S.shop.buy))) return;
    await act(item.id, async () => {
      apply(await api<ShopResponse>(`/shop/${item.id}/buy`, { method: 'POST' }));
      setMessage(S.shop.bought(item.name));
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    });
  }

  if (!me || !items) {
    return (
      <Screen contentStyle={styles.center}>
        <ActivityIndicator color={colors.primary} />
        <ErrorText>{error}</ErrorText>
      </Screen>
    );
  }

  return (
    <Screen>
      <Title>{S.shop.title}</Title>
      <Card style={styles.hero}>
        <Avatar look={me.avatar} size={120} />
        <View style={{ flex: 1, gap: spacing.sm }}>
          <Text style={styles.points}>{S.shop.points(me.points)}</Text>
          <Text style={styles.level}>{S.home.level(me.level)}</Text>
          <Muted>{S.shop.hint}</Muted>
        </View>
      </Card>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      <ErrorText>{error}</ErrorText>

      <ShieldCard />

      {SLOTS.map((slot) => (
        <View key={slot} style={{ gap: spacing.sm }}>
          <SectionTitle>{S.shop.slots[slot]}</SectionTitle>
          <View style={styles.grid}>
            {items
              .filter((i) => i.slot === slot)
              .map((item) => (
                <ItemTile
                  key={item.id}
                  item={item}
                  preview={{ ...me.avatar, [slot]: item.style }}
                  points={me.points}
                  busy={busy === item.id}
                  onPress={() => onItem(item)}
                />
              ))}
          </View>
        </View>
      ))}
    </Screen>
  );
}

function ItemTile({
  item,
  preview,
  points,
  busy,
  onPress,
}: {
  item: ShopItem;
  preview: AvatarLook;
  points: number;
  busy: boolean;
  onPress: () => void;
}) {
  let status: string;
  let statusColor: string = colors.muted;
  if (item.equipped) {
    status = item.slot === 'accessory' ? `${S.shop.equipped} · ${S.shop.remove}` : S.shop.equipped;
    statusColor = colors.success;
  } else if (item.owned) {
    status = S.shop.wear;
    statusColor = colors.primaryDark;
  } else if (item.locked) {
    status = S.shop.locked(item.minLevel);
  } else {
    status = S.shop.price(item.price);
    statusColor = item.price <= points ? colors.gold : colors.danger;
  }

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={busy || (item.locked && !item.owned)}
      style={({ pressed }) => [
        styles.tile,
        item.equipped && styles.tileEquipped,
        item.locked && !item.owned && styles.tileLocked,
        pressed && { transform: [{ scale: 0.97 }] },
      ]}
    >
      {busy ? <ActivityIndicator color={colors.primary} style={{ height: 85 }} /> : <Avatar look={preview} size={64} />}
      <Text style={styles.tileName} numberOfLines={2}>
        {item.name}
      </Text>
      <Text style={[styles.tileStatus, { color: statusColor }]} numberOfLines={1}>
        {status}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
  hero: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  points: { fontSize: 22, fontWeight: '900', color: colors.gold },
  level: { fontSize: 16, fontWeight: '800', color: colors.primary },
  message: { fontSize: 15, fontWeight: '700', color: colors.success, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tile: {
    width: '31.5%',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    gap: 2,
  },
  tileEquipped: { borderColor: colors.success, backgroundColor: colors.successSoft },
  tileLocked: { opacity: 0.55 },
  tileName: { fontSize: 13, fontWeight: '700', color: colors.text, textAlign: 'center', minHeight: 34 },
  tileStatus: { fontSize: 12, fontWeight: '800' },
});
