import { BAG_ITEMS } from '@shared/loot';
import type { MeResponse } from '@shared/types';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { api, errorText } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { Button } from '@/components/Button';
import { Sprite } from '@/components/pixel';
import { colors, fonts, radius } from '@/constants/theme';
import { S } from '@/i18n/strings';
import { LOOT_ICON } from '@/lib/items';

/** Цүнхний хэрэглэгдэхүүн: тоо, зориулалт; зөгийн бал, мөсөн хонхоор зүрх нөхнө. */
export function BagItems() {
  const { me, setMe } = useAuth();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  if (!me) return null;
  const owned = BAG_ITEMS.filter((i) => me.bag[i] > 0);
  const full = me.lives >= me.maxLives;

  async function useItem(item: 'honey' | 'bell') {
    if (busy) return;
    setBusy(true);
    setNote('');
    try {
      const r = await api<MeResponse>(`/bag/${item}`, { method: 'POST' });
      setMe(r.me);
      setNote(item === 'bell' ? S.items.bellUsed : S.items.honeyUsed);
    } catch (e) {
      setNote(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  if (!owned.length) return <Text style={styles.empty}>{S.items.none}</Text>;
  return (
    <View style={{ gap: 10 }}>
      {owned.map((i) => (
        <View key={i} style={styles.row} accessible={i !== 'honey' && i !== 'bell'} accessibilityLabel={`${S.items[i].name} ×${me.bag[i]}. ${S.items[i].desc}`}>
          <View style={styles.icon}>
            <Sprite id={LOOT_ICON[i]} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.name}>
              {S.items[i].name} <Text style={styles.qty}>×{me.bag[i]}</Text>
            </Text>
            <Text style={styles.desc}>{S.items[i].desc}</Text>
          </View>
          {i === 'honey' || i === 'bell' ? (
            <Button title={full ? S.items.full : S.items.use} accessibilityLabel={`${S.items[i].name}. ${full ? S.items.full : S.items.use}`} small style={{ minHeight: 56 }} disabled={full} loading={busy} onPress={() => useItem(i)} />
          ) : null}
        </View>
      ))}
      {note ? <Text style={styles.note}>{note}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: radius.md, backgroundColor: colors.white, minHeight: 72 },
  icon: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#FFF1D2', alignItems: 'center', justifyContent: 'center' },
  name: { fontFamily: fonts.bold, fontSize: 16, color: colors.ink },
  qty: { fontFamily: fonts.extrabold, fontSize: 15, color: '#9A5A22' },
  desc: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 19, color: colors.muted },
  empty: { fontFamily: fonts.medium, fontSize: 15, color: colors.muted },
  note: { fontFamily: fonts.semibold, fontSize: 14, color: colors.muted, textAlign: 'center' },
});
