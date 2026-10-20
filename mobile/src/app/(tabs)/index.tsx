import type { Subject } from '@shared/types';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAuth } from '@/auth/AuthContext';
import { BearStage } from '@/components/BearStage';
import { Enter } from '@/components/pixel';
import { ShieldCard } from '@/components/ShieldCard';
import { TaskCard } from '@/components/TaskCard';
import { TopBar } from '@/components/TopBar';
import { Screen } from '@/components/ui';
import { colors, fonts, subjectTheme } from '@/constants/theme';
import { type } from '@/constants/type';
import { S, subjectNames } from '@/i18n/strings';
import { usePixelBear } from '@/lib/mock/pixelBear';

const SUBJECTS: Subject[] = ['math', 'mongolian', 'physics'];
const QUESTIONS_PER_TASK = 5;
const POINTS_PER_CORRECT = 10;

export default function HomeScreen() {
  const { me, refreshMe } = useAuth();
  const { bear, bgId, outfitId, cyclePreview } = usePixelBear();
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void refreshMe();
    }, [refreshMe]),
  );

  async function onRefresh() {
    setRefreshing(true);
    await refreshMe();
    setRefreshing(false);
  }

  if (!me || !bear) return null;
  const limitReached = me.todayTasks >= me.dailyLimit;
  // Нэг даалгаврын авч болох дээд оноо (бүх хариулт зөв үед), одоогийн үржвэртэй
  const maxReward = Math.round(QUESTIONS_PER_TASK * POINTS_PER_CORRECT * me.nextMultiplier);

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      <TopBar />

      <Enter index={0} style={styles.greeting}>
        <Text accessibilityRole="header" style={type.h2}>
          {S.home.hello(me.username)}
        </Text>
        <Text style={type.bodyMuted}>{limitReached ? S.home.limitReached : bear.mood}</Text>
      </Enter>

      <Enter index={1}>
        <BearStage view={bear} bgId={bgId} outfitId={outfitId} onLongPress={cyclePreview} />
      </Enter>

      <Enter index={2} style={styles.headRow}>
        <Text accessibilityRole="header" style={type.h3}>
          {S.home.todayTasks}
        </Text>
        <Text accessibilityRole="link" onPress={() => router.navigate('/path')} style={styles.all}>
          {me.todayTasks} / {me.dailyLimit} · {S.home.all}
        </Text>
      </Enter>
      <Enter index={3} style={styles.grid}>
        {SUBJECTS.map((subject) => (
          <TaskCard
            key={subject}
            label={subjectNames[subject]}
            title={S.home.questionsCount(QUESTIONS_PER_TASK)}
            bg={subjectTheme[subject].bg}
            fg={subjectTheme[subject].fg}
            reward={maxReward}
            disabled={limitReached}
            onPress={() => router.push(`/task/${subject}`)}
          />
        ))}
      </Enter>

      <Enter index={4}>
        <ShieldCard />
      </Enter>
    </Screen>
  );
}

const styles = StyleSheet.create({
  greeting: { gap: 2, marginTop: 8 },
  headRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 4 },
  all: { fontFamily: fonts.bold, fontSize: 14, color: colors.indigo, paddingVertical: 8 },
  grid: { flexDirection: 'row', gap: 10 },
});
