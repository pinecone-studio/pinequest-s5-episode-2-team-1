import { clanTitle } from '@shared/clan';
import type { LeagueClanDto, LeagueResponse } from '@shared/types';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { api, errorText } from '@/api/client';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { PixelText } from '@/components/pinecones';
import { Card, ErrorText, Muted, Screen } from '@/components/ui';
import { colors, fonts, hardShadow, radius } from '@/constants/theme';
import { S } from '@/i18n/strings';

const DAY_MS = 86_400_000;

/**
 * Анги (доод цэсний 5-р tab): ангидаа нэгдээд ижил ангийн бусад ангитай энэ 7 хоногт өрсөлдөнө. Ангигүй бол
 * байгуулах эсвэл кодоор нэгдэх (/uul). Байвал ангиудын эрэмбэ: миний анги дээр дарвал ангиа нээнэ, өөр анги дээр
 * дарвал товч мэдээлэл (нэр, байр, гишүүдийн тоо, нэргүй баавгай).
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

  return (
    <Screen tabBar contentStyle={styles.content}>
      <View style={styles.head}>
        <View accessibilityRole="header">
          <PixelText text={S.league.title.toUpperCase()} px={3} color={colors.ink} shadow={colors.stone} />
        </View>
        <Text style={styles.sub}>{S.league.sub}</Text>
      </View>

      {!data ? (
        error ? (
          <Card style={styles.center}>
            <ErrorText>{`${S.league.loadError} ${error}`}</ErrorText>
            <Button title={S.league.retry} onPress={() => void load()} />
          </Card>
        ) : (
          <ActivityIndicator color={colors.violet} style={{ marginTop: 24 }} />
        )
      ) : data.me.state === 'no_clan' ? (
        <Card style={styles.cta}>
          <Text style={styles.ctaTitle}>{S.league.noClanTitle}</Text>
          <Muted>{S.league.noClanBody}</Muted>
          <Button title={S.league.toClan} onPress={() => router.push('/uul')} />
        </Card>
      ) : (
        <View style={styles.table}>
          <MineCard clan={data.standings.find((c) => c.isMine) ?? null} />
          <View style={styles.tableHead}>
            <Text style={styles.tableTitle}>{data.me.grade !== null ? S.league.standings(data.me.grade) : S.league.standingsAny}</Text>
            <Text style={styles.tableNote}>{S.league.daysLeft(Math.ceil((data.season.endsAt - Date.now()) / DAY_MS))}</Text>
          </View>
          {data.standings.map((c) => (
            <ClanRow key={c.id} clan={c} onPress={() => (c.isMine ? router.push('/uul') : setOpen(c))} />
          ))}
          {data.standings.length === 1 ? <Muted>{S.league.onlyMe}</Muted> : null}
        </View>
      )}

      <ClanSheet clan={open} onClose={() => setOpen(null)} />
    </Screen>
  );
}

const MEDAL = ['#F2C94C', '#C9CDD6', '#D9935B'];

/** Миний анги: байр, гишүүд, энэ 7 хоногийн метр, ангиа нээх. */
function MineCard({ clan }: { clan: LeagueClanDto | null }) {
  if (!clan) return null;
  return (
    <Card style={styles.mine}>
      <View style={styles.mineTop}>
        <View style={styles.mineLooks}>
          {clan.looks.slice(0, 3).map((look, i) => (
            <View key={i} style={i > 0 && styles.overlap}>
              <Avatar size={44} border={2} look={look} />
            </View>
          ))}
        </View>
        <View style={styles.minePlace}>
          <Text style={styles.minePlaceNum}>{clan.rank}</Text>
          <Text style={styles.minePlaceLabel}>{S.league.place}</Text>
        </View>
      </View>
      <View style={{ gap: 2 }}>
        <Text style={styles.mineName} numberOfLines={1}>
          {clanTitle(clan.name)}
        </Text>
        <Text style={styles.mineMeta}>{`${S.league.members(clan.members)} · ${S.league.weekMeters(clan.weekHeight)} ${S.league.weekLabel}`}</Text>
      </View>
      <Button title={S.league.openClan} variant="lemon" onPress={() => router.push('/uul')} />
    </Card>
  );
}

function ClanRow({ clan, onPress }: { clan: LeagueClanDto; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={S.league.rowA11y(clan.rank, clan.name, clan.weekHeight, clan.isMine)}
      onPress={onPress}
      style={({ pressed }) => [styles.row, clan.isMine && styles.rowMine, pressed && { opacity: 0.85 }]}
    >
      <View style={[styles.rank, clan.rank <= 3 && { backgroundColor: MEDAL[clan.rank - 1] }]}>
        <Text style={styles.rankText}>{clan.rank}</Text>
      </View>
      <Avatar size={40} border={2} look={clan.looks[0]} />
      <View style={styles.rowTexts}>
        <Text style={styles.rowName} numberOfLines={1}>
          {clanTitle(clan.name)}
        </Text>
        <Text style={styles.rowMeta} numberOfLines={1}>
          {S.league.members(clan.members)}
        </Text>
      </View>
      <View style={styles.rowScore}>
        <Text style={styles.rowMeters}>{S.league.weekMeters(clan.weekHeight)}</Text>
        <Text style={styles.rowMeta}>{S.league.weekLabel}</Text>
      </View>
    </Pressable>
  );
}

/** Өөр ангийн товч мэдээлэл: зөвхөн нэр, байр, гишүүдийн тоо, нэргүй баавгай (урилгын код, хүүхдийн нэр байхгүй). */
function ClanSheet({ clan, onClose }: { clan: LeagueClanDto | null; onClose: () => void }) {
  return (
    <Modal transparent visible={clan !== null} animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel={S.league.close}>
        {clan ? (
          <Pressable style={styles.sheet} accessibilityViewIsModal onPress={() => undefined}>
            <Text accessibilityRole="header" style={styles.sheetTitle}>
              {clanTitle(clan.name)}
            </Text>
            <Muted>{`${clan.rank}-р байр · ${S.league.members(clan.members)} · ${S.league.weekMeters(clan.weekHeight)} ${S.league.weekLabel}`}</Muted>
            <View style={styles.looks}>
              {clan.looks.map((look, i) => (
                <Avatar key={i} size={44} border={2} look={look} />
              ))}
            </View>
            <Button title={S.league.close} variant="secondary" onPress={onClose} />
          </Pressable>
        ) : null}
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  content: { gap: 16, paddingTop: 16 },
  center: { alignItems: 'center', gap: 12 },
  head: { gap: 8 },
  mine: { gap: 14, backgroundColor: colors.lavender, marginBottom: 8 },
  mineTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  mineLooks: { flexDirection: 'row' },
  overlap: { marginLeft: -12 },
  minePlace: { alignItems: 'center', minWidth: 56 },
  minePlaceNum: { fontFamily: fonts.pixelNum, fontSize: 28, lineHeight: 32, color: colors.indigo },
  minePlaceLabel: { fontFamily: fonts.bold, fontSize: 12, color: colors.muted },
  mineName: { fontFamily: fonts.extrabold, fontSize: 20, color: colors.ink },
  mineMeta: { fontFamily: fonts.medium, fontSize: 14, color: colors.muted },
  sub: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 21, color: colors.muted },
  cta: { gap: 12 },
  ctaTitle: { fontFamily: fonts.bold, fontSize: 17, lineHeight: 23, color: colors.ink },
  table: { gap: 8 },
  tableHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 },
  tableTitle: { flexShrink: 1, fontFamily: fonts.extrabold, fontSize: 17, color: colors.ink },
  tableNote: { fontFamily: fonts.bold, fontSize: 13, color: colors.indigo },
  row: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.line,
  },
  rowMine: { borderColor: colors.violet, backgroundColor: colors.trackAlt },
  rank: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.track },
  rankText: { fontFamily: fonts.pixelNum, fontSize: 13, color: colors.ink },
  rowTexts: { flex: 1, gap: 2 },
  rowName: { fontFamily: fonts.bold, fontSize: 16, color: colors.ink },
  rowMeta: { fontFamily: fonts.medium, fontSize: 12, color: colors.muted },
  rowScore: { alignItems: 'flex-end' },
  // Silkscreen-д кирилл "м" байхгүй тул энгийн фонт
  rowMeters: { fontFamily: fonts.extrabold, fontSize: 15, color: colors.indigo },
  scrim: { flex: 1, backgroundColor: 'rgba(25,21,46,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.paper, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: 20, paddingBottom: 32, gap: 12, ...hardShadow(4) },
  sheetTitle: { fontFamily: fonts.extrabold, fontSize: 22, color: colors.ink },
  looks: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
});
