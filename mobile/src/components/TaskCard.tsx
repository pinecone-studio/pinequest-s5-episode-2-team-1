import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { PressScale, Sprite } from '@/components/pixel';
import { colors, fonts, radius } from '@/constants/theme';

/** Өнөөдрийн даалгаврын карт (DESIGN.md §7 TaskCard): 150px өндөр, өнгөт блок. */
export function TaskCard({
  label,
  title,
  bg,
  fg,
  reward,
  done,
  hard,
  disabled,
  onPress,
}: {
  label: string;
  title: string;
  bg: string;
  fg: string;
  reward?: number;
  done?: boolean;
  hard?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <PressScale
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${title}${reward ? `, +${reward} coin` : ''}${done ? ', дууссан' : ''}`}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.card, { backgroundColor: done ? colors.lime : bg }, disabled && { opacity: 0.45 }]}
    >
      <View style={styles.top}>
        <Text style={[styles.label, { color: done ? colors.ink : fg }, !hard && { opacity: 0.7 }]} numberOfLines={2}>
          {label}
        </Text>
        {hard ? <Sprite id="icon_mystery_box_28x22" /> : null}
      </View>
      <Text style={[styles.title, { color: done ? colors.ink : fg }, done && styles.strike]} numberOfLines={3}>
        {title}
      </Text>
      {done ? (
        <View style={styles.check} accessible accessibilityLabel="Дууссан">
          <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={colors.lime} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M5 12.5 10 17.5 19 7" />
          </Svg>
        </View>
      ) : reward ? (
        <View style={styles.reward}>
          <Sprite id="icon_coin_12x12" />
          <Text style={styles.rewardNum}>+{reward}</Text>
        </View>
      ) : (
        <View style={{ height: 28 }} />
      )}
    </PressScale>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    height: 150,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: radius.card,
    justifyContent: 'space-between',
  },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { fontFamily: fonts.bold, fontSize: 12, lineHeight: 15, letterSpacing: 0.5, textTransform: 'uppercase', flexShrink: 1 },
  title: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 18 },
  strike: { textDecorationLine: 'line-through' },
  check: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  reward: {
    alignSelf: 'flex-start',
    height: 28,
    paddingLeft: 6,
    paddingRight: 9,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rewardNum: { fontFamily: fonts.pixel, fontSize: 14, color: colors.ink },
});
