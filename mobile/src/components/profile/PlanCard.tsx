import { hasTutor, PLAN_NAMES, PLAN_TUTOR_DAILY, type Plan } from '@shared/plan';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { PressScale } from '@/components/pixel';
import { Card } from '@/components/ui';
import { colors, fonts } from '@/constants/theme';
import { type } from '@/constants/type';
import { S } from '@/i18n/strings';

/** Миний багц (/plans) руу орох карт (тохиргоо дээр). */
export function PlanCard({ plan }: { plan: Plan }) {
  return (
    <PressScale accessibilityRole="link" accessibilityLabel={`${S.plans.myPlan}: ${PLAN_NAMES[plan]}`} onPress={() => router.push('/plans')}>
      <Card style={styles.card}>
        <View style={styles.texts}>
          <Text style={styles.sub}>{S.plans.myPlan}</Text>
          <Text style={styles.title}>{PLAN_NAMES[plan]}</Text>
          <Text style={type.small}>{hasTutor(plan) ? S.plans.tutorDaily(PLAN_TUTOR_DAILY[plan]) : S.plans.noTutor}</Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </Card>
    </PressScale>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  texts: { flex: 1, gap: 3 },
  sub: { fontFamily: fonts.bold, fontSize: 13, color: colors.muted },
  title: { fontFamily: fonts.semibold, fontSize: 18, color: colors.ink },
  chevron: { fontFamily: fonts.bold, fontSize: 26, color: colors.mutedIcon },
});
