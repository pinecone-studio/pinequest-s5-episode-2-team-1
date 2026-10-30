import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { PressScale, Sprite } from '@/components/pixel';
import { colors, fonts } from '@/constants/theme';
import type { SpriteKey } from '@/sprites';
import { PixelBox } from './PixelBox';
import { wood } from './wood';

const ICON: Record<string, SpriteKey> = { correct: 'earn_correct_44x44', chest: 'earn_chest_44x44', duel: 'earn_duel_52x52' };

export interface EarnWay {
  key: string;
  title: string;
  desc: string;
  reward: string;
  to: string;
}

/** Боргоцой олох нэг арга: pixel хүрээтэй дүрс, гарчиг, тайлбар, шагналын pill. Дарахад тухайн хэсэг рүү очно. */
export function EarnRow({ way }: { way: EarnWay }) {
  return (
    <PressScale accessibilityRole="button" accessibilityLabel={`${way.title}. ${way.desc} ${way.reward}`} onPress={() => router.push(way.to)}>
      <PixelBox fill={wood.card} edge={wood.edge} radius={3} shadow={[0, 2]} style={styles.card}>
        <PixelBox fill={wood.slot} edge={wood.edge} radius={2} style={styles.slot}>
          <Sprite id={ICON[way.key] ?? 'btn_honey_36x36'} />
        </PixelBox>
        <View style={styles.body}>
          <View style={styles.head}>
            <Text style={styles.title}>{way.title}</Text>
            <PixelBox fill={wood.pill} edge={colors.ink} radius={2} shadow={[1, 1]} shadowColor={wood.shade} style={styles.reward}>
              <Sprite id="btn_honey_24x24" />
              <Text style={styles.rewardText}>{way.reward}</Text>
            </PixelBox>
          </View>
          <Text style={styles.desc}>{way.desc}</Text>
        </View>
      </PixelBox>
    </PressScale>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  slot: { width: 63, height: 63, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, gap: 4 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flex: 1, fontFamily: fonts.bold, fontSize: 17, color: colors.ink },
  desc: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 19, color: wood.desc },
  reward: { height: 33, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9 },
  rewardText: { fontFamily: fonts.pixelNum, fontSize: 14, color: colors.ink },
});
