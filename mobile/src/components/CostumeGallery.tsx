import { Image, StyleSheet, Text, View } from 'react-native';
import { PressScale } from '@/components/pixel';
import { colors, fonts, radius } from '@/constants/theme';
import { S } from '@/i18n/strings';
import { COSTUME_GALLERY } from '@/lib/pixelBear/costumeGallery';

export function CostumePreview({ selectedId }: { selectedId: string }) {
  const selected = COSTUME_GALLERY.find((item) => item.id === selectedId) ?? COSTUME_GALLERY[0];
  return (
    <View style={styles.preview}>
      <Image source={selected.image} resizeMode="contain" style={styles.previewImage} accessibilityLabel={selected.name} />
      <View style={styles.nameChip}><Text style={styles.nameChipText}>{selected.name}</Text></View>
      <View style={styles.previewStatus}><Text style={styles.previewStatusText}>{S.shop.previewOnly}</Text></View>
    </View>
  );
}

export function CostumeGrid({ selectedId, onSelect }: { selectedId: string; onSelect: (id: string) => void }) {
  return (
    <View style={styles.gallery}>
      <Text style={styles.note}>{S.shop.conceptNote}</Text>
      <View style={styles.grid}>
        {COSTUME_GALLERY.map((item) => (
          <PressScale
            key={item.id}
            accessibilityRole="button"
            accessibilityLabel={item.name}
            accessibilityState={{ selected: selectedId === item.id }}
            onPress={() => onSelect(item.id)}
            style={[styles.card, selectedId === item.id && styles.selected]}
          >
            <View style={styles.tile}><Image source={item.image} resizeMode="contain" style={styles.cardImage} /></View>
            <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
          </PressScale>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  preview: { height: 290, borderRadius: radius.stage, backgroundColor: colors.indigo, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  previewImage: { width: '65%', height: 254 },
  nameChip: { position: 'absolute', top: 14, left: 14, borderRadius: radius.pill, backgroundColor: colors.white, paddingHorizontal: 12, paddingVertical: 8 },
  nameChipText: { fontFamily: fonts.bold, fontSize: 13, color: colors.ink },
  previewStatus: { position: 'absolute', bottom: 14, right: 14, borderRadius: radius.pill, backgroundColor: colors.white, paddingHorizontal: 12, paddingVertical: 8 },
  previewStatusText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.muted },
  gallery: { gap: 12 },
  note: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 19, color: colors.muted },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: { width: '48%', height: 160, borderRadius: radius.card, borderWidth: 3, borderColor: colors.white, backgroundColor: colors.white, overflow: 'hidden' },
  selected: { borderColor: colors.violet },
  tile: { height: 124, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.lavender },
  cardImage: { width: '80%', height: 116 },
  cardName: { paddingHorizontal: 10, paddingVertical: 5, fontFamily: fonts.bold, fontSize: 13, color: colors.ink },
});
