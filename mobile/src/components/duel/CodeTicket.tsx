import { StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { arena, colors, fonts, hardShadow, radius } from '@/constants/theme';
import { D } from '@/i18n/duel';
import { S } from '@/i18n/strings';
import { CODE_LENGTH, CodeSlots } from './CodeSlots';

/** Тулааны урилгын "тасалбар": толгойд VS тэмдэг ба тайлбар, хоёр ирмэгтээ цоолсон зураас, доор нь 6 нүдтэй код ба орох товч. */
export function CodeTicket({
  code,
  onChange,
  onSubmit,
  error,
  busy,
}: {
  code: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  error: string;
  busy: boolean;
}) {
  return (
    <View style={styles.ticket}>
      <View style={styles.head}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>VS</Text>
        </View>
        <View style={styles.headText}>
          <Text style={styles.kicker}>{D.ticket}</Text>
          <Text style={styles.hint}>{S.duel.joinHint}</Text>
        </View>
      </View>

      <View style={styles.perf}>
        <View style={styles.notch} />
        <View style={styles.dash} />
        <View style={styles.notch} />
      </View>

      <CodeSlots value={code} onChange={onChange} onSubmit={onSubmit} error={!!error} />
      {error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}
      <Button title={S.duel.joinButton} variant="ink" disabled={code.length !== CODE_LENGTH} loading={busy} onPress={onSubmit} />
    </View>
  );
}

const EDGE = 16 + 3; // padding + хүрээ: цоолтуурын хагас нь тасалбараас гадна гарна

const styles = StyleSheet.create({
  ticket: {
    backgroundColor: colors.white,
    borderRadius: radius.card,
    borderWidth: 3,
    borderColor: colors.ink,
    padding: 16,
    gap: 16,
    ...hardShadow(6),
    shadowColor: colors.violet,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: 14 },
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
  headText: { flex: 1, gap: 2 },
  kicker: { fontFamily: fonts.bold, fontSize: 12, letterSpacing: 0.8, textTransform: 'uppercase', color: colors.violet },
  hint: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 20, color: colors.ink },
  perf: { flexDirection: 'row', alignItems: 'center', marginHorizontal: -(EDGE + 12) },
  notch: { width: 24, height: 24, borderRadius: 12, backgroundColor: arena.bg, borderWidth: 3, borderColor: colors.ink },
  dash: { flex: 1, marginHorizontal: 6, borderTopWidth: 2, borderStyle: 'dashed', borderColor: colors.stone },
  error: { fontFamily: fonts.bold, fontSize: 14, lineHeight: 19, color: colors.dangerText, textAlign: 'center', marginTop: -6 },
});
