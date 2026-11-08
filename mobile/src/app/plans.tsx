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
const BEAR_H = 140;
const BEAR = frameSize('bear_tutor_0_1320x1344', tutor.sheets[0], tutor.columns);
const BEAR_SCALE = BEAR_H / BEAR.height;
const BEAR_W = Math.round(BEAR.width * BEAR_SCALE);

/**
 * Багцууд: голлуулсан том KUMA Plus карт (баавгай, нэр, өдрийн тоо, үнэ, авах товч), доор нь Үнэгүй ба Max ижил хэмжээтэй
 * хоёр карт зэрэгцэн. Бүх бичвэр голлосон. Авах товч сервер худалдан авалт нээлттэй (GET /payments → open) болтол дарагдахгүй.
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
          <View style={styles.bearBox} importantForAccessibility="no-hide-descendants">
            <View style={styles.bearScale}>
              <TutorBear phase="bear" mouth={0} label="" />
            </View>
          </View>
          <Text style={[styles.badge, styles.badgeLemon]}>{plusMine ? S.plans.current : S.plans.recommended}</Text>
          <Text style={styles.plusName}>{PLAN_NAMES.plus}</Text>
          <Text style={styles.plusDaily}>{S.plans.dailyShort(PLAN_TUTOR_DAILY.plus)}</Text>
          <Text style={styles.plusLine}>{S.plans.dailyWhat}</Text>

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
                style={styles.cta}
              />
              {open ? null : <Text style={styles.note}>{S.plans.payingSoon}</Text>}
            </View>
          ) : null}
        </View>
      </Enter>

      <Enter index={1}>
        <View style={styles.pair}>
          <Tile tone="free" name={PLAN_NAMES.free} sub={S.plans.dailyShort(PLAN_TUTOR_DAILY.free)} badge={current === 'free' ? S.plans.current : null} />
          <Tile
            tone="max"
            name={PLAN_NAMES.max}
            sub={current === 'max' ? S.plans.dailyShort(PLAN_TUTOR_DAILY.max) : S.plans.maxSub}
            badge={current === 'max' ? S.plans.current : S.plans.soon}
          />
        </View>
      </Enter>
    </Screen>
  );
}

/** Үнэгүй (lime) ба Max (violet): ижил өргөн, ижил өндөр (мөрөөрөө сунана), бичвэр голлосон. */
function Tile({ tone, name, sub, badge }: { tone: 'free' | 'max'; name: string; sub: string; badge: string | null }) {
  const max = tone === 'max';
  return (
    <View style={[styles.tile, max ? styles.tileMax : styles.tileFree]}>
      {/* тэмдэггүй ч зай нь үлдэнэ: хоёр картын нэр, бичвэр нэг түвшинд */}
      <Text aria-hidden={!badge} style={[styles.badge, max ? styles.badgeLemon : styles.badgeInk, !badge && styles.hidden]}>{badge ?? S.plans.current}</Text>
      <Text style={[styles.tileName, max && styles.onDark]}>{name}</Text>
      <Text style={[styles.tileSub, max && styles.onDarkSoft]}>{sub}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },

  plus: {
    alignItems: 'center',
    backgroundColor: colors.indigo,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.ink,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 22,
    gap: 8,
    marginBottom: 16,
    ...hardShadow(5),
  },
  bearBox: { width: BEAR_W, height: BEAR_H },
  // scale нь төвөөс хийгддэг тул анхны хэмжээтэй view-г хайрцагны төвд байрлуулна
  bearScale: {
    position: 'absolute',
    width: BEAR.width,
    height: BEAR.height,
    left: (BEAR_W - BEAR.width) / 2,
    top: (BEAR_H - BEAR.height) / 2,
    transform: [{ scale: BEAR_SCALE }],
  },
  plusName: { fontFamily: fonts.extrabold, fontSize: 32, lineHeight: 36, letterSpacing: -1, color: colors.white, textAlign: 'center' },
  plusDaily: { fontFamily: fonts.extrabold, fontSize: 22, lineHeight: 26, letterSpacing: -0.4, color: colors.lemon, textAlign: 'center' },
  plusLine: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 21, color: colors.lavender, textAlign: 'center' },

  buy: { alignSelf: 'stretch', alignItems: 'center', gap: 12, marginTop: 10 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 6 },
  amount: { fontFamily: fonts.extrabold, fontSize: 40, lineHeight: 44, letterSpacing: -1, color: colors.lemon },
  perMonth: { fontFamily: fonts.semibold, fontSize: 18, color: colors.white },
  cta: { alignSelf: 'stretch' },
  note: { fontFamily: fonts.semibold, fontSize: 13, color: colors.lavender, textAlign: 'center' },

  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, overflow: 'hidden', fontFamily: fonts.bold, fontSize: 12 },
  badgeLemon: { backgroundColor: colors.lemon, color: colors.ink },
  badgeInk: { backgroundColor: colors.ink, color: colors.white },

  pair: { flexDirection: 'row', gap: 12 },
  tile: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    borderRadius: radius.card,
    borderWidth: 2,
    borderColor: colors.ink,
    paddingVertical: 18,
    paddingHorizontal: 10,
    ...hardShadow(4),
  },
  tileFree: { backgroundColor: colors.lime },
  tileMax: { backgroundColor: colors.violet },
  tileName: { fontFamily: fonts.extrabold, fontSize: 20, lineHeight: 24, letterSpacing: -0.4, color: colors.ink, textAlign: 'center' },
  tileSub: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 19, color: colors.ink, textAlign: 'center' },
  onDark: { color: colors.white },
  onDarkSoft: { color: colors.lavender },
  hidden: { opacity: 0 },
});
