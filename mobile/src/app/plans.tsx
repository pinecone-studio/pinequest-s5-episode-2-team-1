import { PLAN_NAMES, PLAN_PRICE, PLAN_TUTOR_DAILY, type Plan } from '@shared/plan';
import type { PaymentsInfoResponse } from '@shared/types';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { api } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { Button } from '@/components/Button';
import { Enter, frameSize } from '@/components/pixel';
import { TutorBear } from '@/components/TutorBear';
import { BackButton, Screen } from '@/components/ui';
import { colors, fonts, hardShadow, radius } from '@/constants/theme';
import { type } from '@/constants/type';
import { S } from '@/i18n/strings';
import tutor from '@/lib/pixelBear/bear-tutor.json';
import { goBack } from '@/lib/nav';

/** Худалдан авалт эхний ээлжинд зөвхөн вэб дээр (kumalearn.online). Утасны апп дотор үнэ, товч харуулахгүй. */
const CAN_BUY = Platform.OS === 'web';

/** Plus карт дээрх баавгай: самбарын өмнө тайлбарлаж буй TutorBear-ийг энэ өндөрт багтаана. */
const BEAR_H = 150;
const BEAR = frameSize('bear_tutor_0_1320x1344', tutor.sheets[0], tutor.columns);
const BEAR_SCALE = BEAR_H / BEAR.height;
const BEAR_W = Math.round(BEAR.width * BEAR_SCALE);

/**
 * Багцууд: том KUMA Plus карт (баавгай, юу авах, үнэ, авах товч), доор нь Үнэгүй ба Max нэг мөрөөр. Авах товч сервер
 * худалдан авалт нээлттэй (GET /payments → open) гэх хүртэл дарагдахгүй.
 */
export default function PlansScreen() {
  const { me } = useAuth();
  const current: Plan = me?.plan ?? 'free';
  const plusMine = current === 'plus';
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

      <Enter index={0}>
        <View style={styles.plus}>
          <View style={styles.plusHead}>
            <Text style={[styles.badge, styles.badgeLemon, styles.badgeStart]}>{plusMine ? S.plans.current : S.plans.recommended}</Text>
            <Text style={styles.plusName}>{PLAN_NAMES.plus}</Text>
          </View>
          <View style={styles.plusTop}>
            <View style={styles.plusText}>
              <Text style={styles.plusDaily}>{S.plans.dailyShort(PLAN_TUTOR_DAILY.plus)}</Text>
              <Text style={styles.plusLine}>{S.plans.dailyWhat}</Text>
            </View>
            <View style={styles.bearBox} importantForAccessibility="no-hide-descendants">
              <View style={styles.bearScale}>
                <TutorBear phase="bear" mouth={0} label="" />
              </View>
            </View>
          </View>

          {CAN_BUY ? (
            <View style={styles.buy}>
              <View style={styles.priceRow}>
                <Text style={styles.amount}>{S.plans.amount(PLAN_PRICE.plus)}</Text>
                <Text style={styles.perMonth}>{S.plans.perMonth}</Text>
              </View>
              <Button
                title={plusMine ? S.plans.extend : S.plans.buy}
                variant="lemon"
                disabled={!open}
                onPress={() => router.push('/pay')}
              />
              {open ? null : <Text style={styles.note}>{S.plans.payingSoon}</Text>}
            </View>
          ) : null}
        </View>
      </Enter>

      <Enter index={1}>
        <Row tone="free" name={PLAN_NAMES.free} sub={S.plans.dailyShort(PLAN_TUTOR_DAILY.free)} badge={current === 'free' ? S.plans.current : null} />
      </Enter>
      <Enter index={2}>
        <Row
          tone="max"
          name={PLAN_NAMES.max}
          sub={current === 'max' ? S.plans.dailyShort(PLAN_TUTOR_DAILY.max) : S.plans.maxSub}
          badge={current === 'max' ? S.plans.current : S.plans.soon}
        />
      </Enter>
    </Screen>
  );
}

/** Бусад багц нэг мөрөөр: Үнэгүй lime, Max violet (Plus шиг тод, хатуу сүүдэртэй), нэр, өдрийн тоо, тэмдэг. */
function Row({ tone, name, sub, badge }: { tone: 'free' | 'max'; name: string; sub: string; badge: string | null }) {
  const max = tone === 'max';
  return (
    <View style={[styles.row, max ? styles.rowMax : styles.rowFree]}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[styles.rowName, max && styles.onDark]}>{name}</Text>
        <Text style={[styles.rowSub, max && styles.onDarkSoft]}>{sub}</Text>
      </View>
      {badge ? <Text style={[styles.badge, max ? styles.badgeLemon : styles.badgeInk]}>{badge}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },

  plus: {
    backgroundColor: colors.indigo,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.ink,
    padding: 20,
    paddingBottom: 22,
    gap: 18,
    marginBottom: 18,
    ...hardShadow(5),
  },
  plusHead: { gap: 8, marginBottom: -10 },
  plusTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  plusText: { flex: 1, gap: 4 },
  plusDaily: { fontFamily: fonts.extrabold, fontSize: 24, lineHeight: 28, letterSpacing: -0.5, color: colors.lemon },
  plusName: { fontFamily: fonts.extrabold, fontSize: 32, lineHeight: 36, letterSpacing: -1, color: colors.white },
  plusLine: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 22, color: colors.lavender },
  bearBox: { width: BEAR_W, height: BEAR_H, marginRight: -8 },
  // scale нь төвөөс хийгддэг тул анхны хэмжээтэй view-г хайрцагны төвд байрлуулна
  bearScale: {
    position: 'absolute',
    width: BEAR.width,
    height: BEAR.height,
    left: (BEAR_W - BEAR.width) / 2,
    top: (BEAR_H - BEAR.height) / 2,
    transform: [{ scale: BEAR_SCALE }],
  },

  buy: { gap: 12 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' },
  amount: { fontFamily: fonts.extrabold, fontSize: 40, lineHeight: 44, letterSpacing: -1, color: colors.lemon },
  perMonth: { fontFamily: fonts.semibold, fontSize: 18, color: colors.white },
  note: { fontFamily: fonts.semibold, fontSize: 13, color: colors.lavender, textAlign: 'center' },

  badge: { alignSelf: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, overflow: 'hidden', fontFamily: fonts.bold, fontSize: 12 },
  badgeLemon: { backgroundColor: colors.lemon, color: colors.ink },
  badgeStart: { alignSelf: 'flex-start' },
  badgeInk: { backgroundColor: colors.ink, color: colors.white },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: radius.card,
    borderWidth: 2,
    borderColor: colors.ink,
    paddingVertical: 16,
    paddingHorizontal: 18,
    marginBottom: 14,
    ...hardShadow(4),
  },
  rowFree: { backgroundColor: colors.lime },
  rowMax: { backgroundColor: colors.violet },
  rowName: { fontFamily: fonts.extrabold, fontSize: 22, lineHeight: 26, letterSpacing: -0.4, color: colors.ink },
  rowSub: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink },
  onDark: { color: colors.white },
  onDarkSoft: { color: colors.lavender },
});
