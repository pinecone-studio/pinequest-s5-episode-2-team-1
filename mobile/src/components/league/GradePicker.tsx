import { LEAGUE } from '@shared/league';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, hardShadow, radius } from '@/constants/theme';
import { L } from '@/i18n/league';

/** Уралдааны гарчиг өөрөө товч: "7-р ангиудын уралдаан ▾" дарвал 6–12-р ангийн жагсаалт доороос гарна, миний анги тэмдэгтэй. */
export function GradePicker({ value, mine, onChange }: { value: number; mine: number | null; onChange: (g: number) => void }) {
  const [open, setOpen] = useState(false);
  const pick = (g: number) => {
    setOpen(false);
    onChange(g);
  };
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={L.gradePick(value)}
        hitSlop={6}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.trigger, pressed && { opacity: 0.7 }]}
      >
        <Text style={styles.title}>{L.standings(value)}</Text>
        <View style={styles.caret}>
          <Text style={styles.caretText}>▾</Text>
        </View>
      </Pressable>

      <Modal transparent visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.scrim} onPress={() => setOpen(false)} accessibilityLabel={L.close}>
          <Pressable style={styles.sheet} accessibilityViewIsModal onPress={() => undefined}>
            <Text accessibilityRole="header" style={styles.sheetTitle}>
              {L.gradeSheet}
            </Text>
            <View accessibilityRole="radiogroup" style={styles.list}>
              {LEAGUE.GRADES.map((g) => {
                const on = g === value;
                return (
                  <Pressable
                    key={g}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: on }}
                    accessibilityLabel={L.gradeA11y(g, g === mine)}
                    onPress={() => pick(g)}
                    style={({ pressed }) => [styles.row, on && styles.rowOn, pressed && { opacity: 0.8 }]}
                  >
                    <Text style={styles.rowText}>{L.gradeRow(g)}</Text>
                    {g === mine ? <Text style={styles.mineTag}>{L.myGrade}</Text> : null}
                    <View style={[styles.radio, on && styles.radioOn]}>{on ? <View style={styles.dot} /> : null}</View>
                  </Pressable>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontFamily: fonts.extrabold, fontSize: 17, color: colors.ink },
  caret: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: colors.ink, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  caretText: { fontFamily: fonts.bold, fontSize: 12, lineHeight: 14, color: colors.ink },
  scrim: { flex: 1, backgroundColor: 'rgba(25,21,46,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.paper, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: 20, paddingBottom: 32, gap: 14, ...hardShadow(4) },
  sheetTitle: { fontFamily: fonts.extrabold, fontSize: 22, color: colors.ink },
  list: { gap: 8 },
  row: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.white,
  },
  rowOn: { borderColor: colors.ink, ...hardShadow(3) },
  rowText: { flex: 1, fontFamily: fonts.bold, fontSize: 16, color: colors.ink },
  mineTag: { fontFamily: fonts.bold, fontSize: 12, color: colors.white, backgroundColor: colors.violet, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2, overflow: 'hidden' },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: colors.mutedIcon, alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: colors.ink, backgroundColor: colors.lemon },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.ink },
});
