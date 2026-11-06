import type { StudentStatDto } from '@shared/teacher';
import { StyleSheet, Text, View } from 'react-native';
import { Avatar } from '@/components/Avatar';
import { Sprite } from '@/components/pixel';
import { Card, Muted, SectionTitle } from '@/components/ui';
import { colors, fonts, radius } from '@/constants/theme';
import { T } from '@/i18n/teacher';

const MEDAL = [colors.lemon, '#D9D6CC', '#E8B98A'];

/** Ангийн дарааллын эрэмбэ: өдөр алгасалгүй даалгавар хийсэн өдрийн тоогоор (тэнцвэл нэрээр). */
export function StreakBoard({ students }: { students: StudentStatDto[] }) {
  const ranked = students.filter((s) => s.streak > 0).sort((a, b) => b.streak - a.streak || a.name.localeCompare(b.name));
  return (
    <Card style={styles.card}>
      <View style={styles.title}>
        <SectionTitle>{T.streakTitle}</SectionTitle>
        <Muted>{T.streakSub}</Muted>
      </View>
      {ranked.length === 0 ? <Muted>{T.streakEmpty}</Muted> : null}
      {ranked.map((s, i) => (
        <View key={s.code} style={styles.row} accessible accessibilityLabel={`${i + 1}. ${s.name}, ${T.streakDays(s.streak)}`}>
          <Text style={[styles.rank, { backgroundColor: MEDAL[i] ?? colors.paper }]}>{i + 1}</Text>
          <Avatar size={36} border={2} look={s.look} />
          <Text style={styles.name} numberOfLines={1}>
            {s.name}
          </Text>
          <View style={styles.streak}>
            <Sprite id="icon_flame_24x24" label="" style={styles.flame} />
            <Text style={styles.days}>{s.streak}</Text>
            <Text style={styles.unit}>{T.streakUnit}</Text>
          </View>
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12 },
  title: { gap: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 },
  rank: {
    width: 30,
    height: 30,
    lineHeight: 30,
    overflow: 'hidden',
    borderRadius: radius.pill,
    textAlign: 'center',
    fontFamily: fonts.pixelNum,
    fontSize: 13,
    color: colors.ink,
  },
  name: { flex: 1, fontFamily: fonts.bold, fontSize: 16, color: colors.ink },
  streak: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  flame: { width: 20, height: 20 },
  days: { fontFamily: fonts.pixelNum, fontSize: 16, color: colors.ink },
  unit: { fontFamily: fonts.semibold, fontSize: 13, color: colors.muted },
});
