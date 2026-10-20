import type { Subject } from '@shared/types';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '@/auth/AuthContext';
import { Avatar } from '@/components/Avatar';
import { Stat } from '@/components/Stat';
import { SubjectCard } from '@/components/SubjectCard';
import { Card, Muted, ProgressBar, Screen, SectionTitle } from '@/components/ui';
import { colors, spacing } from '@/constants/theme';
import { S } from '@/i18n/strings';
import { confirm } from '@/lib/confirm';

const SUBJECTS: Subject[] = ['math', 'mongolian', 'physics'];

export default function HomeScreen() {
  const { me, refreshMe, signOut } = useAuth();
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

  async function onLogout() {
    if (await confirm(S.auth.logoutConfirm, S.auth.logout)) await signOut();
  }

  if (!me) return null;
  const limitReached = me.todayTasks >= me.dailyLimit;

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.hello}>{S.home.hello(me.username)}</Text>
          <Muted>{S.home.tier(me.tier, me.grade)}</Muted>
        </View>
        <Pressable onPress={onLogout} hitSlop={12}>
          <Text style={styles.logout}>{S.auth.logout}</Text>
        </Pressable>
      </View>

      <Card style={styles.profile}>
        <Avatar look={me.avatar} size={110} />
        <View style={styles.levelBox}>
          <Text style={styles.level}>{S.home.level(me.level)}</Text>
          <ProgressBar value={me.levelXp} max={me.levelXpNeeded} />
          <Muted>{S.home.xpProgress(me.levelXp, me.levelXpNeeded)}</Muted>
        </View>
      </Card>

      <View style={styles.stats}>
        <Stat icon="🪙" label={S.home.points} value={String(me.points)} color={colors.gold} />
        <Stat icon="🔥" label={S.home.streak} value={S.home.streakDays(me.streak)} color={colors.fire} />
        <Stat icon="⚡" label={S.home.multiplier} value={`×${me.nextMultiplier.toFixed(1)}`} color={colors.primary} />
      </View>

      <Card>
        <View style={styles.row}>
          <Text style={styles.cardTitle}>{S.home.todayTasks}</Text>
          <Text style={styles.count}>
            {me.todayTasks}/{me.dailyLimit}
          </Text>
        </View>
        <ProgressBar value={me.todayTasks} max={me.dailyLimit} color={colors.success} />
        <Muted>{limitReached ? S.home.limitReached : me.streakDoneToday ? `${S.home.streakDone} 🔥` : S.home.streakTodo}</Muted>
      </Card>

      <Card>
        <View style={styles.row}>
          <Text style={styles.cardTitle}>🛡️ {S.home.shieldTitle}</Text>
        </View>
        <Muted>{me.shield.held ? S.home.shieldOn : S.home.shieldOff}</Muted>
        {me.shield.usedDay ? <Muted>{S.home.shieldUsed(me.shield.usedDay)}</Muted> : null}
      </Card>

      <SectionTitle>{S.home.subjectsTitle}</SectionTitle>
      {SUBJECTS.map((subject) => (
        <SubjectCard key={subject} subject={subject} disabled={limitReached} onPress={() => router.push(`/task/${subject}`)} />
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  hello: { fontSize: 26, fontWeight: '900', color: colors.text },
  logout: { color: colors.primaryDark, fontWeight: '700', fontSize: 15 },
  profile: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  levelBox: { flex: 1, gap: spacing.sm },
  level: { fontSize: 24, fontWeight: '900', color: colors.primary },
  stats: { flexDirection: 'row', gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontSize: 17, fontWeight: '800', color: colors.text },
  count: { fontSize: 20, fontWeight: '900', color: colors.success },
});
