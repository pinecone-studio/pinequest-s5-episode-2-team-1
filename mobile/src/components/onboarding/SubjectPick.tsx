import type { Subject } from '@shared/types';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, subjectTheme } from '@/constants/theme';
import { S, subjectGlyphs, subjectNames } from '@/i18n/strings';
import { PATH_SUBJECTS } from '@/lib/pixelBear/path';

export const SUGGESTED: Subject = 'math';

/** Хичээл сонгох өнгөт картууд (02 · Хичээл сонгох): сонгосон нь томорч, хар хүрээтэй. */
export function SubjectPick({ value, onChange }: { value: Subject | null; onChange: (s: Subject) => void }) {
  return (
    <View style={{ gap: 10 }}>
      {PATH_SUBJECTS.map((subject) => {
        const t = subjectTheme[subject];
        const active = subject === value;
        return (
          <Pressable
            key={subject}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            accessibilityLabel={subjectNames[subject]}
            onPress={() => onChange(subject)}
            style={[styles.card, { backgroundColor: t.bg, height: active ? 112 : 88 }, active && styles.cardActive]}
          >
            <View style={styles.cardTop}>
              <Text style={[styles.cardLabel, { color: t.fg }]} numberOfLines={1}>
                {S.onboarding.hint}
              </Text>
              {subject === SUGGESTED ? (
                <Text style={[styles.badge, { backgroundColor: colors.ink, color: t.bg === colors.lemon ? colors.lemon : colors.white }]}>
                  {S.onboarding.suggest}
                </Text>
              ) : null}
            </View>
            <Text style={[styles.cardTitle, { color: t.fg, fontSize: active ? 26 : 24 }]}>{subjectNames[subject]}</Text>
            <Text
              style={[styles.glyph, { color: t.fg, opacity: subject === 'math' ? 0.12 : 0.18, fontSize: subject === 'physics' ? 62 : subject === 'math' ? 92 : 80 }]}
              accessibilityElementsHidden
              importantForAccessibility="no"
            >
              {subjectGlyphs[subject]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 26, paddingVertical: 14, paddingHorizontal: 18, justifyContent: 'space-between', overflow: 'hidden' },
  cardActive: { borderWidth: 3, borderColor: colors.ink, paddingVertical: 13, paddingHorizontal: 15 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardLabel: { flexShrink: 1, fontFamily: fonts.bold, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase' },
  badge: {
    flexShrink: 0,
    fontFamily: fonts.bold,
    fontSize: 11,
    letterSpacing: 0.7,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 999,
    overflow: 'hidden',
  },
  cardTitle: { fontFamily: fonts.semibold, letterSpacing: -0.5 },
  glyph: { position: 'absolute', right: 10, bottom: -6, fontFamily: fonts.extrabold },
});
