import type { Subject } from '@shared/types';
import { StyleSheet, Text, View } from 'react-native';
import { PressScale } from '@/components/pixel';
import { DUEL_SUBJECTS } from '@/constants/subjects';
import { colors, fonts, hardShadow, radius, subjectTheme } from '@/constants/theme';
import { S, subjectNames } from '@/i18n/strings';

/** Хичээлийн жагсаалт: мөр бүр хичээлийн өнгөт тэмдэг, нэр, баруун талдаа сонголтын дугуй. */
export function SubjectPicker({ value, onChange }: { value: Subject; onChange: (s: Subject) => void }) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={S.duel.subject} style={styles.list}>
      {DUEL_SUBJECTS.map((s) => {
        const t = subjectTheme[s];
        const on = s === value;
        return (
          <PressScale
            key={s}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            accessibilityLabel={subjectNames[s]}
            onPress={() => onChange(s)}
            scaleTo={0.98}
            style={[styles.row, on && styles.on]}
          >
            <View style={[styles.glyphBox, { backgroundColor: t.bg }]}>
              <Text style={[styles.glyph, { color: t.fg }]} numberOfLines={1}>
                {t.glyph}
              </Text>
            </View>
            <Text style={styles.name} numberOfLines={1}>
              {subjectNames[s]}
            </Text>
            <View style={[styles.radio, on && styles.radioOn]}>{on ? <View style={styles.dot} /> : null}</View>
          </PressScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 8 },
  row: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 8,
    paddingRight: 14,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.white,
  },
  on: { borderColor: colors.ink, ...hardShadow(3) },
  glyphBox: { width: 46, height: 46, borderRadius: 12, borderWidth: 2, borderColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  glyph: { fontFamily: fonts.extrabold, fontSize: 20 },
  name: { flex: 1, fontFamily: fonts.bold, fontSize: 16, color: colors.ink },
  radio: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: colors.mutedIcon, alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: colors.ink, backgroundColor: colors.lemon },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.ink },
});
