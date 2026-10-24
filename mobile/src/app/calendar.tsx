import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useAuth } from '@/auth/AuthContext';
import { Button } from '@/components/Button';
import { CalendarFace } from '@/components/CalendarFace';
import { Enter, Motion, Sprite } from '@/components/pixel';
import { Screen } from '@/components/ui';
import { colors, fonts, radius } from '@/constants/theme';
import { S } from '@/i18n/strings';
import { confirm } from '@/lib/confirm';
import { usePixelBear } from '@/lib/mock/pixelBear';
import { buildMonth, FACE } from '@/lib/pixelBear/calendar';
import { goBack } from '@/lib/nav';

const LEGEND = [
  { face: 'happy', label: S.calendar.legend.happy },
  { face: 'idle', label: S.calendar.legend.idle },
  { face: 'tired', label: S.calendar.legend.tired },
  { face: 'rest', label: S.calendar.legend.rest },
  { face: 'neglected', label: S.calendar.legend.neglected },
] as const;

function Chevron({ dir }: { dir: 'left' | 'right' }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={colors.ink} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
      <Path d={dir === 'right' ? 'm9 18 6-6-6-6' : 'm15 18-6-6 6-6'} />
    </Svg>
  );
}

/** 08 · Хичээлийн хуанли (аватар дээр дарж нээнэ) + гарах. */
export default function CalendarScreen() {
  const { me, signOut } = useAuth();
  const { bear } = usePixelBear();
  const [ty, tm] = (me?.today ?? '2026-01-01').split('-').map(Number);
  const [ym, setYm] = useState({ y: ty, m: tm });
  const month = useMemo(() => (me ? buildMonth(me, ym.y, ym.m) : null), [me, ym]);
  if (!me || !month) return null;

  const shift = (d: number) =>
    setYm(({ y, m }) => {
      const t = m + d;
      return t < 1 ? { y: y - 1, m: 12 } : t > 12 ? { y: y + 1, m: 1 } : { y, m: t };
    });
  const isCurrent = ym.y === ty && ym.m === tm;
  const rows = Array.from({ length: month.cells.length / 7 }, (_, i) => month.cells.slice(i * 7, i * 7 + 7));

  async function onLogout() {
    if (await confirm(S.auth.logoutConfirm, S.auth.logout)) await signOut();
  }

  return (
    <Screen contentStyle={{ paddingTop: 6 }}>
      <View style={styles.top}>
        <Pressable accessibilityRole="button" accessibilityLabel={S.calendar.close} onPress={() => goBack()} style={styles.iconBtn}>
          <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={colors.ink} strokeWidth={2.6} strokeLinecap="round">
            <Path d="M6 6l12 12M18 6 6 18" />
          </Svg>
        </Pressable>
        <Text accessibilityRole="header" style={styles.title}>
          {S.calendar.title}
        </Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.monthRow}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10 }}>
          <Text style={styles.month}>{S.calendar.month(ym.m)}</Text>
          <Text style={styles.year}>{ym.y}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable accessibilityRole="button" accessibilityLabel={S.calendar.prevMonth} onPress={() => shift(-1)} style={styles.round}>
            <Chevron dir="left" />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={S.calendar.nextMonth}
            accessibilityState={{ disabled: isCurrent }}
            disabled={isCurrent}
            onPress={() => shift(1)}
            style={[styles.round, isCurrent && { opacity: 0.4 }]}
          >
            <Chevron dir="right" />
          </Pressable>
        </View>
      </View>

      <Enter index={0} style={{ gap: 6 }}>
        <View style={styles.week}>
          {S.calendar.weekdays.map((d) => (
            <Text key={d} style={styles.weekday}>
              {d}
            </Text>
          ))}
        </View>
        {rows.map((row, i) => (
          <View key={i} style={styles.week}>
            {row.map((c) => (
              <CalendarFace key={c.key} cell={c} />
            ))}
          </View>
        ))}
      </Enter>

      <Enter index={1} style={styles.progress}>
        <Motion preset="bob" style={styles.peek}>
          <Sprite id="head_happy_164x108" label="Баярласан баавгай" />
        </Motion>
        <View style={styles.progressText}>
          <Text style={styles.progressLabel}>{S.calendar.progress}</Text>
          <Text style={styles.progressBig}>{S.calendar.studied(month.studied)}</Text>
          <Text style={styles.progressSub}>{S.calendar.restMissed(month.rest, month.missed)}</Text>
        </View>
      </Enter>

      <Enter index={2} style={styles.tiles}>
        <StatTile label={S.calendar.streak} value={String(me.streak)} sub={S.calendar.days} />
        <StatTile label={S.calendar.steady} value={`${month.steady}%`} sub={S.calendar.thisMonth} />
        <StatTile label={S.calendar.energy} value={`${bear?.energy ?? 0}%`} sub={S.calendar.now} />
      </Enter>

      <Enter index={3} style={styles.legend}>
        {LEGEND.map((l) => (
          <View key={l.face} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: FACE[l.face].bg }, l.face === 'happy' && { borderWidth: 1, borderColor: '#C9C66A' }]} />
            <Text style={styles.legendText}>{l.label}</Text>
          </View>
        ))}
      </Enter>

      <View style={styles.profile}>
        <Text style={styles.profileText}>{S.calendar.profile(me.username, me.grade)}</Text>
        <Button title={S.calendar.toProfile} variant="lemon" small onPress={() => router.push('/profile')} />
        <Button title={S.calendar.logout} variant="white" small onPress={onLogout} />
      </View>
    </Screen>
  );
}

function StatTile({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <View style={styles.tile} accessible accessibilityLabel={`${label}: ${value} ${sub}`}>
      <Text style={styles.tileLabel}>{label}</Text>
      <View>
        <Text style={styles.tileValue}>{value}</Text>
        <Text style={styles.tileSub}>{sub}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: -6 },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: fonts.semibold, fontSize: 17, color: colors.ink },
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  month: { fontFamily: fonts.semibold, fontSize: 24, letterSpacing: -0.5, color: colors.ink },
  year: { fontFamily: fonts.pixelMedium, fontSize: 16, color: colors.muted },
  round: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  week: { flexDirection: 'row', gap: 6 },
  weekday: { flex: 1, textAlign: 'center', fontFamily: fonts.semibold, fontSize: 12, color: colors.muted },
  progress: {
    minHeight: 124,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: radius.lg,
    backgroundColor: colors.pink,
    overflow: 'hidden',
    gap: 2,
  },
  progressLabel: { fontFamily: fonts.bold, fontSize: 13, letterSpacing: 0.8, textTransform: 'uppercase', color: colors.ink },
  progressText: { maxWidth: '62%', gap: 2 },
  progressBig: { fontFamily: fonts.semibold, fontSize: 28, lineHeight: 32, letterSpacing: -0.8, color: '#7A3B5E' },
  progressSub: { fontFamily: fonts.medium, fontSize: 14, color: '#5E3A50' },
  peek: { position: 'absolute', right: -22, bottom: -30 },
  tiles: { flexDirection: 'row', gap: 10 },
  tile: { flex: 1, height: 104, padding: 12, borderRadius: 22, backgroundColor: colors.stoneAlt, justifyContent: 'space-between' },
  tileLabel: { fontFamily: fonts.semibold, fontSize: 13, color: colors.ink },
  tileValue: { fontFamily: fonts.semibold, fontSize: 30, lineHeight: 32, letterSpacing: -1, color: colors.ink },
  tileSub: { fontFamily: fonts.medium, fontSize: 12, color: colors.muted },
  legend: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 6, columnGap: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 10, height: 10, borderRadius: 3 },
  legendText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.muted },
  profile: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingTop: 16,
    borderTopWidth: 2,
    borderTopColor: colors.line,
  },
  profileText: { flex: 1, fontFamily: fonts.semibold, fontSize: 15, color: colors.ink },
});
