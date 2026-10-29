import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BgArt } from '@/components/BgArt';
import type { SwatchStatus } from '@/components/BgSwatch';
import { MagicBurst } from '@/components/MagicBurst';
import { PressScale, Sprite } from '@/components/pixel';
import { PreviewStage } from '@/components/PreviewStage';
import { SegmentedTabs } from '@/components/SegmentedTabs';
import { ShieldCard } from '@/components/ShieldCard';
import { ShopCard } from '@/components/ShopCard';
import { CountPill, formatNumber } from '@/components/StatPill';
import { ErrorText, Screen } from '@/components/ui';
import { colors, fonts, radius } from '@/constants/theme';
import { type } from '@/constants/type';
import { S } from '@/i18n/strings';
import { usePixelBear } from '@/lib/mock/pixelBear';
import { useOnline } from '@/lib/online';
import { BACKGROUNDS, bgById, DEFAULT_OUTFIT_ID, isWorn, outfitById, type OutfitId, outfitItems, outfitSlot, toggleWorn, wornItems } from '@/lib/pixelBear/catalog';
import { type OutfitView, useOutfits } from '@/lib/pixelBear/useOutfits';

type Tab = 'bg' | 'outfit';
type OutfitCategory = 'hat' | 'mask' | 'clothes' | 'boots' | 'hand';
const CATEGORIES: { value: OutfitCategory; label: string }[] = [
  { value: 'hat', label: 'Малгай' },
  { value: 'mask', label: 'Маск' },
  { value: 'clothes', label: 'Хувцас' },
  { value: 'boots', label: 'Гутал' },
  { value: 'hand', label: 'Зэвсэг' },
];
function categoryOf(id: OutfitId): OutfitCategory {
  const slot = outfitSlot(id);
  // бүтэн нүүрний маск толгойн байрлал эзэлдэг ч Маск ангилалд харагдана
  if (slot === 'face' || id.endsWith('_mask')) return 'mask';
  if (slot === 'head') return 'hat';
  if (slot === 'feet') return 'boots';
  if (slot === 'hand' || slot === 'offhand') return 'hand';
  return 'clothes';
}

const COLS = 3;
const chunk = <T,>(arr: T[], n: number): T[][] => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));
const pad = <T,>(row: T[], n: number): (T | null)[] => [...row, ...Array(n - row.length).fill(null)];

function statusOf(opts: { equipped: boolean; owned: boolean; price: number; honey: number; lockedLevel?: number | null }): SwatchStatus {
  const { equipped, owned, price, honey, lockedLevel } = opts;
  if (equipped) return { text: S.shop.equipped, color: colors.okText, showHoney: false, locked: false };
  if (owned) return { text: S.shop.owned, color: colors.okText, showHoney: false, locked: false };
  if (lockedLevel) return { text: S.shop.levelNeeded(lockedLevel), color: colors.dangerText, showHoney: false, locked: true };
  if (price > honey) return { text: formatNumber(price), a11y: S.shop.shortBy(formatNumber(price)), color: colors.dangerText, showHoney: true, locked: true };
  return { text: formatNumber(price), color: colors.ink, showHoney: true, locked: false };
}

/** 07 · Дэлгүүр: карт бүрт тухайн зүйлийг өмссөн жижиг баавгай; дарахад доороос худалдан авах sheet гарна. Офлайн үед авсан зүйлсээ сонгоно. */
export default function ShopScreen() {
  const bear = usePixelBear();
  const outfits = useOutfits();
  const online = useOnline();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('bg');
  const [outfitCategory, setOutfitCategory] = useState<OutfitCategory>('hat');
  const [selBg, setSelBg] = useState(bear.bgId);
  const [selOutfit, setSelOutfit] = useState<OutfitId>(bear.outfitIds.at(-1) ?? DEFAULT_OUTFIT_ID);
  const [sheet, setSheet] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [castKey, setCastKey] = useState(0);

  // намхан дэлгэцэнд sheet-ийн stage-ийг багасгаж товч харагдах зай үлдээнэ
  const stageH = Math.round(Math.min(260, Math.max(170, useWindowDimensions().height * 0.28)));
  const isBg = tab === 'bg';
  const visibleOutfits = outfits.views.filter((v) => categoryOf(v.def.id) === outfitCategory);
  const bgDef = bgById(isBg ? selBg : bear.bgId);
  const outfitView = outfits.views.find((v) => v.def.id === selOutfit) ?? outfits.views[0];
  const outfitDef = outfitById(outfitView.def.id);
  const selWorn = isWorn(bear.outfitIds, outfitDef.id);
  const worn = wornItems(bear.outfitIds);
  // Дэвсгэр дээр өмссөнөөрөө; хувцас дээр сонгосноо өмссөнтэйгөө хамт (ижил байрлалтайг тайлаад) харуулна
  const previewItems = isBg || selWorn ? worn : wornItems(toggleWorn(bear.outfitIds, outfitDef.id));

  // sheet-д харж буй зүйлийн үйлдэл
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
      equipped: selWorn,
      owned: outfitView.owned,
      price: outfitView.price,
      lockedLevel: outfitView.lockedLevel,
    };
  const curStatus = statusOf({ ...cur, honey: bear.honey });
  const kind = isBg ? S.shop.tabBg : CATEGORIES.find((c) => c.value === categoryOf(outfitDef.id))?.label;
  const cantAfford = !cur.owned && cur.price > bear.honey;
  const action = !outfits.loaded
    ? { title: '…', bg: colors.stoneAlt, fg: colors.muted, disabled: true }
    : cur.equipped
      ? // өмссөн хувцсаа тайлж болно (анхдагч ороолт, дэвсгэрээс бусад)
        !isBg && outfitDef.id !== DEFAULT_OUTFIT_ID
        ? { title: S.shop.unequip, bg: colors.white, fg: colors.ink, disabled: false }
        : { title: S.shop.equipped, bg: colors.white, fg: colors.okText, disabled: true }
      : cur.owned
        ? { title: S.shop.equip, bg: colors.indigo, fg: colors.white, disabled: false }
        : !online
          ? { title: S.offline.needsInternet, bg: colors.stoneAlt, fg: colors.muted, disabled: true }
          : cur.lockedLevel
            ? { title: S.shop.levelNeeded(cur.lockedLevel), bg: colors.stoneAlt, fg: colors.muted, disabled: true }
            : cantAfford
              ? { title: S.shop.noHoney, bg: colors.stoneAlt, fg: colors.muted, disabled: true }
              : { title: S.shop.buyFor(formatNumber(cur.price)), bg: colors.indigo, fg: colors.white, disabled: false };
  const buying = !cur.owned && !action.disabled;

  function open() {
    setMessage('');
    setError('');
    setSheet(true);
  }

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
    // sheet өөрөө баталгаажуулах асуулт тул дахин confirm асуухгүй
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
    // Гарчиг + tab-ууд (1-р хүүхэд) дээр наалдана, карт дарахад худалдан авах sheet гарна
    <Screen tabBar stickyHeaderIndices={[0]}>
      <View style={styles.sticky}>
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
          <CountPill icon="btn_honey_24x24" value={bear.honey} label="Боргоцой" />
        </View>

        <SegmentedTabs<Tab>
          label={S.shop.tabs}
          value={tab}
          onChange={setTab}
          options={[
            { value: 'bg', label: S.shop.tabBg },
            { value: 'outfit', label: S.shop.tabOutfit },
          ]}
        />

        {tab === 'outfit' && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categories}>
            <View accessibilityRole="tablist" accessibilityLabel="Хувцасны төрөл" style={styles.categoryRow}>
              {CATEGORIES.map((category) => {
                const selected = outfitCategory === category.value;
                return (
                  <PressScale
                    key={category.value}
                    accessibilityRole="tab"
                    accessibilityState={{ selected }}
                    onPress={() => setOutfitCategory(category.value)}
                    style={[styles.category, selected && styles.categoryOn]}
                  >
                    <Text style={[styles.categoryText, selected && styles.categoryTextOn]}>{category.label}</Text>
                  </PressScale>
                );
              })}
            </View>
          </ScrollView>
        )}
      </View>

      {online ? null : <Text style={styles.offline}>{S.offline.shopNote}</Text>}
      <ErrorText>{!isBg ? outfits.error : ''}</ErrorText>

      {isBg ? (
        <Animated.View key="bg" entering={FadeInDown.duration(260)} style={styles.grid}>
          {!outfits.loaded ? <ActivityIndicator color={colors.violet} /> : null}
          {chunk(BACKGROUNDS, COLS).map((row, r) => (
            <View key={r} style={styles.row}>
              {pad(row, COLS).map((b, i) =>
                b ? (
                  <ShopCard
                    key={b.id}
                    bg={b}
                    items={worn}
                    label={S.shop.bgLabel(b.name)}
                    equipped={b.id === bear.bgId}
                    status={statusOf({ equipped: b.id === bear.bgId, owned: bear.ownedBgs.includes(b.id), price: bear.priceOf('bg', b.id), honey: bear.honey })}
                    onPress={() => {
                      setSelBg(b.id);
                      open();
                    }}
                  />
                ) : (
                  <View key={`e${i}`} style={{ flex: 1 }} />
                ),
              )}
            </View>
          ))}
        </Animated.View>
      ) : (
        <Animated.View key={`outfit-${outfitCategory}`} entering={FadeInDown.duration(260)} style={styles.grid}>
          {!outfits.loaded ? <ActivityIndicator color={colors.violet} /> : null}
          {chunk(visibleOutfits, COLS).map((row, r) => (
            <View key={r} style={styles.row}>
              {pad(row, COLS).map((v, i) =>
                v ? (
                  <ShopCard
                    key={v.def.id}
                    items={outfitItems(v.def)}
                    label={v.def.name}
                    equipped={isWorn(bear.outfitIds, v.def.id)}
                    status={statusOf({
                      equipped: isWorn(bear.outfitIds, v.def.id),
                      owned: v.owned,
                      price: v.price,
                      honey: bear.honey,
                      lockedLevel: v.lockedLevel,
                    })}
                    onPress={() => {
                      setSelOutfit(v.def.id);
                      if (v.def.id === 'pestilence_staff') setCastKey((k) => k + 1);
                      open();
                    }}
                  />
                ) : (
                  <View key={`e${i}`} style={{ flex: 1 }} />
                ),
              )}
            </View>
          ))}
        </Animated.View>
      )}

      <ShieldCard />

      <Modal transparent visible={sheet} animationType="fade" statusBarTranslucent onRequestClose={() => setSheet(false)}>
        <View style={styles.modal}>
          <Pressable accessibilityRole="button" accessibilityLabel={S.common.close} style={styles.backdrop} onPress={() => setSheet(false)} />
          <Animated.View entering={SlideInDown.duration(280)} style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.grabber} />
            <Text accessibilityRole="header" style={styles.sheetTitle}>
              {cur.owned ? S.shop.ownedTitle : S.shop.buyTitle}
            </Text>
            <View>
              <PreviewStage height={stageH} bg={bgDef} items={previewItems} alt={S.shop.previewAlt(outfitDef.name, bgDef.name)} />
              <MagicBurst active={!isBg && outfitDef.id === 'pestilence_staff'} castKey={castKey} />
            </View>
            <View style={styles.itemRow}>
              <View style={[styles.thumb, { backgroundColor: isBg ? bgDef.hex : outfitDef.tile }]}>
                {isBg ? <BgArt bg={bgDef} /> : <Sprite id={outfitDef.card} style={{ marginTop: outfitDef.imgTop }} />}
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.itemName}>{cur.name}</Text>
                <Text style={styles.itemKind}>{kind}</Text>
              </View>
              <View style={styles.itemPrice}>
                {curStatus.showHoney ? <Sprite id="btn_honey_24x24" /> : null}
                <Text style={[curStatus.showHoney ? styles.priceNum : styles.priceText, { color: curStatus.color }]}>{curStatus.text}</Text>
              </View>
            </View>
            {message ? (
              <Animated.Text entering={FadeIn} style={styles.message}>
                {message}
              </Animated.Text>
            ) : null}
            <ErrorText>{error}</ErrorText>
            <PressScale
              accessibilityRole="button"
              accessibilityLabel={action.title}
              accessibilityState={{ disabled: action.disabled, busy }}
              disabled={action.disabled || busy}
              onPress={onAction}
              style={[styles.action, { backgroundColor: action.bg, borderColor: action.bg === colors.white ? colors.ink : action.bg }]}
            >
              {busy ? (
                <ActivityIndicator color={action.fg} />
              ) : buying ? (
                <>
                  <Text style={[styles.actionText, { color: action.fg }]}>{S.shop.buy}</Text>
                  <Sprite id="btn_honey_24x24" />
                  <Text style={[styles.actionNum, { color: action.fg }]}>{formatNumber(cur.price)}</Text>
                </>
              ) : (
                <Text style={[styles.actionText, { color: action.fg }]}>{action.title}</Text>
              )}
            </PressScale>
          </Animated.View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  // доор гүйх жагсаалт гарчгийн ард харагдахгүй байх дэвсгэр (Screen-ий 20 padding-ийг нөхнө)
  sticky: { backgroundColor: colors.paper, marginHorizontal: -20, paddingHorizontal: 20, paddingVertical: 8, marginBottom: -8, gap: 12, zIndex: 1 },
  bagBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  grid: { gap: 18 },
  row: { flexDirection: 'row', gap: 10 },
  categories: { paddingVertical: 4 },
  categoryRow: { flexDirection: 'row', gap: 8 },
  category: { backgroundColor: colors.stoneAlt, borderRadius: radius.pill, paddingHorizontal: 16, paddingVertical: 9 },
  categoryOn: { backgroundColor: colors.indigo },
  categoryText: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 13 },
  categoryTextOn: { color: colors.white },
  modal: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(25, 21, 46, 0.45)' },
  sheet: { gap: 14, paddingHorizontal: 20, paddingTop: 10, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet, backgroundColor: colors.white },
  grabber: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: colors.stone },
  sheetTitle: { fontFamily: fonts.bold, fontSize: 20, color: colors.ink, textAlign: 'center' },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: radius.md, backgroundColor: colors.paper },
  thumb: { width: 64, height: 64, borderRadius: radius.sm, alignItems: 'center', overflow: 'hidden' },
  itemName: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 21, color: colors.ink },
  itemKind: { fontFamily: fonts.medium, fontSize: 14, color: colors.muted },
  itemPrice: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  priceNum: { fontFamily: fonts.pixelNum, fontSize: 18 },
  priceText: { fontFamily: fonts.semibold, fontSize: 14 },
  // хүрээ нь цагаан sheet дээр цагаан товчийг (Тайлах, Сонгосон) ялгана
  action: { height: 52, flexDirection: 'row', gap: 8, paddingHorizontal: 16, borderWidth: 2, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  actionText: { fontFamily: fonts.bold, fontSize: 16 },
  actionNum: { fontFamily: fonts.pixelNum, fontSize: 17 },
  message: { fontFamily: fonts.semibold, fontSize: 14, color: colors.okText, textAlign: 'center' },
  offline: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 19, color: colors.muted, textAlign: 'center' },
});
