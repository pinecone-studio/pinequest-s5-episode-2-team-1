import type { Subject } from '@shared/types';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { Sprite } from '@/components/pixel';
import { Screen } from '@/components/ui';
import { colors, fonts, subjectTheme } from '@/constants/theme';
import { S, subjectGlyphs, subjectNames } from '@/i18n/strings';
import { usePixelBear } from '@/lib/mock/pixelBear';

const SUBJECTS: Subject[] = ['math', 'mongolian', 'physics'];
const SUGGESTED: Subject = 'math';

/** 02 · Хичээл сонгох (onboarding). Сонголт нь төхөөрөмж дээр хадгалагдаж, Сурах замын анхны хичээл болно. */
export default function OnboardingScreen() {
  const { setSubject } = usePixelBear();
  const [selected, setSelected] = useState<Subject>(SUGGESTED);

  function next() {
    setSubject(selected);
    router.replace('/');
  }

  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.progress} accessible accessibilityLabel={S.onboarding.step}>
        <View style={[styles.seg, { backgroundColor: colors.violet }]} />
        <View style={[styles.seg, { backgroundColor: colors.violet }]} />
        <View style={[styles.seg, { backgroundColor: colors.violet }]} />
      </View>

      <View style={styles.bubbleRow}>
        <Sprite id="head_idle_112x96" label="Pixel баавгайн толгой" />
        <View style={styles.bubble}>
          <Text style={styles.bubbleText}>{S.onboarding.bubble}</Text>
        </View>
      </View>

      <View style={{ gap: 10 }}>
        {SUBJECTS.map((subject) => {
          const t = subjectTheme[subject];
          const active = subject === selected;
          return (
            <Pressable
              key={subject}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              accessibilityLabel={subjectNames[subject]}
              onPress={() => setSelected(subject)}
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

      <View style={{ flex: 1, minHeight: 12 }} />
      <Button title={S.onboarding.continue} onPress={next} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingTop: 20, gap: 18 },
  progress: { flexDirection: 'row', gap: 6 },
  seg: { flex: 1, height: 8, borderRadius: 4 },
  bubbleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  bubble: {
    flex: 1,
    backgroundColor: colors.white,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderBottomRightRadius: 22,
    borderBottomLeftRadius: 6,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 40,
  },
  bubbleText: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 21, color: colors.ink },
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
