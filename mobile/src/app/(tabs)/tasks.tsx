import type { Subject } from '@shared/types';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useAuth } from '@/auth/AuthContext';
import { BracketBar } from '@/components/BracketBar';
import { Enter, Motion, PressScale, Sprite } from '@/components/pixel';
import { ShieldCard } from '@/components/ShieldCard';
import { CountPill } from '@/components/StatPill';
import { Screen } from '@/components/ui';
import { colors, fonts, radius, subjectTheme } from '@/constants/theme';
import { type } from '@/constants/type';
import { S, subjectGlyphs, subjectNames } from '@/i18n/strings';
import { usePixelBear } from '@/lib/mock/pixelBear';

const SUBJECTS: Subject[] = ['math', 'mongolian', 'physics'];

/** Өнөөдрийн даалгавар (доод цэсний тусдаа хэсэг). */
export default function TasksScreen() {
  const { me, refreshMe } = useAuth();
  const { coins } = usePixelBear();
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void refreshMe();
    }, [refreshMe]),
  );

  if (!me) return null;
  const limitReached = me.todayTasks >= me.dailyLimit;
  const maxReward = me.questionsPerTask * Math.round(me.pointsPerCorrect * me.nextMultiplier);

  return (
    <Screen
      tabBar
      refreshing={refreshing}
      onRefresh={async () => {
        setRefreshing(true);
        await refreshMe();
        setRefreshing(false);
      }}
    >
      <View style={styles.header}>
        <Text accessibilityRole="header" style={[type.h2, { flex: 1 }]}>
          {S.tasks.title}
        </Text>
        <CountPill icon="icon_coin_24x24" value={coins} label="Coin" />
      </View>

      <Enter index={0} style={[styles.progress, { backgroundColor: me.streakDoneToday ? colors.lime : colors.pink }]}>
        <Motion preset="bob" style={styles.peek}>
          <Sprite id={me.streakDoneToday ? 'head_happy_164x108' : 'head_idle_112x96'} />
        </Motion>
        <Text style={styles.progressLabel}>{S.tasks.today}</Text>
        <Text style={styles.big}>
          {me.todayTasks}
          <Text style={styles.bigMuted}>/{me.dailyLimit}</Text>
        </Text>
        <View style={{ maxWidth: '58%' }}>
          <BracketBar value={me.todayTasks} max={me.dailyLimit} segments={me.dailyLimit} label={S.tasks.progressLabel(me.todayTasks, me.dailyLimit)} />
        </View>
        <Text style={styles.status}>{limitReached ? S.home.limitReached : me.streakDoneToday ? S.home.streakDone : S.home.streakTodo}</Text>
      </Enter>

      {SUBJECTS.map((subject, i) => {
        const t = subjectTheme[subject];
        return (
          <Enter key={subject} index={i + 1}>
            <PressScale
              accessibilityRole="button"
              accessibilityLabel={`${S.tasks.start(subjectNames[subject])}, +${maxReward} coin`}
              accessibilityState={{ disabled: limitReached }}
              disabled={limitReached}
              onPress={() => router.push(`/task/${subject}`)}
              scaleTo={0.97}
              style={[styles.quest, { backgroundColor: t.bg }, limitReached && { opacity: 0.45 }]}
            >
              <Text
                style={[styles.glyph, { color: t.fg, fontSize: subjectGlyphs[subject].length > 2 ? 46 : 72 }]}
                accessibilityElementsHidden
                importantForAccessibility="no"
              >
                {subjectGlyphs[subject]}
              </Text>
              <View style={{ flex: 1, gap: 6 }}>
                <View style={styles.questTop}>
                  <Text style={[styles.questLabel, { color: t.fg }]}>
                    {S.tasks.questions(me.questionsPerTask)} · {S.tasks.multiplier(me.nextMultiplier)}
                  </Text>
                </View>
                <Text style={[styles.questTitle, { color: t.fg }]}>{subjectNames[subject]}</Text>
                <View style={styles.reward}>
                  <Sprite id="icon_coin_12x12" />
                  <Text style={styles.rewardNum}>+{maxReward}</Text>
                </View>
              </View>
              <View style={styles.play}>
                <Svg width={18} height={18} viewBox="0 0 24 24">
                  <Path d="M7 4.5v15l13-7.5z" fill={colors.lemon} />
                </Svg>
              </View>
            </PressScale>
          </Enter>
        );
      })}

      <Enter index={4}>
        <ShieldCard />
      </Enter>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  progress: { borderRadius: radius.lg, padding: 18, gap: 6, overflow: 'hidden', minHeight: 150 },
  peek: { position: 'absolute', right: -16, bottom: -18 },
  progressLabel: { fontFamily: fonts.bold, fontSize: 13, letterSpacing: 1, color: colors.ink },
  big: { fontFamily: fonts.pixel, fontSize: 40, lineHeight: 44, color: colors.ink },
  bigMuted: { fontFamily: fonts.pixel, fontSize: 24, color: colors.muted },
  status: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 19, color: colors.ink, maxWidth: '64%' },
  quest: {
    minHeight: 112,
    borderRadius: 26,
    paddingVertical: 16,
    paddingLeft: 18,
    paddingRight: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    overflow: 'hidden',
  },
  glyph: { position: 'absolute', right: 74, bottom: -8, fontFamily: fonts.extrabold, opacity: 0.14 },
  questTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  questLabel: { fontFamily: fonts.bold, fontSize: 12, letterSpacing: 0.8, textTransform: 'uppercase', opacity: 0.75 },
  questTitle: { fontFamily: fonts.semibold, fontSize: 24, letterSpacing: -0.5 },
  reward: {
    alignSelf: 'flex-start',
    height: 28,
    paddingLeft: 6,
    paddingRight: 9,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rewardNum: { fontFamily: fonts.pixel, fontSize: 14, color: colors.ink },
  play: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center', paddingLeft: 3 },
});
