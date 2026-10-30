import { router, useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAuth } from '@/auth/AuthContext';
import { BearStage, STAGE_H } from '@/components/BearStage';
import { BracketBar } from '@/components/BracketBar';
import { Enter } from '@/components/pixel';
import { PixelButton } from '@/components/PixelButton';
import { TopBar } from '@/components/TopBar';
import { Screen } from '@/components/ui';
import { colors, fonts } from '@/constants/theme';
import { S } from '@/i18n/strings';
import { usePixelBear } from '@/lib/mock/pixelBear';
import { pathSubject } from '@/lib/pixelBear/path';
import { tourRef } from '@/lib/tour';

const GAP = 14;
/** iPhone SE / 11 Pro-ийн Safari шиг намхан дэлгэцэнд stage-ийн хамгийн бага өндөр */
const MIN_STAGE = 150;

/** 03 · Нүүр (Charlie маягийн цэвэрхэн): шат/XP, баавгай, төлөвийн мөр, доод хоёр pixel товч. */
export default function HomeScreen() {
  const { me, refreshMe } = useAuth();
  const { bear, bgId, outfitIds, cyclePreview, subject } = usePixelBear();
  const [refreshing, setRefreshing] = useState(false);
  const [room, setRoom] = useState(0);
  const [moodH, setMoodH] = useState(46);
  const stageH = room ? Math.round(Math.min(STAGE_H, Math.max(MIN_STAGE, room - moodH - GAP))) : STAGE_H;

  useFocusEffect(
    useCallback(() => {
      void refreshMe();
    }, [refreshMe]),
  );

  if (!me || !bear) return null;
  function feed() {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Өнөөдрийн хичээл: өмнө хийсэн хичээлүүдээс санамсаргүй нэгийг 3 бодлогоор давтана
    router.push(`/task/${pathSubject(subject)}?review=1`);
  }

  return (
    <Screen
      tabBar
      contentStyle={styles.content}
      refreshing={refreshing}
      onRefresh={async () => {
        setRefreshing(true);
        await refreshMe();
        setRefreshing(false);
      }}
    >
      <TopBar xp="none" tour />

      <View ref={tourRef('xp')} collapsable={false}>
        <Enter index={0} style={styles.counter}>
          <Text style={styles.level}>{S.homeMin.level(me.level)}</Text>
          <Text style={styles.xp} accessibilityLabel={S.homeMin.xpLabel(me.levelXp, me.levelXpNeeded)}>
            {me.levelXp}
            <Text style={styles.xpMuted}> /{me.levelXpNeeded} XP</Text>
          </Text>
          <View style={styles.barWrap}>
            <BracketBar value={me.levelXp} max={me.levelXpNeeded} segments={12} color={colors.violet} label={S.homeMin.xpLabel(me.levelXp, me.levelXpNeeded)} />
          </View>
        </Enter>
      </View>

      {/* Үлдсэн өндрийг хэмжиж stage-ийг багтаана: намхан утсанд доод товчнууд цэсний ард орохгүй, scroll шаардахгүй */}
      <View style={styles.fit} onLayout={(e) => setRoom(e.nativeEvent.layout.height)}>
        <Enter index={1}>
          <BearStage view={bear} bgId={bgId} outfitIds={outfitIds} onLongPress={cyclePreview} height={stageH} />
        </Enter>

        <Enter index={2}>
          <Text style={styles.mood} accessibilityLiveRegion="polite" onLayout={(e) => setMoodH(e.nativeEvent.layout.height)}>
            {bear.mood}
          </Text>
        </Enter>
      </View>

      <View style={styles.bottom}>
        <PixelButton icon="btn_calendar_30x30" label={S.homeMin.calendar} onPress={() => router.push('/calendar')} />
        <View style={{ flex: 1 }} />
        <View ref={tourRef('feed')} collapsable={false}>
          <PixelButton icon="btn_honey_jar_30x30" label={S.homeMin.feed} onPress={feed} />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, gap: GAP },
  // flexBasis 0: өндөр нь агуулгаасаа биш үлдсэн зайнаас хамаарна (хэмжилт давтагдахгүй)
  fit: { flexGrow: 1, flexShrink: 1, flexBasis: 0, gap: GAP, minHeight: MIN_STAGE + 46 + GAP },
  counter: { alignItems: 'center', gap: 2, marginTop: 4 },
  level: { fontFamily: fonts.bold, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', color: colors.muted },
  xp: { fontFamily: fonts.pixelNum, fontSize: 26, lineHeight: 29, color: colors.ink },
  xpMuted: { fontFamily: fonts.pixelNum, fontSize: 15, color: colors.muted },
  barWrap: { alignSelf: 'stretch', paddingHorizontal: 18, marginTop: 4 },
  mood: { fontFamily: fonts.semibold, fontSize: 17, lineHeight: 23, color: colors.ink, textAlign: 'center', paddingHorizontal: 12 },
  bottom: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
