import * as Haptics from 'expo-haptics';
import { StyleSheet, Text, View } from 'react-native';
import { BagItems } from '@/components/BagItems';
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
import { BACKGROUNDS, bgById, isWorn, outfitById, wornItems } from '@/lib/pixelBear/catalog';
import { useOutfits } from '@/lib/pixelBear/useOutfits';
import { goBack } from '@/lib/nav';

const chunk = <T,>(arr: T[], n: number): T[][] => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));
const pad = <T,>(row: T[], n: number): (T | null)[] => [...row, ...Array(n - row.length).fill(null)];

/** Цүнх (Дэлгүүрийн дээд булангаас): авсан дэвсгэр, хувцсаа сонгож өмсгөнө. */
export default function BagScreen() {
  const bear = usePixelBear();
  const outfits = useOutfits();
  const bg = bgById(bear.bgId);
  const outfit = outfitById(bear.outfitIds.at(-1) ?? 'scarf');
  const ownedBgs = BACKGROUNDS.filter((b) => bear.ownedBgs.includes(b.id));
  const ownedOutfits = outfits.views.filter((v) => v.owned);
  const ok = { color: colors.okText, showHoney: false, locked: false };

  return (
    <Screen>
      <View style={styles.header}>
        <BackButton onPress={() => goBack()} />
        <View style={{ flex: 1, gap: 4 }}>
          <Text accessibilityRole="header" style={type.h1}>
            {S.bag.title}
          </Text>
          <Text style={type.small}>{S.bag.subtitle}</Text>
        </View>
        <CountPill icon="btn_honey_24x24" value={bear.honey} label="Боргоцой" />
      </View>

      <Enter index={0}>
        <PreviewStage bg={bg} items={wornItems(bear.outfitIds)} name={outfit.name} alt={S.shop.previewAlt(outfit.name, bg.name)} />
      </Enter>

      <Enter index={1} style={{ gap: 12 }}>
        <SectionTitle>{S.items.section}</SectionTitle>
        <BagItems />
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
                  bg={b}
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
                  selected={isWorn(bear.outfitIds, v.def.id)}
                  status={{ ...ok, text: isWorn(bear.outfitIds, v.def.id) ? S.shop.equipped : S.shop.equip }}
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
