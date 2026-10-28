import { StyleSheet, Text, View } from 'react-native';
import { CountPill } from '@/components/StatPill';
import { arena, colors, fonts, hardShadow, radius } from '@/constants/theme';
import { S } from '@/i18n/strings';
import { ArenaStripes } from './ArenaStripes';

/** Лобби-гийн дээд хэсэг: бараан "arena" баннер ташуу туузтай, гарчиг, боргоцой. */
export function LobbyHero({ honey }: { honey: number }) {
  return (
    <View style={styles.hero}>
      <ArenaStripes intensity={0.9} />
      <View style={styles.top}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>VS</Text>
        </View>
        <CountPill icon="btn_honey_24x24" value={honey} label="Боргоцой" />
      </View>
      <Text accessibilityRole="header" style={styles.title}>
        {S.duel.title}
      </Text>
      <Text style={styles.hint}>{S.duel.hint}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: arena.bg, borderRadius: radius.lg, padding: 18, gap: 6, overflow: 'hidden', minHeight: 150 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  badge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.lemon,
    borderWidth: 2,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-8deg' }],
    ...hardShadow(3),
  },
  badgeText: { fontFamily: fonts.pixel, fontSize: 18, color: colors.ink },
  title: { fontFamily: fonts.extrabold, fontSize: 34, lineHeight: 38, letterSpacing: -1, color: colors.white, marginTop: 6 },
  hint: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 19, color: 'rgba(255,255,255,0.85)', maxWidth: 300 },
});
