import { PLAN_NAMES, PLAN_PRICE, PLAN_TUTOR_DAILY, PLANS, type Plan } from '@shared/plan';
import type { PaymentsInfoResponse } from '@shared/types';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { api } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { Button } from '@/components/Button';
import { Enter } from '@/components/pixel';
import { BackButton, Card, Screen } from '@/components/ui';
import { colors, fonts, radius } from '@/constants/theme';
import { type } from '@/constants/type';
import { S } from '@/i18n/strings';
import { goBack } from '@/lib/nav';

/** Багц бүрийн давуу тал: эхнийх нь доод багцын бүх боломж, сүүлийнх нь баавгай багшийн өдрийн эрх. */
function features(plan: Plan): string[] {
  const tutor = S.plans.tutorDaily(PLAN_TUTOR_DAILY[plan]);
  if (plan === 'free') return [...S.plans.base, tutor];
  if (plan === 'plus') return [S.plans.plusExtra, tutor];
  return [S.plans.maxExtra, S.plans.maxSoon];
}

/** Тодруулах өнгө: Plus = гол санал (lime), Max = удахгүй (lavender). */
const ACCENT: Record<Plan, string> = { free: colors.white, plus: colors.lime, max: colors.lavender };

/** Худалдан авалт эхний ээлжинд зөвхөн вэб дээр (kumalearn.online). Утасны апп дотор үнэ, товч харуулахгүй. */
const CAN_BUY = Platform.OS === 'web';

/** ms → 2026-12-09 (төхөөрөмжийн цагаар). */
function day(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Багцууд: Үнэгүй, KUMA Plus, KUMA Max-ийг харьцуулна. Одоогийн багцыг тэмдэглэнэ. Вэб дээр Plus-ын үнэ, авах товч гарна:
 * сервер худалдан авалт нээлттэй (GET /payments → open) гэж хэлэх хүртэл товч дарагдахгүй. Max бүхэлдээ удахгүй.
 */
export default function PlansScreen() {
  const { me } = useAuth();
  const current: Plan = me?.plan ?? 'free';
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!CAN_BUY) return;
    api<PaymentsInfoResponse>('/payments')
      .then((r) => setOpen(r.open))
      .catch(() => setOpen(false));
  }, []);

  return (
    <Screen>
      <View style={styles.header}>
        <BackButton onPress={() => goBack('/profile')} />
        <Text accessibilityRole="header" style={[type.h1, { flex: 1 }]}>
          {S.plans.title}
        </Text>
      </View>
      <Text style={[type.bodyMuted, styles.intro]}>{S.plans.intro}</Text>

      {PLANS.map((plan, i) => {
        const mine = plan === current;
        const soon = plan === 'max';
        return (
          <Enter key={plan} index={i}>
            <Card style={[styles.card, { backgroundColor: ACCENT[plan] }, mine && styles.mine]}>
              <View style={styles.top}>
                <Text style={type.h3}>{PLAN_NAMES[plan]}</Text>
                {mine ? <Text style={[styles.badge, styles.badgeMine]}>{S.plans.current}</Text> : null}
                {soon && !mine ? <Text style={styles.badge}>{S.plans.soon}</Text> : null}
              </View>
              <View style={styles.list}>
                {features(plan).map((f) => (
                  <View key={f} style={styles.row}>
                    <Text style={styles.tick}>✓</Text>
                    <Text style={[type.body, { flex: 1 }]}>{f}</Text>
                  </View>
                ))}
              </View>
              {plan === 'plus' && CAN_BUY ? (
                <View style={styles.buy}>
                  <Text style={type.h3}>{S.plans.price(PLAN_PRICE.plus)}</Text>
                  {mine && me?.planUntil ? <Text style={type.bodyMuted}>{S.plans.until(day(me.planUntil))}</Text> : null}
                  <Button
                    title={mine ? S.plans.extend : S.plans.buy}
                    variant="ink"
                    small
                    disabled={!open}
                    onPress={() => router.push('/pay')}
                  />
                  {open ? null : <Text style={[type.bodyMuted, styles.note]}>{S.plans.payingSoon}</Text>}
                </View>
              ) : null}
            </Card>
          </Enter>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  intro: { marginBottom: 16 },
  card: { gap: 12, marginBottom: 14 },
  mine: { borderWidth: 2, borderColor: colors.ink },
  top: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: {
    marginLeft: 'auto',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    overflow: 'hidden',
    backgroundColor: colors.white,
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.ink,
  },
  badgeMine: { backgroundColor: colors.ink, color: colors.white },
  list: { gap: 8 },
  buy: { gap: 8 },
  note: { textAlign: 'center' },
  row: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  tick: { fontFamily: fonts.bold, fontSize: 15, lineHeight: 21, color: colors.okText },
});
