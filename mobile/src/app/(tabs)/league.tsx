import type { LeagueClanDto, LeagueResponse } from '@shared/types';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { api, errorText } from '@/api/client';
import { Button } from '@/components/Button';
import { ClanRow } from '@/components/league/ClanRow';
import { ClanSheet } from '@/components/league/ClanSheet';
import { RulesHelp } from '@/components/league/RulesHelp';
import { TierHeader } from '@/components/league/TierHeader';
import { PixelText } from '@/components/pinecones';
import { LiveQuizBanner } from '@/components/teacher/LiveQuizBanner';
import { Card, ErrorText, Muted, Screen } from '@/components/ui';
import { colors, fonts, radius } from '@/constants/theme';
import { L } from '@/i18n/league';

/**
 * Анги (доод цэсний 5-р tab): ангидаа нэгдээд ижил ангийн бусад ангитай энэ 7 хоногт метрээр уралдана (Duolingo лиг шиг).
 * Дээр миний байр ба дээд ангийг давахад хэдэн м дутуу, дараа нь дүрэм, уралдааны жагсаалт. Ангигүй бол байгуулах эсвэл
 * кодоор нэгдэх (/uul). Миний анги дээр дарвал ангиа нээнэ, өөр анги дээр дарвал товч мэдээлэл.
 */
export default function LeagueScreen() {
  const [data, setData] = useState<LeagueResponse | null>(null);
  const [error, setError] = useState('');
  const [open, setOpen] = useState<LeagueClanDto | null>(null);

  const load = useCallback(async () => {
    try {
      setError('');
      setData(await api<LeagueResponse>('/league'));
    } catch (e) {
      setError(errorText(e));
    }
  }, []);
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const max = Math.max(0, ...(data?.standings.map((c) => c.weekXp) ?? []));

  return (
    <Screen tabBar contentStyle={styles.content}>
      <View style={styles.head}>
        <View style={styles.titleRow}>
          <View accessibilityRole="header">
            <PixelText text={L.title.toUpperCase()} px={3} color={colors.ink} shadow={colors.stone} />
          </View>
          <RulesHelp />
        </View>
        <Text style={styles.sub}>{L.sub}</Text>
      </View>
      <LiveQuizBanner />

      {!data ? (
        error ? (
          <Card style={styles.center}>
            <ErrorText>{`${L.loadError} ${error}`}</ErrorText>
            <Button title={L.retry} onPress={() => void load()} />
          </Card>
        ) : (
          <ActivityIndicator color={colors.violet} style={{ marginTop: 24 }} />
        )
      ) : data.me.state === 'no_clan' ? (
        <Card style={styles.cta}>
          <Text style={styles.ctaTitle}>{L.noClanTitle}</Text>
          <Muted>{L.noClanBody}</Muted>
          <Button title={L.toClan} onPress={() => router.push('/uul')} />
          <Button title={L.toJoin} variant="secondary" onPress={() => router.push('/uul')} />
        </Card>
      ) : (
        <>
          <TierHeader tier={data.me.tier} promoted={data.me.promoted} />
          <View style={styles.table}>
            <View style={styles.tableHead}>
              <Text style={styles.tableTitle}>{data.me.grade !== null ? L.standings(data.me.grade) : L.standingsAny}</Text>
              <Text style={styles.chip}>{L.timeLeft(data.season.endsAt - Date.now())}</Text>
            </View>
            {data.standings.map((c) => (
              <ClanRow key={c.id} clan={c} max={max} onPress={() => (c.isMine ? router.push('/uul') : setOpen(c))} />
            ))}
          </View>
        </>
      )}

      <ClanSheet clan={open} onClose={() => setOpen(null)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: 16, paddingTop: 16 },
  center: { alignItems: 'center', gap: 12 },
  head: { gap: 8 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  sub: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 21, color: colors.muted },
  cta: { gap: 12 },
  ctaTitle: { fontFamily: fonts.bold, fontSize: 17, lineHeight: 23, color: colors.ink },
  table: { gap: 8 },
  tableHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  tableTitle: { flexShrink: 1, fontFamily: fonts.extrabold, fontSize: 17, color: colors.ink },
  chip: {
    flexShrink: 0,
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.ink,
    backgroundColor: colors.lemon,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    overflow: 'hidden',
  },
});
