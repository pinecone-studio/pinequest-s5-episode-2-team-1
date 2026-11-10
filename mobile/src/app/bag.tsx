import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { SwatchStatus } from '@/components/BgSwatch';
import { BagItems } from '@/components/BagItems';
import { Button } from '@/components/Button';
import { PixelText } from '@/components/pinecones';
import { Enter } from '@/components/pixel';
import { PreviewStage } from '@/components/PreviewStage';
import { ShopCard } from '@/components/ShopCard';
import { ItemCard } from '@/components/shop/ItemCard';
import { SectionHead } from '@/components/shop/SectionHead';
import { CountPill } from '@/components/StatPill';
import { BackButton, Screen } from '@/components/ui';
import { colors, fonts } from '@/constants/theme';
import { SH } from '@/i18n/shop';
import { S } from '@/i18n/strings';
import { usePixelBear } from '@/lib/mock/pixelBear';
import { goBack } from '@/lib/nav';
import { BACKGROUNDS, bgById, isWorn, outfitById, wornItems } from '@/lib/pixelBear/catalog';
import { useOutfits } from '@/lib/pixelBear/useOutfits';

/** цүнхэнд бүх зүйл таных: сонгосон бол "Сонгосон", үгүй бол "Сонгох" */
const statusOf = (on: boolean): SwatchStatus => ({ text: on ? S.shop.equipped : S.shop.equip, color: on ? colors.okText : colors.indigo, showHoney: false, locked: false });

/**
 * Цүнх (Дэлгүүрийн дээд булангаас): дэлгүүртэй ижил хэлбэрээр — дээр нь баавгай, доор нь icon-той гарчигтай хэрэглэгдэхүүн,
 * дэвсгэр, хувцас. Дарвал шууд сонгогдоно (авсан зүйлс тул баталгаажуулах шаардлагагүй).
 */
export default function BagScreen() {
  const bear = usePixelBear();
  const outfits = useOutfits();
  const bg = bgById(bear.bgId);
  const outfit = outfitById(bear.outfitIds.at(-1) ?? 'scarf');
  const ownedBgs = BACKGROUNDS.filter((b) => bear.ownedBgs.includes(b.id));
  const ownedOutfits = outfits.views.filter((v) => v.owned);
  const pick = (f: () => void) => {
    f();
    void Haptics.selectionAsync();
  };

  return (
    <Screen>
      <View style={styles.header}>
        <BackButton onPress={() => goBack('/shop')} />
        <View accessibilityRole="header" style={{ flex: 1 }}>
          <PixelText text={SH.bagTitle} px={3} color={colors.ink} shadow={colors.stone} />
        </View>
        <CountPill icon="btn_honey_24x24" value={bear.honey} label="Боргоцой" />
      </View>

      <Enter index={0}>
        <PreviewStage bg={bg} items={wornItems(bear.outfitIds)} name={outfit.name} alt={S.shop.previewAlt(outfit.name, bg.name)} />
      </Enter>

      <Enter index={1}>
        <SectionHead title={SH.bagItems} note={SH.noteItems} icon="btn_honey_jar_24x24" accent="#FFE3A8" count={0} hideCount />
        <BagItems />
      </Enter>

      <Enter index={2}>
        <SectionHead title={SH.bagOutfits} note={SH.noteOutfits} icon="icon_heart_24x24" accent={colors.pink} count={ownedOutfits.length} />
        {ownedOutfits.length ? (
          <Shelf>
            {ownedOutfits.map((v) => (
              <ItemCard key={v.def.id} outfit={v.def} status={statusOf(isWorn(bear.outfitIds, v.def.id))} width={128} height={140} onPress={() => pick(() => bear.equipOutfit(v.def.id))} />
            ))}
          </Shelf>
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>{S.bag.empty}</Text>
            <Button title={S.bag.toShop} variant="lemon" small onPress={() => router.navigate('/shop')} />
          </View>
        )}
      </Enter>

      <Enter index={3}>
        <SectionHead title={SH.bagBgs} note={SH.noteBgs} icon="icon_star_24x24" accent={colors.sky} count={ownedBgs.length} />
        <Shelf>
          {ownedBgs.map((b) => (
            <View key={b.id} style={styles.bg}>
              <ShopCard
                bg={b}
                label={S.shop.bgLabel(b.name)}
                equipped={b.id === bear.bgId}
                status={statusOf(b.id === bear.bgId)}
                onPress={() => pick(() => bear.equipBg(b.id))}
              />
            </View>
          ))}
        </Shelf>
      </Enter>
    </Screen>
  );
}

/** хажуу тийш гүйлгэх тавиур: Screen-ий 20dp padding-ийг давж дэлгэцийн ирмэг хүртэл */
function Shelf({ children }: { children: ReactNode }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.shelf} contentContainerStyle={styles.shelfIn}>
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  shelf: { marginHorizontal: -20 },
  shelfIn: { paddingHorizontal: 20, gap: 12, paddingBottom: 8 },
  bg: { width: 112 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  empty: { gap: 12, alignItems: 'center', padding: 16 },
  emptyText: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 21, color: colors.muted, textAlign: 'center' },
});
