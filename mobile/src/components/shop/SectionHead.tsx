import { StyleSheet, Text, View } from 'react-native';
import { PixelText } from '@/components/pinecones';
import { Sprite } from '@/components/pixel';
import { colors, fonts } from '@/constants/theme';
import type { SpriteKey } from '@/sprites';

/** Дэлгүүрийн хэсгийн гарчиг: өнгөт хавтан дээр pixel icon, өнгөт сүүдэртэй pixel бичиг, доор нь тайлбар, баруун талд тоо. */
/** `hideCount`: тоо утгагүй хэсэгт (хэрэглэгдэхүүн) баруун талын тоог нуух */
export function SectionHead({ title, note, icon, accent, count, hideCount }: { title: string; note: string; icon: SpriteKey; accent: string; count: number; hideCount?: boolean }) {
  return (
    <View accessible accessibilityRole="header" accessibilityLabel={hideCount ? `${title}, ${note}` : `${title}, ${note}, ${count}`} style={styles.row}>
      <View style={[styles.badge, { backgroundColor: accent }]}>
        <Sprite id={icon} />
      </View>
      <View style={styles.text}>
        <PixelText text={title} px={2} color={colors.ink} shadow={accent} />
        <Text style={styles.note} numberOfLines={1}>
          {note}
        </Text>
      </View>
      {hideCount ? null : (
        <View style={styles.count}>
          <Text style={styles.countText}>{count}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 22, marginBottom: 12 },
  // доод ирмэг зузаан: дарж болох юм шиг товойсон хавтан (картуудтай ижил)
  badge: {
    width: 46,
    height: 46,
    borderRadius: 14,
    borderWidth: 2,
    borderBottomWidth: 5,
    borderColor: 'rgba(25,21,46,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1, gap: 5 },
  note: { fontFamily: fonts.semibold, fontSize: 13, color: colors.muted },
  count: { minWidth: 36, height: 28, paddingHorizontal: 10, borderRadius: 14, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  countText: { fontFamily: fonts.pixelNum, fontSize: 13, color: colors.ink },
});
