import { StyleSheet, Text, View } from 'react-native';
import { Pop, Sprite } from '@/components/pixel';
import { colors, fonts, hardShadow, radius } from '@/constants/theme';
import type { SpriteKey } from '@/sprites';

export type ResultMood = 'cheer' | 'tired' | 'idle';

const BEAR: Record<ResultMood, { id: SpriteKey; w: number; h: number }> = {
  cheer: { id: 'bear_cheer_scarf_180x252', w: 64, h: 90 },
  tired: { id: 'bear_tired_scarf_164x280', w: 54, h: 92 },
  idle: { id: 'bear_idle_scarf_164x280', w: 54, h: 92 },
};
const BG: Record<ResultMood, string> = { cheer: colors.lime, tired: colors.pink, idle: colors.lavender };

/** Сурагчийн хариуны дүн (хариу гармагц хамгийн дээр): баавгай, "Зөв! +785 оноо", хэддүгээр байрт. */
export function QuizResult({ mood, title, place }: { mood: ResultMood; title: string; place: string | null }) {
  const bear = BEAR[mood];
  return (
    <Pop trigger={title} from={0.9}>
      <View style={[styles.card, { backgroundColor: BG[mood] }]} accessibilityRole="summary" accessibilityLiveRegion="polite">
        <Sprite id={bear.id} style={{ width: bear.w, height: bear.h }} />
        <View style={styles.texts}>
          <Text style={styles.title}>{title}</Text>
          {place ? <Text style={styles.place}>{place}</Text> : null}
        </View>
      </View>
    </Pop>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: radius.card,
    borderWidth: 2,
    borderColor: colors.ink,
    ...hardShadow(4),
  },
  texts: { flex: 1, gap: 4 },
  title: { fontFamily: fonts.extrabold, fontSize: 20, lineHeight: 26, color: colors.ink },
  place: { fontFamily: fonts.bold, fontSize: 16, color: colors.indigo },
});
