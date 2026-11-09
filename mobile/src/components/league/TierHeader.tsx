import { LEAGUE_TIERS, leagueTier } from '@shared/league';
import { StyleSheet, Text, View } from 'react-native';
import { Pop, Sprite } from '@/components/pixel';
import { Card } from '@/components/ui';
import { colors, fonts, radius } from '@/constants/theme';
import { L } from '@/i18n/league';

/**
 * Дэлгэцийн дээд хэсэг (Duolingo лиг шиг): 6 лигийн шат (давсан нь өнгөтэй, одоогийнх том, дараагийнх бүдэг), ямар лигт
 * байгаа, түрүүлбэл аль лиг рүү дэвших. Өнгөрсөн 7 хоногт дэвшсэн бол баяр хүргэнэ.
 */
/** `preview`: ангигүй үед — анги бүр эхний лигээс эхэлнэ гэж харуулна. */
export function TierHeader({ tier, promoted, preview }: { tier: number; promoted: boolean; preview?: boolean }) {
  const current = leagueTier(tier);
  const next = LEAGUE_TIERS.find((t) => t.tier === current.tier + 1);
  return (
    <Card style={styles.card}>
      {promoted ? (
        <Pop trigger={current.tier} style={styles.promoted}>
          <Text style={styles.promotedText} accessibilityLiveRegion="polite">
            {L.promoted(current.name)}
          </Text>
        </Pop>
      ) : null}
      <View style={styles.ladder} accessibilityLabel={L.ladderA11y(current.name, current.tier)}>
        {LEAGUE_TIERS.map((t) =>
          t.tier === current.tier ? (
            <View key={t.key} style={styles.currentRing}>
              <Sprite id={`league_${t.key}_64x64`} />
            </View>
          ) : (
            <Sprite key={t.key} id={`league_${t.key}_32x32`} style={t.tier > current.tier && styles.locked} />
          ),
        )}
      </View>
      <View style={styles.texts}>
        <Text accessibilityRole="header" style={styles.title}>
          {preview ? L.tierStart(current.name) : L.tierName(current.name)}
        </Text>
        <Text style={styles.hint}>{next ? L.tierNext(next.name) : L.tierTop}</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12, alignItems: 'center' },
  promoted: { alignSelf: 'stretch', backgroundColor: colors.lime, borderRadius: radius.sm, paddingHorizontal: 14, paddingVertical: 10 },
  promotedText: { fontFamily: fonts.extrabold, fontSize: 15, lineHeight: 20, color: colors.ink, textAlign: 'center' },
  ladder: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  currentRing: { padding: 4, borderRadius: radius.sm, borderWidth: 3, borderColor: colors.violet, backgroundColor: colors.trackAlt },
  locked: { opacity: 0.3 },
  texts: { alignItems: 'center', gap: 4 },
  title: { fontFamily: fonts.extrabold, fontSize: 20, color: colors.ink },
  hint: { fontFamily: fonts.bold, fontSize: 14, lineHeight: 19, color: colors.indigo, textAlign: 'center' },
});
