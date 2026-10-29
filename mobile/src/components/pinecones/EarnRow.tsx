import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { PressScale, Sprite } from '@/components/pixel';
import { colors, fonts } from '@/constants/theme';
import type { SpriteKey } from '@/sprites';
import { wood, woodPill } from './wood';

const ICON: Record<string, SpriteKey> = { correct: 'icon_star_36x36', chest: 'map_chest_40x30', duel: 'nav2_crew_on_30x30' };

export interface EarnWay {
  key: string;
  title: string;
  desc: string;
  reward: string;
  to: string;
}

/** Боргоцой олох нэг арга: дүрс, гарчиг, тайлбар, шагналын pill. Дарахад тухайн хэсэг рүү очно. */
export function EarnRow({ way }: { way: EarnWay }) {
  return (
    <PressScale accessibilityRole="button" accessibilityLabel={`${way.title}. ${way.desc} ${way.reward}`} onPress={() => router.push(way.to)} style={styles.row}>
      <View style={styles.body}>
        <View style={styles.head}>
          <View style={styles.icon}>
            <Sprite id={ICON[way.key] ?? 'btn_honey_24x24'} style={{ transform: [{ scale: 0.8 }] }} />
          </View>
          <Text style={styles.title}>{way.title}</Text>
        </View>
        <Text style={styles.desc}>{way.desc}</Text>
      </View>
      <View style={styles.reward}>
        <Sprite id="btn_honey_24x24" />
        <Text style={styles.rewardText}>{way.reward}</Text>
      </View>
    </PressScale>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  body: { flex: 1, gap: 4 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: fonts.bold, fontSize: 18, color: colors.ink },
  desc: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 20, color: wood.desc },
  reward: { ...woodPill, minWidth: 76, flexDirection: 'row', gap: 6, paddingHorizontal: 12, backgroundColor: wood.pill },
  rewardText: { fontFamily: fonts.pixelNum, fontSize: 16, color: colors.ink },
});
