import type { BearLook, DuelTeam } from '@shared/types';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Avatar } from '@/components/Avatar';
import { colors, fonts, radius, teamColors } from '@/constants/theme';
import { S } from '@/i18n/strings';

/** Багийн слот: тоглогчийн хөрөг (багийн өнгийн хүрээтэй) эсвэл тасархай хүрээтэй сул суудал. */
export function PlayerSlot({
  team,
  name,
  look,
  me,
  size = 52,
}: {
  team: DuelTeam;
  name?: string;
  look?: BearLook;
  me?: boolean;
  size?: number;
}) {
  const c = teamColors[team];
  if (!name) {
    return (
      <View style={[styles.slot, { width: size + 12 }]} accessible accessibilityLabel={S.duel.emptySlot}>
        <View style={[styles.empty, { width: size, height: size, borderRadius: size / 2, borderColor: c.main }]}>
          <PlusIcon color={c.main} />
        </View>
        <Text style={[styles.name, { color: colors.muted }]}>{S.duel.emptySlot}</Text>
      </View>
    );
  }
  return (
    <View style={[styles.slot, { width: size + 12 }]} accessible accessibilityLabel={me ? `${S.duel.you}: ${name}` : name}>
      <View style={[styles.ring, { borderColor: c.main, borderRadius: (size + 8) / 2 }]}>
        <Avatar size={size} look={look} />
      </View>
      {me ? (
        <View style={[styles.meTag, { backgroundColor: c.main }]}>
          <Text style={styles.meText}>{S.duel.you}</Text>
        </View>
      ) : null}
      <Text style={styles.name} numberOfLines={1}>
        {name}
      </Text>
    </View>
  );
}

export function PlusIcon({ color, size = 18 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 18 18">
      <Path d="M7 2h4v5h5v4h-5v5H7v-5H2V7h5z" fill={color} />
    </Svg>
  );
}

export function CheckIcon({ color, size = 12 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 12 12">
      <Path d="M1 6.5l1.8-1.8L5 6.9 9.2 2.7 11 4.5 5 10.5z" fill={color} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  slot: { alignItems: 'center', gap: 4 },
  ring: { borderWidth: 3, padding: 1 },
  empty: { borderWidth: 2, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white },
  meTag: { position: 'absolute', top: -6, paddingHorizontal: 7, paddingVertical: 1, borderRadius: radius.pill },
  meText: { fontFamily: fonts.bold, fontSize: 10, color: colors.white },
  name: { fontFamily: fonts.bold, fontSize: 12, color: colors.ink, maxWidth: '100%' },
});
