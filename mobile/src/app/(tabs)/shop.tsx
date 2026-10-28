import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { type ComponentRef, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { BgSwatch, type SwatchStatus } from '@/components/BgSwatch';
import { CostumeGrid, CostumePreview } from '@/components/CostumeGallery';
import { MagicBurst } from '@/components/MagicBurst';
import { OutfitCard } from '@/components/OutfitCard';
import { PressScale, Sprite } from '@/components/pixel';
import { PreviewStage } from '@/components/PreviewStage';
import { SegmentedTabs } from '@/components/SegmentedTabs';
import { ShieldCard } from '@/components/ShieldCard';
import { CountPill, formatNumber } from '@/components/StatPill';
import { ErrorText, Screen } from '@/components/ui';
import { colors, fonts, radius } from '@/constants/theme';
import { type } from '@/constants/type';
import { S } from '@/i18n/strings';
import { confirm } from '@/lib/confirm';
import { usePixelBear } from '@/lib/mock/pixelBear';
import { useOnline } from '@/lib/online';
import { BACKGROUNDS, bgById, outfitById, type OutfitId } from '@/lib/pixelBear/catalog';
import { type OutfitView, useOutfits } from '@/lib/pixelBear/useOutfits';

type Tab = 'bg' | 'outfit' | 'concept';

const chunk = <T,>(arr: T[], n: number): T[][] => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));

function statusOf(opts: { equipped: boolean; owned: boolean; price: number; coins: number; lockedLevel?: number | null }): SwatchStatus {
  const { equipped, owned, price, coins, lockedLevel } = opts;
  if (equipped) return { text: S.shop.equipped, color: colors.okText, showCoin: false, locked: false };
  if (owned) return { text: S.shop.owned, color: colors.okText, showCoin: false, locked: false };
  if (lockedLevel) return { text: S.shop.levelNeeded(lockedLevel), color: colors.dangerText, showCoin: false, locked: true };
  if (price > coins) return { text: formatNumber(price), a11y: S.shop.shortBy(formatNumber(price)), color: colors.dangerText, showCoin: true, locked: true };
  return { text: formatNumber(price), color: colors.ink, showCoin: true, locked: false };
}

/** 07 · Дэлгүүр: дэвсгэр өнгө (MVP) ба хувцас. Офлайн үед үзэж, авсан зүйлсээ сонгоно; худалдаж авахгүй. */
export default function ShopScreen() {
  const bear = usePixelBear();
  const outfits = useOutfits();
  const online = useOnline();
  const [tab, setTab] = useState<Tab>('bg');
  const [selBg, setSelBg] = useState(bear.bgId);
  const [selOutfit, setSelOutfit] = useState<OutfitId>(bear.outfitId);
  const [selConcept, setSelConcept] = useState('witch');
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [castKey, setCastKey] = useState(0);

  const isBg = tab === 'bg';
  const isConcept = tab === 'concept';
  const bgDef = bgById(isBg ? selBg : bear.bgId);
  const outfitView = outfits.views.find((v) => v.def.id === (isBg ? bear.outfitId : selOutfit)) ?? outfits.views[0];
  const outfitDef = outfitById(outfitView.def.id);

  // Одоо харж буй зүйлийн үйлдэл
  const cur = isBg
    ? {
      name: bgDef.name,
      equipped: bgDef.id === bear.bgId,
      owned: bear.ownedBgs.includes(bgDef.id),
      price: bear.priceOf('bg', bgDef.id),
      lockedLevel: null as number | null,
    }
    : {
      name: outfitDef.name,
      equipped: outfitDef.id === bear.outfitId,
      owned: outfitView.owned,
      price: outfitView.price,
      lockedLevel: outfitView.lockedLevel,
    };
  const cantAfford = !cur.owned && cur.price > bear.coins;
  const action = !outfits.loaded
    ? { title: '…', bg: colors.stoneAlt, fg: colors.muted, disabled: true }
    : cur.equipped
      ? { title: S.shop.equipped, bg: colors.white, fg: colors.okText, disabled: true }
      : cur.owned
        ? { title: S.shop.equip, bg: colors.indigo, fg: colors.white, disabled: false }
        : !online
          ? { title: S.offline.needsInternet, bg: colors.stoneAlt, fg: colors.muted, disabled: true }
          : cur.lockedLevel
            ? { title: S.shop.levelNeeded(cur.lockedLevel), bg: colors.stoneAlt, fg: colors.muted, disabled: true }
            : cantAfford
              ? { title: S.shop.noCoins, bg: colors.stoneAlt, fg: colors.muted, disabled: true }
              : { title: S.shop.buyFor(formatNumber(cur.price)), bg: colors.indigo, fg: colors.white, disabled: false };

  async function onAction() {
    if (busy || action.disabled) return;
    setMessage('');
    setError('');
    if (cur.owned) {
      if (isBg) bear.equipBg(bgDef.id);
      else {
        bear.equipOutfit(outfitDef.id);
        if (outfitDef.id === 'pestilence_staff') setCastKey((k) => k + 1);
      }
      void Haptics.selectionAsync();
      return;
    }
    if (!(await confirm(S.shop.buyConfirm(cur.name, cur.price), S.shop.buy))) return;
    setBusy(true);
    let err: string | null = null;
    if (isBg) {
      err = await bear.buyBg(bgDef.id);
    } else {
      err = await outfits.buy(outfitView as OutfitView);
    }
    setBusy(false);
    if (err) {
      setError(err);
      return;
    }
    if (!isBg && outfitDef.id === 'pestilence_staff') setCastKey((k) => k + 1);
    setMessage(S.shop.bought(cur.name));
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  return (
    <Screen tabBar scrollRef={scrollRef}>
      <View style={styles.header}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text accessibilityRole="header" style={type.h1}>
            {S.shop.title}
          </Text>
          <Text style={type.small}>{S.shop.subtitle}</Text>
        </View>
        <PressScale accessibilityRole="button" accessibilityLabel={S.bag.title} onPress={() => router.push('/bag')} style={styles.bagBtn}>
          <Sprite id="nav2_bag_on_30x30" />
        </PressScale>
        <CountPill icon="icon_coin_24x24" value={bear.coins} label="Coin" />
      </View>

      <View>
        {isConcept ? <CostumePreview selectedId={selConcept} /> : <PreviewStage
          bg={bgDef}
          outfit={outfitDef}
          name={isBg ? S.shop.bgPreview(bgDef.name) : outfitDef.name}
          alt={S.shop.previewAlt(outfitDef.name, bgDef.name)}
          action={
            <PressScale
              accessibilityRole="button"
              accessibilityState={{ disabled: action.disabled, busy }}
              disabled={action.disabled || busy}
              onPress={onAction}
              style={[styles.action, { backgroundColor: action.bg }]}
            >
              {busy ? <ActivityIndicator color={action.fg} /> : <Text style={[styles.actionText, { color: action.fg }]}>{action.title}</Text>}
            </PressScale>
          }
        />}
        {!isConcept ? <MagicBurst active={!isBg && outfitDef.id === 'pestilence_staff'} castKey={castKey} /> : null}
      </View>

      {online ? null : <Text style={styles.offline}>{S.offline.shopNote}</Text>}
      {message ? (
        <Animated.Text entering={FadeIn} style={styles.message}>
          {message}
        </Animated.Text>
      ) : null}
      <ErrorText>{error || (!isBg ? outfits.error : '')}</ErrorText>

      <SegmentedTabs<Tab>
        label={S.shop.tabs}
        value={tab}
        onChange={(value) => { setTab(value); scrollRef.current?.scrollTo({ y: 0, animated: true }); }}
        options={[
          { value: 'bg', label: S.shop.tabBg },
          { value: 'outfit', label: S.shop.tabOutfit },
          { value: 'concept', label: S.shop.tabConcept },
        ]}
      />

      {isBg ? (
        <Animated.View key="bg" entering={FadeInDown.duration(260)} style={{ gap: 12 }}>
          {!outfits.loaded ? <ActivityIndicator color={colors.violet} /> : null}
          {chunk(BACKGROUNDS, 4).map((row, r) => (
            <View key={r} style={styles.row}>
              {row.map((b) => (
                <BgSwatch
                  key={b.id}
                  name={b.name}
                  hex={b.hex}
                  label={S.shop.bgLabel(b.name)}
                  selected={b.id === selBg}
                  equipped={b.id === bear.bgId}
                  status={statusOf({ equipped: b.id === bear.bgId, owned: bear.ownedBgs.includes(b.id), price: bear.priceOf('bg', b.id), coins: bear.coins })}
                  onPress={() => setSelBg(b.id)}
                />
              ))}
            </View>
          ))}
        </Animated.View>
      ) : isConcept ? (
        <CostumeGrid selectedId={selConcept} onSelect={(id) => { setSelConcept(id); scrollRef.current?.scrollTo({ y: 0, animated: true }); }} />
      ) : (
        <Animated.View key="outfit" entering={FadeInDown.duration(260)} style={{ gap: 10 }}>
          {!outfits.loaded ? <ActivityIndicator color={colors.violet} /> : null}
          {chunk(outfits.views, 2).map((row, r) => (
            <View key={r} style={styles.row}>
              {row.map((v) => (
                <OutfitCard
                  key={v.def.id}
                  def={v.def}
                  selected={v.def.id === selOutfit}
                  status={statusOf({
                    equipped: v.def.id === bear.outfitId,
                    owned: v.owned,
                    price: v.price,
                    coins: bear.coins,
                    lockedLevel: v.lockedLevel,
                  })}
                  onPress={() => {
                    setSelOutfit(v.def.id);
                    if (v.def.id === 'pestilence_staff') setCastKey((k) => k + 1);
                  }}
                />
              ))}
            </View>
          ))}
        </Animated.View>
      )}

      <ShieldCard />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  bagBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', gap: 10 },
  action: { height: 44, paddingHorizontal: 16, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', minWidth: 96 },
  actionText: { fontFamily: fonts.bold, fontSize: 14 },
  message: { fontFamily: fonts.semibold, fontSize: 14, color: colors.okText, textAlign: 'center' },
  offline: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 19, color: colors.muted, textAlign: 'center' },
});
