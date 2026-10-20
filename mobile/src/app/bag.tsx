import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { BgSwatch } from '@/components/BgSwatch';
import { OutfitCard } from '@/components/OutfitCard';
import { Enter } from '@/components/pixel';
import { PreviewStage } from '@/components/PreviewStage';
import { CountPill } from '@/components/StatPill';
import { BackButton, Screen, SectionTitle } from '@/components/ui';
import { colors } from '@/constants/theme';
import { type } from '@/constants/type';
import { S } from '@/i18n/strings';
import { usePixelBear } from '@/lib/mock/pixelBear';
import { BACKGROUNDS, bgById, outfitById } from '@/lib/pixelBear/catalog';
import { useOutfits } from '@/lib/pixelBear/useOutfits';

const chunk = <T,>(arr: T[], n: number): T[][] => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));
const pad = <T,>(row: T[], n: number): (T | null)[] => [...row, ...Array(n - row.length).fill(null)];

/** Цүнх (Дэлгүүрийн дээд булангаас): авсан дэвсгэр, хувцсаа сонгож өмсгөнө. */
export default function BagScreen() {
  const bear = usePixelBear();
  const outfits = useOutfits();
  const bg = bgById(bear.bgId);
  const outfit = outfitById(bear.outfitId);
  const ownedBgs = BACKGROUNDS.filter((b) => bear.ownedBgs.includes(b.id));
  const ownedOutfits = outfits.views.filter((v) => v.owned);
  const ok = { color: colors.okText, showCoin: false, locked: false };

  return (
    <Screen>
      <View style={styles.header}>
        <BackButton onPress={() => router.back()} />
        <View style={{ flex: 1, gap: 4 }}>
          <Text accessibilityRole="header" style={type.h1}>
            {S.bag.title}
          </Text>
          <Text style={type.small}>{S.bag.subtitle}</Text>
        </View>
        <CountPill icon="icon_coin_24x24" value={bear.coins} label="Coin" />
      </View>

      <Enter index={0}>
        <PreviewStage bg={bg} outfit={outfit} name={outfit.name} alt={S.shop.previewAlt(outfit.name, bg.name)} />
      </Enter>

      <Enter index={1} style={{ gap: 12 }}>
        <SectionTitle>{S.bag.bgSection}</SectionTitle>
        {chunk(ownedBgs, 4).map((row, r) => (
          <View key={r} style={styles.row}>
            {pad(row, 4).map((b, i) =>
              b ? (
                <BgSwatch
                  key={b.id}
                  name={b.name}
                  hex={b.hex}
                  label={S.shop.bgLabel(b.name)}
                  selected={b.id === bear.bgId}
                  equipped={b.id === bear.bgId}
                  status={{ ...ok, text: b.id === bear.bgId ? S.shop.equipped : S.shop.equip }}
                  onPress={() => {
                    bear.equipBg(b.id);
                    void Haptics.selectionAsync();
                  }}
                />
              ) : (
                <View key={`e${i}`} style={{ flex: 1 }} />
              ),
            )}
          </View>
        ))}
      </Enter>

      <Enter index={2} style={{ gap: 10 }}>
        <SectionTitle>{S.bag.outfitSection}</SectionTitle>
        {chunk(ownedOutfits, 2).map((row, r) => (
          <View key={r} style={styles.row}>
            {pad(row, 2).map((v, i) =>
              v ? (
                <OutfitCard
                  key={v.def.id}
                  def={v.def}
                  selected={v.def.id === bear.outfitId}
                  status={{ ...ok, text: v.def.id === bear.outfitId ? S.shop.equipped : S.shop.equip }}
                  onPress={() => {
                    bear.equipOutfit(v.def.id);
                    void Haptics.selectionAsync();
                  }}
                />
              ) : (
                <View key={`e${i}`} style={{ flex: 1 }} />
              ),
            )}
          </View>
        ))}
      </Enter>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  row: { flexDirection: 'row', gap: 10 },
});
