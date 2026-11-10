import { isPlusOutfit } from '@shared/plan';
import { ScrollView, StyleSheet, View } from 'react-native';
import { ShopCard } from '@/components/ShopCard';
import { S } from '@/i18n/strings';
import { usePixelBear } from '@/lib/mock/pixelBear';
import { isWorn, type OutfitId, outfitItems } from '@/lib/pixelBear/catalog';
import { OUTFIT_SECTIONS } from '@/lib/pixelBear/shopSections';
import { useOutfitStatus } from '@/lib/pixelBear/shopStatus';
import type { OutfitView } from '@/lib/pixelBear/useOutfits';
import { Grid } from './Grid';
import { ItemCard } from './ItemCard';
import { SectionHead } from './SectionHead';

/** Хувцасны хэсгүүд (OUTFIT_SECTIONS): icon-той гарчиг, доор нь хажуу тийш гүйх том картын тавиур эсвэл 3 баганат тор. */
export function OutfitSections({ views, onOpen }: { views: OutfitView[]; onOpen: (id: OutfitId) => void }) {
  const bear = usePixelBear();
  const statusOf = useOutfitStatus();
  const byId = new Map(views.map((v) => [v.def.id, v]));
  return OUTFIT_SECTIONS.map((section) => {
    const list = section.ids.flatMap((id) => byId.get(id) ?? []);
    if (!list.length) return null;
    return (
      <View key={section.title}>
        <SectionHead title={section.title} note={section.note} icon={section.icon} accent={section.accent} count={list.length} />
        {section.grid ? (
          <Grid
            items={list}
            render={(v) => (
              <ShopCard
                key={v.def.id}
                items={outfitItems(v.def)}
                label={v.def.name}
                equipped={isWorn(bear.outfitIds, v.def.id)}
                status={statusOf(v)}
                onPress={() => onOpen(v.def.id)}
              />
            )}
          />
        ) : (
          // Screen-ий 20dp padding-ийг давж дэлгэцийн ирмэг хүртэл гүйнэ
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.shelf} contentContainerStyle={styles.shelfIn}>
            {list.map((v) => (
              <ItemCard
                key={v.def.id}
                outfit={v.def}
                status={statusOf(v)}
                badge={isPlusOutfit(v.def.id) ? S.shop.plusTag : undefined}
                width={138}
                height={158}
                onPress={() => onOpen(v.def.id)}
              />
            ))}
          </ScrollView>
        )}
      </View>
    );
  });
}

const styles = StyleSheet.create({
  shelf: { marginHorizontal: -20 },
  shelfIn: { paddingHorizontal: 20, gap: 12, paddingBottom: 8 },
});
