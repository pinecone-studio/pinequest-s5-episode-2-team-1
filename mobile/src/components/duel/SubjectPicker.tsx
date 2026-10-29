import type { Subject } from '@shared/types';
import { StyleSheet, Text, View } from 'react-native';
import { PressScale } from '@/components/pixel';
import { DUEL_SUBJECTS } from '@/constants/subjects';
import { colors, fonts, hardShadow, radius, subjectTheme } from '@/constants/theme';
import { S, subjectNames } from '@/i18n/strings';

/** Хичээлийн том хавтангууд (хичээлийн өнгө, тэмдэгтэй). */
export function SubjectPicker({ value, onChange }: { value: Subject; onChange: (s: Subject) => void }) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={S.duel.subject} style={styles.row}>
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
            style={[styles.tile, { backgroundColor: on ? t.bg : colors.paper }, on && styles.on]}
          >
            <Text style={[styles.glyph, { color: on ? t.fg : colors.mutedIcon }]} numberOfLines={1}>
              {t.glyph}
            </Text>
            <Text style={[styles.name, { color: on ? t.fg : colors.ink }]} numberOfLines={1}>
              {subjectNames[s]}
            </Text>
          </PressScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  tile: { flex: 1, minHeight: 72, borderRadius: radius.sm, padding: 10, justifyContent: 'space-between', borderWidth: 2, borderColor: 'transparent' },
  on: { borderColor: colors.ink, ...hardShadow(3) },
  glyph: { fontFamily: fonts.extrabold, fontSize: 18 },
  name: { fontFamily: fonts.bold, fontSize: 13 },
});
