import { isPaidPlan } from '@shared/plan';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/auth/AuthContext';
import { Button } from '@/components/Button';
import { Enter } from '@/components/pixel';
import { BuySheet } from '@/components/shop/BuySheet';
import { EventHero } from '@/components/shop/EventHero';
import { Grid } from '@/components/shop/Grid';
import { ItemCard } from '@/components/shop/ItemCard';
import type { BuyTarget } from '@/components/shop/useBuy';
import { ErrorText } from '@/components/ui';
import { arena, colors, fonts } from '@/constants/theme';
import { SH } from '@/i18n/shop';
import { S } from '@/i18n/strings';
import { goBack } from '@/lib/nav';
import { eventById, eventRows } from '@/lib/pixelBear/events';
import { useOutfitStatus } from '@/lib/pixelBear/shopStatus';
import { useOutfits } from '@/lib/pixelBear/useOutfits';

/**
 * Эвентийн хуудас (дэлгүүрийн banner-аас): дээр нь шинэ хувцсаа өмссөн баавгайнуудын бүлэг ба үлдсэн хоног, доор нь
 * Plus-аар нээгдэх эгнээ ба боргоцойгоор авах эгнээ. Карт дарахад дэлгүүрийн худалдан авах sheet.
 */
export default function EventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const ev = eventById(String(id));
  const outfits = useOutfits();
  const statusOf = useOutfitStatus();
  const { me } = useAuth();
  const paid = isPaidPlan(me?.plan ?? 'free');
  const insets = useSafeAreaInsets();
  const [target, setTarget] = useState<BuyTarget>({ kind: 'outfit', id: ev?.ids[0] ?? 'scarf' });
  const [sheet, setSheet] = useState(false);
  const close = () => goBack('/shop');

  if (!ev) {
    return (
      <View style={[styles.root, styles.missing, { paddingTop: insets.top + 40 }]}>
        <StatusBar style="light" />
        <Text style={styles.title}>{SH.notFound}</Text>
        <Button title={SH.toShop} variant="lemon" onPress={() => router.replace('/shop')} />
      </View>
    );
  }

  const views = new Map(outfits.views.map((v) => [v.def.id, v]));
  const { quest, shop } = eventRows(ev);
  const rows = [
    { key: 'quest', kicker: SH.questKicker, title: paid ? SH.questTitlePaid : SH.questTitle, ids: quest, badge: S.shop.plusTag },
    { key: 'shop', kicker: SH.shopKicker, title: SH.shopTitle, ids: shop, badge: undefined },
  ].filter((r) => r.ids.length);

  return (
    <View style={styles.root}>
      <StatusBar style={ev.ink === colors.white ? 'light' : 'dark'} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
        <EventHero ev={ev} top={insets.top} onClose={close} />
        <ErrorText>{outfits.error}</ErrorText>
        {!outfits.loaded ? <ActivityIndicator color={colors.lavender} style={styles.loading} /> : null}
        {rows.map((r, i) => {
          const list = r.ids.flatMap((oid) => views.get(oid) ?? []);
          const owned = list.filter((v) => v.owned).length;
          return (
            <Enter key={r.key} index={i} style={[styles.section, i > 0 && styles.divider]}>
              <View style={styles.head}>
                <Text style={styles.kicker}>{r.kicker}</Text>
                <Text style={styles.count} accessibilityLabel={SH.ownedOfA11y(owned, list.length)}>
                  {SH.ownedOf(owned, list.length)}
                </Text>
              </View>
              <Text accessibilityRole="header" style={styles.title}>
                {r.title}
              </Text>
              <Grid
                items={list}
                gap={12}
                render={(v) => (
                  <ItemCard
                    key={v.def.id}
                    dark
                    outfit={v.def}
                    badge={r.badge}
                    status={statusOf(v)}
                    height={132}
                    onPress={() => {
                      setTarget({ kind: 'outfit', id: v.def.id });
                      setSheet(true);
                    }}
                  />
                )}
              />
              {r.key === 'quest' && !paid ? <Button title={SH.getPlus} variant="lime" onPress={() => router.push('/plans')} /> : null}
            </Enter>
          );
        })}
      </ScrollView>
      <BuySheet target={target} visible={sheet} outfits={outfits} onClose={() => setSheet(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: arena.bg },
  missing: { alignItems: 'center', gap: 20, paddingHorizontal: 24 },
  loading: { marginTop: 20 },
  section: { paddingHorizontal: 20, paddingTop: 24, gap: 6 },
  divider: { marginTop: 18, borderTopWidth: 1, borderColor: arena.line },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  kicker: { fontFamily: fonts.extrabold, fontSize: 13, letterSpacing: 1, color: colors.lavender, opacity: 0.8 },
  count: { fontFamily: fonts.pixelNum, fontSize: 14, color: colors.lavender },
  title: { fontFamily: fonts.extrabold, fontSize: 21, color: colors.white, marginBottom: 4 },
});
