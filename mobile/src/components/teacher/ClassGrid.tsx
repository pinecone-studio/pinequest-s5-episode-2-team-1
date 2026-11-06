import { clanTitle } from '@shared/clan';
import type { TeacherClassDto } from '@shared/teacher';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, hardShadow, radius } from '@/constants/theme';
import { T } from '@/i18n/teacher';

/** Багшийн ангиуд (2 баганаар): тэмцээн явж буй анги шар. `onAdd` өгвөл төгсгөлд тасархай "+ Шинэ анги". */
export function ClassGrid({ classes, onAdd }: { classes: TeacherClassDto[]; onAdd?: () => void }) {
  return (
    <View style={styles.grid}>
      {classes.map((c) => (
        <Pressable
          key={c.code}
          accessibilityRole="button"
          accessibilityLabel={`${clanTitle(c.name)}, ${T.students(c.students, c.maxStudents)}${c.liveQuizId ? `, ${T.live}` : ''}`}
          onPress={() => router.push(`/teacher/${c.code}`)}
          style={({ pressed }) => [styles.tile, c.liveQuizId ? styles.tileLive : null, pressed && styles.pressed]}
        >
          <View style={styles.top}>
            <Text style={styles.name} numberOfLines={1}>
              {clanTitle(c.name)}
            </Text>
            <Text style={styles.chevron}>›</Text>
          </View>
          <Text style={styles.meta}>{T.students(c.students, c.maxStudents)}</Text>
          {c.liveQuizId ? <Text style={styles.livePill}>{`● ${T.liveShort}`}</Text> : null}
        </Pressable>
      ))}
      {onAdd ? (
        <Pressable accessibilityRole="button" onPress={onAdd} style={({ pressed }) => [styles.tile, styles.addTile, pressed && styles.pressed]}>
          <Text style={styles.addText}>{T.addClass}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile: {
    flexGrow: 1,
    flexBasis: '45%',
    minHeight: 104,
    gap: 4,
    padding: 16,
    borderRadius: radius.card,
    borderWidth: 2,
    borderColor: colors.ink,
    backgroundColor: colors.lavender,
    ...hardShadow(4),
  },
  tileLive: { backgroundColor: colors.lemon },
  pressed: { transform: [{ translateY: 2 }] },
  top: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { flex: 1, fontFamily: fonts.extrabold, fontSize: 20, color: colors.ink },
  chevron: { fontFamily: fonts.bold, fontSize: 24, lineHeight: 26, color: colors.ink },
  meta: { fontFamily: fonts.semibold, fontSize: 14, color: colors.muted },
  livePill: {
    alignSelf: 'flex-start',
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: colors.violet,
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.white,
  },
  addTile: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.paper,
    borderStyle: 'dashed',
    borderColor: colors.mutedIcon,
    shadowOpacity: 0,
    elevation: 0,
  },
  addText: { fontFamily: fonts.bold, fontSize: 16, color: colors.indigo },
});
