import { PLAN_NAMES, PLAN_PERIOD_DAYS, PLAN_PRICE, PLAN_TUTOR_DAILY, type Plan } from '@shared/plan';
import type { PaymentsInfoResponse } from '@shared/types';
import { router } from 'expo-router';
import { type ReactNode, useEffect, useState } from 'react';
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

/** Дээд хэсгийн баавгай: самбарын өмнө тайлбарлаж буй TutorBear-ийг энэ өндөрт багтаана. */
const BEAR_H = 132;
const BEAR = frameSize('bear_tutor_0_1320x1344', tutor.sheets[0], tutor.columns);
const BEAR_SCALE = BEAR_H / BEAR.height;
const BEAR_W = Math.round(BEAR.width * BEAR_SCALE);

/** ms → 2026-12-09 (төхөөрөмжийн цагаар). */
function day(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Багцууд. Дээр нь гол давуу тал (AI баавгай алдсан бодлогыг тайлбарлана), дараа нь Үнэгүй ба Plus-ын өдрийн тайлбарын
 * тоо, тодотгосон Plus карт (вэб дээр үнэ, авах товч), Үнэгүй, удахгүй гарах Max. Авах товч сервер худалдан авалт
 * нээлттэй (GET /payments → open) гэх хүртэл дарагдахгүй.
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

  const plusMine = current === 'plus';

  return (
    <Screen>
      <View style={styles.header}>
        <BackButton onPress={() => goBack('/profile')} />
        <Text accessibilityRole="header" style={[type.h1, { flex: 1 }]}>
          {S.plans.title}
        </Text>
      </View>

      <Enter index={0}>
        <View style={styles.hero}>
          <View style={styles.heroText}>
            <Text style={styles.heroTitle}>{S.plans.heroTitle}</Text>
            <Text style={styles.heroBody}>{S.plans.heroBody}</Text>
          </View>
          <View style={styles.bearBox} importantForAccessibility="no-hide-descendants">
            <View style={styles.bearScale}>
              <TutorBear phase="bear" mouth={0} label="" />
            </View>
          </View>
        </View>
      </Enter>

      <Enter index={1}>
        <View style={styles.compare} accessible accessibilityLabel={`${S.plans.compareTitle}: ${PLAN_NAMES.free} ${PLAN_TUTOR_DAILY.free}, ${PLAN_NAMES.plus} ${PLAN_TUTOR_DAILY.plus}`}>
          <Text style={styles.compareTitle}>{S.plans.compareTitle}</Text>
          <View style={styles.compareRow}>
            <Count n={PLAN_TUTOR_DAILY.free} name={PLAN_NAMES.free} />
            <Text style={styles.arrow}>→</Text>
            <Count n={PLAN_TUTOR_DAILY.plus} name={PLAN_NAMES.plus} strong />
          </View>
        </View>
      </Enter>

      <Enter index={2}>
        <View style={[styles.card, styles.plus]}>
          <View style={styles.top}>
            <Text style={type.h2}>{PLAN_NAMES.plus}</Text>
            <Badge tone={plusMine ? 'ink' : 'white'}>{plusMine ? S.plans.current : S.plans.recommended}</Badge>
          </View>
          {CAN_BUY ? (
            <View>
              <View style={styles.priceRow}>
                <Text style={styles.amount}>{S.plans.amount(PLAN_PRICE.plus)}</Text>
                <Text style={styles.perMonth}>{S.plans.perMonth}</Text>
              </View>
              <Text style={styles.perDay}>
                {plusMine && me?.planUntil ? S.plans.until(day(me.planUntil)) : S.plans.perDay(Math.round(PLAN_PRICE.plus / PLAN_PERIOD_DAYS))}
              </Text>
            </View>
          ) : null}
          <Features items={[S.plans.tutorDaily(PLAN_TUTOR_DAILY.plus), S.plans.plusExtra]} />
          {CAN_BUY ? (
            <View style={styles.cta}>
              <Button
                title={plusMine ? S.plans.extend : S.plans.buy}
                variant="ink"
                disabled={!open}
                onPress={() => router.push('/pay')}
              />
              {open ? null : <Text style={styles.ctaNote}>{S.plans.payingSoon}</Text>}
            </View>
          ) : null}
        </View>
      </Enter>

      <Enter index={3}>
        <View style={[styles.card, styles.free, current === 'free' && styles.mine]}>
          <View style={styles.top}>
            <Text style={type.h3}>{PLAN_NAMES.free}</Text>
            {current === 'free' ? <Badge tone="ink">{S.plans.current}</Badge> : null}
          </View>
          <Features items={[S.plans.tutorDaily(PLAN_TUTOR_DAILY.free), ...S.plans.base]} />
        </View>
      </Enter>

      <Enter index={4}>
        <View style={[styles.card, styles.max, current === 'max' && styles.mine]}>
          <View style={styles.top}>
            <Text style={[type.h3, current === 'max' ? null : styles.dim]}>{PLAN_NAMES.max}</Text>
            <Badge tone={current === 'max' ? 'ink' : 'white'}>{current === 'max' ? S.plans.current : S.plans.soon}</Badge>
          </View>
          <Features items={[S.plans.maxExtra, S.plans.maxSoon]} dim={current !== 'max'} />
        </View>
      </Enter>

      {CAN_BUY ? (
        <View style={styles.notes}>
          {S.plans.notes.map((n) => (
            <Text key={n} style={type.small}>
              • {n}
            </Text>
          ))}
        </View>
      ) : null}
    </Screen>
  );
}

/** Өдрийн тайлбарын тоо: Silkscreen том тоо (зөвхөн цифр), доор нь багцын нэр. */
function Count({ n, name, strong }: { n: number; name: string; strong?: boolean }) {
  return (
    <View style={[styles.count, strong && styles.countStrong]}>
      <Text style={[styles.countNum, strong && styles.countNumStrong]}>{n}</Text>
      <Text style={[styles.countName, strong && styles.countNameStrong]} numberOfLines={1}>
        {name}
      </Text>
    </View>
  );
}

function Badge({ children, tone }: { children: ReactNode; tone: 'ink' | 'white' }) {
  return <Text style={[styles.badge, tone === 'ink' ? styles.badgeInk : styles.badgeWhite]}>{children}</Text>;
}

function Features({ items, dim }: { items: string[]; dim?: boolean }) {
  return (
    <View style={styles.list}>
      {items.map((f) => (
        <View key={f} style={styles.row}>
          <Text style={[styles.tick, dim && styles.dim]}>✓</Text>
          <Text style={[type.body, { flex: 1 }, dim && styles.dim]}>{f}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },

  hero: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: colors.indigo,
    borderRadius: radius.lg,
    paddingLeft: 18,
    paddingTop: 18,
    paddingRight: 6,
    overflow: 'hidden',
    marginBottom: 14,
  },
  heroText: { flex: 1, gap: 8, paddingBottom: 18 },
  heroTitle: { fontFamily: fonts.bold, fontSize: 21, lineHeight: 26, letterSpacing: -0.4, color: colors.white },
  heroBody: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 19, color: colors.lavender },
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

  compare: { backgroundColor: colors.white, borderRadius: radius.card, padding: 16, gap: 12, marginBottom: 14 },
  compareTitle: { ...type.label, color: colors.muted, textAlign: 'center' },
  compareRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  arrow: { fontFamily: fonts.bold, fontSize: 22, color: colors.mutedIcon },
  count: { flex: 1, alignItems: 'center', gap: 6, paddingVertical: 12, borderRadius: radius.md, backgroundColor: colors.paper },
  countStrong: { backgroundColor: colors.lime, borderWidth: 2, borderColor: colors.ink },
  countNum: { fontFamily: fonts.pixelNum, fontSize: 40, lineHeight: 44, color: colors.muted },
  countNumStrong: { color: colors.ink },
  countName: { fontFamily: fonts.semibold, fontSize: 13, color: colors.muted },
  countNameStrong: { color: colors.ink },

  card: { borderRadius: radius.card, padding: 18, gap: 12, marginBottom: 14 },
  plus: { backgroundColor: colors.lime, borderWidth: 2, borderColor: colors.ink, ...hardShadow(4), marginBottom: 18 },
  free: { backgroundColor: colors.white },
  max: { backgroundColor: colors.lavender, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.mutedIcon },
  mine: { borderWidth: 2, borderStyle: 'solid', borderColor: colors.ink },
  top: { flexDirection: 'row', alignItems: 'center', gap: 8 },

  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  amount: { fontFamily: fonts.extrabold, fontSize: 36, lineHeight: 40, letterSpacing: -1, color: colors.ink },
  perMonth: { fontFamily: fonts.semibold, fontSize: 17, color: colors.ink },
  perDay: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 19, color: colors.muted, marginTop: 2 },

  cta: { gap: 8, marginTop: 4 },
  ctaNote: { fontFamily: fonts.semibold, fontSize: 13, color: colors.muted, textAlign: 'center' },

  badge: {
    marginLeft: 'auto',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    overflow: 'hidden',
    fontFamily: fonts.bold,
    fontSize: 12,
  },
  badgeInk: { backgroundColor: colors.ink, color: colors.white },
  badgeWhite: { backgroundColor: colors.white, color: colors.ink },

  list: { gap: 8 },
  row: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  tick: { fontFamily: fonts.bold, fontSize: 15, lineHeight: 21, color: colors.okText },
  dim: { color: colors.muted },

  notes: { gap: 4, paddingHorizontal: 4, marginTop: 2 },
});
