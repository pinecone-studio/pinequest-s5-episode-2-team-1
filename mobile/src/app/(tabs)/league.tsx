import { clanTitle } from '@shared/clan';
import { LEAGUE_TIERS, leagueTitle } from '@shared/league';
import type { LeagueClanDto, LeagueResponse } from '@shared/types';
import { router, useFocusEffect } from 'expo-router';
import { type ComponentRef, useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { api, errorText } from '@/api/client';
import { SpeechBubble } from '@/components/AuthShell';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { LiveBear } from '@/components/LiveBear';
import { Motion, Pop, Sprite, ZoomEnter } from '@/components/pixel';
import { Card, ErrorText, Muted, Screen } from '@/components/ui';
import { colors, fonts, hardShadow, radius } from '@/constants/theme';
import { S } from '@/i18n/strings';
import { usePixelBear } from '@/lib/mock/pixelBear';
import { wornItems } from '@/lib/pixelBear/catalog';
import type { SpriteKey } from '@/sprites';

/** LiveBear-ийн frame (px 2): өргөн ба өндөр, лиг дээрх хэмжээ */
const BEAR_W = 140;
const BEAR_H = 260;
const BEAR_SCALE = 0.75;
/** carousel-ийн нэг лигийн өргөн (snap) */
const TIER_W = 96;
const DAY_MS = 86_400_000;

type TierState = 'current' | 'passed' | 'locked';
const badge = (key: string, big: boolean) => `league_${key}_${big ? '64x64' : '32x32'}` as SpriteKey;

/**
 * Лиг (доод цэсний 5-р tab): дээр нь гараа даллаж буй баавгай (Нүүрнийх шиг өмссөн хувцастай), доор нь лигүүдийн
 * хэвтээ carousel (одоогийн лиг тод), сонгосон лигийн тайлбар, миний Уул, бүлгийн эрэмбэ. Уул дээр дарвал товч
 * мэдээлэл. Чөлөөт тулаан (одоогийн дуэлийн лобби) нь 4-р tab-д хэвээр.
 */
export default function LeagueScreen() {
  const { outfitIds } = usePixelBear();
  const { width } = useWindowDimensions();
  const [data, setData] = useState<LeagueResponse | null>(null);
  const [error, setError] = useState('');
  const [view, setView] = useState<number | null>(null);
  const [open, setOpen] = useState<LeagueClanDto | null>(null);
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);

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

  const tier = data?.me.tier ?? 1;
  const shown = view ?? tier;
  // contentOffset зөвхөн анх mount хийхэд хэрэгжинэ: лиг ирэхэд (1-ээс өөр бол) одоогийн лиг рүү гүйлгэнэ
  useEffect(() => {
    scroll.current?.scrollTo({ x: (tier - 1) * TIER_W, animated: false });
  }, [tier]);
  const stateOf = (t: number): TierState => (t === tier ? 'current' : t < tier ? 'passed' : 'locked');
  const side = Math.max(16, (Math.min(width, 520) - TIER_W) / 2);

  return (
    <Screen tabBar contentStyle={styles.content}>
      <View style={styles.stage}>
        <ZoomEnter style={styles.halo}>
          <Motion preset="breathe">
            <View style={styles.haloCircle} />
          </Motion>
        </ZoomEnter>
        <Pop trigger={1} from={0.9}>
          {/* LiveBear-ийн frame 260dp өндөр (w нь зөвхөн төвлөрүүлнэ): доод талаар нь 0.75 болгож бөмбөлөгнөөс доош багтаана */}
          <View style={styles.bear}>
            <View style={styles.bearScale}>
              <LiveBear anim="happy" w={BEAR_W} items={wornItems(outfitIds)} label="Гараа даллаж буй баавгай" />
            </View>
          </View>
        </Pop>
        <ZoomEnter delay={250} style={styles.bubbleAt}>
          <SpeechBubble>{S.league.hello}</SpeechBubble>
        </ZoomEnter>
      </View>

      <ScrollView
        ref={scroll}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={TIER_W}
        decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: side }}
        style={styles.carousel}
        contentOffset={{ x: (tier - 1) * TIER_W, y: 0 }}
        // web дээр onMomentumScrollEnd ирдэггүй тул гүйлгэх бүрт төвийн лигийг тооцно
        scrollEventThrottle={32}
        onScroll={(e) => {
          const t = Math.min(LEAGUE_TIERS.length, Math.max(1, Math.round(e.nativeEvent.contentOffset.x / TIER_W) + 1));
          if (t !== shown) setView(t);
        }}
      >
        {LEAGUE_TIERS.map((t) => {
          const st = stateOf(t.tier);
          const focus = t.tier === shown;
          return (
            <Pressable
              key={t.key}
              accessibilityRole="button"
              accessibilityState={{ selected: focus }}
              accessibilityLabel={S.league.tierA11y(t.name, st === 'current' ? S.league.current : st === 'passed' ? S.league.passed : S.league.locked)}
              onPress={() => {
                setView(t.tier);
                scroll.current?.scrollTo({ x: (t.tier - 1) * TIER_W, animated: true });
              }}
              style={styles.tier}
            >
              <View style={[styles.badgeBox, st === 'locked' && styles.lockedBadge]}>
                <Sprite id={badge(t.key, focus)} />
              </View>
              <Text style={[styles.tierName, focus && styles.tierNameOn]} numberOfLines={1}>
                {t.name}
              </Text>
              <Text style={[styles.tierState, st === 'current' && styles.tierStateOn]} numberOfLines={1}>
                {st === 'current' ? S.league.current : st === 'passed' ? S.league.passed : S.league.locked}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.head}>
        <Text accessibilityRole="header" style={styles.title}>
          {leagueTitle(shown)}
        </Text>
        {shown === tier ? (
          <Text style={styles.sub}>
            {S.league.rule}
            {data ? <Text style={styles.days}>{` · ${S.league.daysLeft(Math.ceil((data.season.endsAt - Date.now()) / DAY_MS))}`}</Text> : null}
          </Text>
        ) : (
          <Text style={styles.sub}>{shown > tier ? S.league.lockedHint(LEAGUE_TIERS[shown - 2].name) : S.league.passedHint}</Text>
        )}
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
      ) : shown !== tier ? null : data.me.state === 'no_clan' ? (
        <Card style={styles.cta}>
          <Text style={styles.ctaTitle}>{S.league.noClanTitle}</Text>
          <Muted>{S.league.noClanBody}</Muted>
          <Button title={S.league.toClan} onPress={() => router.push('/uul')} />
        </Card>
      ) : data.me.state === 'too_small' ? (
        <Card style={styles.cta}>
          <Text style={styles.ctaTitle}>{S.league.tooSmallTitle(data.me.members, data.me.minMembers)}</Text>
          <View style={styles.progress} accessible accessibilityLabel={S.league.tooSmallTitle(data.me.members, data.me.minMembers)}>
            <View style={[styles.progressFill, { width: `${(Math.min(data.me.members, data.me.minMembers) / data.me.minMembers) * 100}%` }]} />
          </View>
          <Muted>{S.league.tooSmallBody}</Muted>
          <Button title={S.league.invite} onPress={() => router.push('/uul')} />
        </Card>
      ) : (
        <View style={styles.table}>
          <View style={styles.tableHead}>
            <Text style={styles.tableTitle}>{S.league.standings}</Text>
            {data.me.grade !== null ? <Text style={styles.tableNote}>{S.league.groupNote(data.me.grade)}</Text> : null}
          </View>
          {data.standings.map((c) => (
            <ClanRow key={c.id} clan={c} onPress={() => (c.isMine ? router.push('/uul') : setOpen(c))} />
          ))}
          {data.standings.length === 1 ? <Muted>{S.league.onlyMe}</Muted> : null}
        </View>
      )}

      <Button title={S.league.freeDuel} variant="secondary" onPress={() => router.navigate('/duel')} />

      <ClanSheet clan={open} onClose={() => setOpen(null)} />
    </Screen>
  );
}

const MEDAL = ['#F2C94C', '#C9CDD6', '#D9935B'];

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

/** Өөр Уулын товч мэдээлэл: зөвхөн нэр, байр, гишүүдийн тоо, нэргүй баавгай (урилгын код, хүүхдийн нэр байхгүй). */
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
            <Button title={S.league.challenge} disabled onPress={() => undefined} />
            <Muted center>{S.league.challengeSoon}</Muted>
            <Button title={S.league.close} variant="secondary" onPress={onClose} />
          </Pressable>
        ) : null}
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  content: { gap: 14, paddingTop: 8 },
  center: { alignItems: 'center', gap: 12 },
  stage: { height: 260, alignItems: 'center', justifyContent: 'flex-end' },
  bear: { height: BEAR_H * BEAR_SCALE, justifyContent: 'flex-end' },
  bearScale: { transform: [{ scale: BEAR_SCALE }], transformOrigin: 'bottom' },
  halo: { position: 'absolute', bottom: 0, alignSelf: 'center' },
  haloCircle: { width: 190, height: 190, borderRadius: 95, backgroundColor: colors.lavender },
  bubbleAt: { position: 'absolute', top: 0, right: 0, maxWidth: 180 },
  carousel: { marginHorizontal: -20, flexGrow: 0 },
  tier: { width: TIER_W, alignItems: 'center', gap: 4, paddingVertical: 4, minHeight: 56 },
  badgeBox: { height: 64, justifyContent: 'center' },
  lockedBadge: { opacity: 0.35 },
  tierName: { fontFamily: fonts.bold, fontSize: 13, color: colors.muted },
  tierNameOn: { color: colors.ink, fontSize: 14 },
  tierState: { fontFamily: fonts.medium, fontSize: 12, color: colors.muted },
  tierStateOn: { color: colors.violet, fontFamily: fonts.bold },
  head: { alignItems: 'center', gap: 4 },
  title: { fontFamily: fonts.extrabold, fontSize: 24, lineHeight: 30, color: colors.ink, textAlign: 'center' },
  sub: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 20, color: colors.muted, textAlign: 'center' },
  days: { fontFamily: fonts.bold, color: colors.indigo },
  cta: { gap: 12 },
  ctaTitle: { fontFamily: fonts.bold, fontSize: 17, lineHeight: 23, color: colors.ink },
  progress: { height: 12, borderRadius: 6, backgroundColor: colors.track, overflow: 'hidden' },
  progressFill: { height: 12, borderRadius: 6, backgroundColor: colors.violet },
  table: { gap: 8 },
  tableHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  tableTitle: { fontFamily: fonts.extrabold, fontSize: 17, color: colors.ink },
  tableNote: { fontFamily: fonts.medium, fontSize: 13, color: colors.muted },
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
  rowMeters: { fontFamily: fonts.pixelNum, fontSize: 15, color: colors.indigo },
  scrim: { flex: 1, backgroundColor: 'rgba(25,21,46,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.paper, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: 20, paddingBottom: 32, gap: 12, ...hardShadow(4) },
  sheetTitle: { fontFamily: fonts.extrabold, fontSize: 22, color: colors.ink },
  looks: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
});
