import { router, useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useAuth } from '@/auth/AuthContext';
import { BearStage } from '@/components/BearStage';
import { BracketBar } from '@/components/BracketBar';
import { Enter } from '@/components/pixel';
import { PixelButton } from '@/components/PixelButton';
import { TopBar } from '@/components/TopBar';
import { Screen } from '@/components/ui';
import { colors, fonts } from '@/constants/theme';
import { S } from '@/i18n/strings';
import { usePixelBear } from '@/lib/mock/pixelBear';

/** 03 · Нүүр (Charlie маягийн цэвэрхэн): шат/XP, баавгай, төлөвийн мөр, доод хоёр pixel товч. */
export default function HomeScreen() {
  const { me, refreshMe } = useAuth();
  const { bear, bgId, outfitId, cyclePreview, subject } = usePixelBear();
  const [refreshing, setRefreshing] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      void refreshMe();
    }, [refreshMe]),
  );

  useEffect(() => {
    if (!note) return;
    const t = setTimeout(() => setNote(null), 2400);
    return () => clearTimeout(t);
  }, [note]);

  if (!me || !bear) return null;
  const limitReached = me.todayTasks >= me.dailyLimit;

  function feed() {
    if (limitReached) {
      setNote(S.home.limitReached);
      return;
    }
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/task/${subject ?? 'math'}`);
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
      <TopBar xp="none" />

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

      <Enter index={1}>
        <BearStage view={bear} bgId={bgId} outfitId={outfitId} onLongPress={cyclePreview} />
      </Enter>

      <Enter index={2}>
        <Text style={styles.mood} accessibilityLiveRegion="polite">
          {bear.mood}
        </Text>
      </Enter>

      <View style={{ flex: 1, minHeight: 8 }} />

      <View style={styles.bottom}>
        <PixelButton icon="btn_calendar_30x30" label={S.homeMin.calendar} onPress={() => router.push('/calendar')} />
        {note ? (
          <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.note}>
            <Text style={styles.noteText}>{note}</Text>
          </Animated.View>
        ) : (
          <View style={{ flex: 1 }} />
        )}
        <PixelButton icon="btn_honey_30x30" label={S.homeMin.feed} onPress={feed} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, gap: 14 },
  counter: { alignItems: 'center', gap: 2, marginTop: 4 },
  level: { fontFamily: fonts.bold, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', color: colors.muted },
  xp: { fontFamily: fonts.pixel, fontSize: 30, lineHeight: 34, color: colors.ink },
  xpMuted: { fontFamily: fonts.pixel, fontSize: 18, color: '#A19DAE' },
  barWrap: { alignSelf: 'stretch', paddingHorizontal: 18, marginTop: 4 },
  mood: { fontFamily: fonts.semibold, fontSize: 17, lineHeight: 23, color: colors.ink, textAlign: 'center', paddingHorizontal: 12 },
  bottom: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  note: { flex: 1, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 14, backgroundColor: colors.ink },
  noteText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.white, textAlign: 'center' },
});
