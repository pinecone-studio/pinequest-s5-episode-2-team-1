import type { TaskResult } from '@shared/types';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { Button } from '@/components/Button';
import { CountUp, Enter, Motion, Pop, Rising, Sprite } from '@/components/pixel';
import { colors, fonts, radius } from '@/constants/theme';
import { S } from '@/i18n/strings';
import type { SpriteKey } from '@/sprites';
import { goBack } from '@/lib/nav';

const TILE = '#33208F';
const SOFT = '#CFC6FF';

/** 06 · Хичээл дууслаа / шагнал. Бүх тоо серверийн TaskResult-аас. `onRecovery` = нөхөх салаа зам нээгдсэн (дараагийн алхам). */
export function RewardView({ result, onAgain, onRecovery }: { result: TaskResult; onAgain: () => void; onRecovery?: () => void }) {
  const insets = useSafeAreaInsets();
  const leveledUp = result.levelAfter > result.levelBefore;
  const happy = result.correctCount >= 2;

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 4, paddingBottom: insets.bottom + 24, paddingHorizontal: 20, gap: 14 }}
        showsVerticalScrollIndicator={false}
      >
        <Pressable accessibilityRole="button" accessibilityLabel={S.common.close} onPress={() => goBack()} style={styles.close}>
          <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={colors.white} strokeWidth={2.6} strokeLinecap="round">
            <Path d="M6 6l12 12M18 6 6 18" />
          </Svg>
        </Pressable>

        <View style={styles.hero} accessible accessibilityLabel={`${result.correctCount}/${result.total} ${S.reward.correctOf}`}>
          <View style={styles.bigRow}>
            <CountUp value={result.correctCount} duration={700} style={styles.big} />
            <Text style={styles.bigOf}>/{result.total}</Text>
          </View>
          <Text style={styles.bigLabel}>{S.reward.correctOf}</Text>
        </View>

        <View style={styles.stage}>
          <View style={styles.circle} />
          {result.me.streakDoneToday ? (
            <Pop trigger="bubble" style={styles.bubble}>
              <Text style={styles.bubbleText}>{S.reward.goalHit}</Text>
            </Pop>
          ) : null}
          <Rising sprite="icon_heart_36x36" left="76%" bottom={190} />
          <Rising sprite="icon_heart_24x24" left="82%" bottom={150} delay={900} />
          <Rising sprite="icon_coin_36x36" left="12%" bottom={90} delay={500} />
          <Rising sprite="icon_star_24x24" left="20%" bottom={160} delay={1500} />
          <View style={styles.bear}>
            <Motion preset="float">
              <Sprite
                id={happy ? 'bear_cheer_scarf_180x252' : 'bear_idle_scarf_164x280'}
                label={happy ? 'Баярлан хөвж буй pixel баавгай' : 'Ороолттой зогсож буй баавгай'}
              />
            </Motion>
          </View>
        </View>

        <View style={styles.tiles}>
          <RewardTile icon="icon_coin_24x24" value={result.pointsGained} prefix="+" label={`${S.reward.coin} · ×${result.multiplier.toFixed(1)}`} index={0} />
          <RewardTile icon="icon_star_24x24" value={result.xpGained} prefix="+" label={S.reward.xp} index={1} />
          <RewardTile icon="icon_flame_24x24" value={result.streak} label={S.reward.daysStreak} index={2} />
        </View>

        {leveledUp || result.shieldUsed ? (
          <Enter index={3} style={styles.lemon}>
            <Motion preset="shake">
              <Sprite id={leveledUp ? 'icon_star_36x36' : 'icon_flame_36x36'} />
            </Motion>
            <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
              <Text style={styles.lemonTitle}>{leveledUp ? S.reward.levelUpTitle : S.reward.shieldNote}</Text>
              {leveledUp ? <Text style={styles.lemonSub}>{S.reward.levelUpSub(result.levelAfter)}</Text> : null}
            </View>
          </Enter>
        ) : null}

        <Enter index={4} style={{ gap: 6, marginTop: 4 }}>
          {onRecovery ? (
            <>
              <Text style={styles.recoveryNote}>{S.reward.recoveryNote}</Text>
              <Button title={S.lesson.toRecovery} variant="lime" onPress={onRecovery} />
            </>
          ) : (
            <>
              <Button title={S.reward.cont} variant="lime" onPress={() => goBack()} />
              <Button title={S.reward.again} variant="white" small onPress={onAgain} />
              {result.correctCount < result.total ? (
                <Button title={S.reward.talk} variant="white" small onPress={() => router.push('/tutor')} />
              ) : null}
            </>
          )}
        </Enter>
      </ScrollView>
    </View>
  );
}

function RewardTile({
  icon,
  value,
  prefix,
  label,
  index,
}: {
  icon: SpriteKey;
  value: number;
  prefix?: string;
  label: string;
  index: number;
}) {
  return (
    <Enter index={index} style={styles.tile}>
      <View style={styles.tileRow}>
        <Sprite id={icon} />
        <CountUp value={value} prefix={prefix} delay={250 + index * 150} style={styles.tileNum} />
      </View>
      <Text style={styles.tileLabel} numberOfLines={1}>
        {label}
      </Text>
    </Enter>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.indigo },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginLeft: -6 },
  hero: { alignItems: 'center' },
  bigRow: { flexDirection: 'row', alignItems: 'flex-end' },
  big: { fontFamily: fonts.bold, fontSize: 150, lineHeight: 150, letterSpacing: -6, color: colors.white },
  bigOf: { fontFamily: fonts.bold, fontSize: 44, lineHeight: 64, color: SOFT, marginLeft: 6 },
  bigLabel: { fontFamily: fonts.medium, fontSize: 20, color: SOFT },
  recoveryNote: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 21, color: colors.white, textAlign: 'center' },
  stage: { height: 290, alignItems: 'center', justifyContent: 'flex-end' },
  circle: { position: 'absolute', top: 30, width: 250, height: 250, borderRadius: 125, backgroundColor: '#34209A' },
  bubble: {
    position: 'absolute',
    left: 4,
    top: 0,
    maxWidth: 150,
    paddingVertical: 11,
    paddingHorizontal: 14,
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
    borderBottomLeftRadius: 4,
    zIndex: 2,
  },
  bubbleText: { fontFamily: fonts.bold, fontSize: 14, lineHeight: 18, color: colors.ink },
  bear: { marginBottom: 6 },
  tiles: { flexDirection: 'row', gap: 10 },
  tile: { flex: 1, height: 80, borderRadius: 22, backgroundColor: TILE, alignItems: 'center', justifyContent: 'center', gap: 4 },
  tileRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tileNum: { fontFamily: fonts.pixel, fontSize: 22, color: colors.white },
  tileLabel: { fontFamily: fonts.semibold, fontSize: 12, color: SOFT },
  lemon: {
    minHeight: 78,
    paddingLeft: 14,
    paddingRight: 12,
    borderRadius: radius.card,
    backgroundColor: colors.lemon,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  lemonTitle: { fontFamily: fonts.bold, fontSize: 16, color: colors.ink },
  lemonSub: { fontFamily: fonts.medium, fontSize: 13, color: '#4A4636' },
});
