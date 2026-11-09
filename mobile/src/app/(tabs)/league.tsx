import type { LeagueClanDto, LeagueResponse } from '@shared/types';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { api, errorText } from '@/api/client';
import { Button } from '@/components/Button';
import { ClanRow } from '@/components/league/ClanRow';
import { ClanSheet } from '@/components/league/ClanSheet';
import { GradePicker } from '@/components/league/GradePicker';
import { JoinClanSheet } from '@/components/league/JoinClanSheet';
import { RulesHelp } from '@/components/league/RulesHelp';
import { TierHeader } from '@/components/league/TierHeader';
import { PixelText } from '@/components/pinecones';
import { LiveQuizBanner } from '@/components/teacher/LiveQuizBanner';
import { Card, ErrorText, Muted, Screen } from '@/components/ui';
import { colors, fonts, radius } from '@/constants/theme';
import { L } from '@/i18n/league';

/**
 * Анги (доод цэсний 5-р tab): ангидаа нэгдээд ижил ангийн бусад ангитай энэ 7 хоногт метрээр уралдана (Duolingo лиг шиг).
 * Дээр лигийн шат, дараа нь уралдааны жагсаалт. Ангигүй бол гарчгийн хажуудах товчоор байгуулах / кодоор нэгдэх (/uul), лиг ба
 * өөрийн ангийн (grade) уралдаан харагдсаар. Миний анги дээр дарвал ангиа нээнэ, өөр анги дээр дарвал товч мэдээлэл.
 */
export default function LeagueScreen() {
  const [data, setData] = useState<LeagueResponse | null>(null);
  const [error, setError] = useState('');
  const [open, setOpen] = useState<LeagueClanDto | null>(null);
  /** Харж буй анги (grade); null = миний анги */
  const [grade, setGrade] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setError('');
      setData(await api<LeagueResponse>(grade === null ? '/league' : `/league?grade=${grade}`));
    } catch (e) {
      setError(errorText(e));
    }
  }, [grade]);
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );
  // дэлгэцээс гармагц өөр ангийн сонголт арилна: буцаж ирэхэд өөрийн ангийн лиг
  useFocusEffect(useCallback(() => () => setGrade(null), []));

  const max = Math.max(0, ...(data?.standings.map((c) => c.weekXp) ?? []));
  const shown = grade ?? data?.me.grade ?? null;

  return (
    <Screen tabBar contentStyle={styles.content}>
      <View style={styles.head}>
        <View style={styles.titleRow}>
          <View accessibilityRole="header">
            <PixelText text={L.title.toUpperCase()} px={3} color={colors.ink} shadow={colors.stone} />
          </View>
          <RulesHelp noClan={data?.me.state === 'no_clan'} />
          {data?.me.state === 'no_clan' ? <JoinClanSheet /> : null}
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
      ) : (
        <>
          <TierHeader tier={data.me.tier} promoted={data.me.promoted} preview={data.me.state === 'no_clan'} />
          <View style={styles.table}>
            <View style={styles.tableHead}>
              {shown !== null ? (
                <GradePicker value={shown} mine={data.me.grade} onChange={setGrade} />
              ) : (
                <Text style={styles.tableTitle}>{L.standingsAny}</Text>
              )}
              <Text style={styles.chip}>{L.timeLeft(data.season.endsAt - Date.now())}</Text>
            </View>
            {data.standings.length === 0 ? <Muted>{shown === data.me.grade ? L.noStandings : L.noStandingsOther}</Muted> : null}
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
  table: { gap: 8 },
  // нарийн дэлгэцэд цагийн chip доод мөрөнд буух ба гарчиг тасрахгүй
  tableHead: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
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
