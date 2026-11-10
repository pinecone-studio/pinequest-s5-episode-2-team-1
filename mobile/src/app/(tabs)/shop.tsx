import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { BgArt } from '@/components/BgArt';
import { PixelText } from '@/components/pinecones';
import { PressScale, Sprite } from '@/components/pixel';
import { ShieldCard } from '@/components/ShieldCard';
import { ShopCard } from '@/components/ShopCard';
import { BuySheet } from '@/components/shop/BuySheet';
import { CategoryTabs } from '@/components/shop/CategoryTabs';
import { EventBanner } from '@/components/shop/EventBanner';
import { Grid } from '@/components/shop/Grid';
import { OutfitSections } from '@/components/shop/OutfitSections';
import type { BuyTarget } from '@/components/shop/useBuy';
import { CountPill } from '@/components/StatPill';
import { ErrorText, Screen } from '@/components/ui';
import { colors, fonts } from '@/constants/theme';
import { S } from '@/i18n/strings';
import { usePixelBear } from '@/lib/mock/pixelBear';
import { useOnline } from '@/lib/online';
import { BACKGROUNDS, bgById, DEFAULT_OUTFIT_ID } from '@/lib/pixelBear/catalog';
import { activeEvents } from '@/lib/pixelBear/events';
import { statusOf } from '@/lib/pixelBear/shopStatus';
import { useOutfits } from '@/lib/pixelBear/useOutfits';

type Tab = 'bg' | 'outfit';

/**
 * 07 · Дэлгүүр: дээр нь эвентийн banner (шинэ хувцас), ангиллын карт, доор нь хувцасны тавиурууд ба бүх хувцасны тор.
 * Карт дарахад доороос худалдан авах sheet гарна. Офлайн үед авсан зүйлсээ сонгоно.
 */
export default function ShopScreen() {
  const bear = usePixelBear();
  const outfits = useOutfits();
  const online = useOnline();
  // Хувцас эхэнд: дэлгүүр нээгдэхэд хувцасны tab
  const [tab, setTab] = useState<Tab>('outfit');
  const [target, setTarget] = useState<BuyTarget>({ kind: 'outfit', id: bear.outfitIds.at(-1) ?? DEFAULT_OUTFIT_ID });
  const [sheet, setSheet] = useState(false);
  const open = (t: BuyTarget) => {
    setTarget(t);
    setSheet(true);
  };

  return (
    // Гарчиг, боргоцой (1-р хүүхэд) дээр наалдана
    <Screen tabBar stickyHeaderIndices={[0]}>
      <View style={styles.sticky}>
        <View style={styles.header}>
          <View accessibilityRole="header" style={{ flex: 1 }}>
            <PixelText text={S.shop.title} px={3} color={colors.ink} shadow={colors.stone} />
          </View>
          <PressScale accessibilityRole="button" accessibilityLabel={S.bag.title} onPress={() => router.push('/bag')} style={styles.bagBtn}>
            <Sprite id="nav2_bag_on_30x30" />
          </PressScale>
          <PressScale accessibilityRole="button" accessibilityLabel={S.pinecones.open} onPress={() => router.push('/pinecones')}>
            <CountPill icon="btn_honey_24x24" value={bear.honey} label="Боргоцой" />
          </PressScale>
        </View>
      </View>

      <EventBanner events={activeEvents()} />

      <CategoryTabs<Tab>
        label={S.shop.tabs}
        value={tab}
        onChange={setTab}
        options={[
          { value: 'outfit', label: S.shop.tabOutfit, art: <Sprite id="outfit_shadow_ninja_82x140" style={styles.artOutfit} /> },
          {
            value: 'bg',
            label: S.shop.tabBg,
            art: (
              <View style={styles.artBg}>
                <BgArt bg={bgById('sakura')} />
              </View>
            ),
          },
        ]}
      />

      {online ? null : <Text style={styles.offline}>{S.offline.shopNote}</Text>}
      <ErrorText>{tab === 'outfit' ? outfits.error : ''}</ErrorText>
      {!outfits.loaded ? <ActivityIndicator color={colors.violet} /> : null}

      {tab === 'bg' ? (
        <Animated.View key="bg" entering={FadeInDown.duration(260)}>
          <Grid
            items={BACKGROUNDS}
            render={(b) => (
              <ShopCard
                key={b.id}
                bg={b}
                label={S.shop.bgLabel(b.name)}
                equipped={b.id === bear.bgId}
                status={statusOf({ equipped: b.id === bear.bgId, owned: bear.ownedBgs.includes(b.id), price: bear.priceOf('bg', b.id), honey: bear.honey })}
                onPress={() => open({ kind: 'bg', id: b.id })}
              />
            )}
          />
        </Animated.View>
      ) : (
        <Animated.View key="outfit" entering={FadeInDown.duration(260)}>
          <OutfitSections views={outfits.views} onOpen={(id) => open({ kind: 'outfit', id })} />
        </Animated.View>
      )}

      <ShieldCard />
      <BuySheet target={target} visible={sheet} outfits={outfits} onClose={() => setSheet(false)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  // доор гүйх жагсаалт гарчгийн ард харагдахгүй байх дэвсгэр (Screen-ий 20 padding-ийг нөхнө)
  sticky: { backgroundColor: colors.paper, marginHorizontal: -20, paddingHorizontal: 20, paddingVertical: 8, marginBottom: -8, zIndex: 1 },
  bagBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  // баавгайн толгой, цээжийг картын баруун талд харуулна
  artOutfit: { marginTop: 54 },
  artBg: { width: 50, height: 50, borderRadius: 14, borderWidth: 2, borderColor: colors.ink, overflow: 'hidden', backgroundColor: '#F2B8D0' },
  offline: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 19, color: colors.muted, textAlign: 'center' },
});
