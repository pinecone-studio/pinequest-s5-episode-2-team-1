import type { Subject } from '@shared/types';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { PixelText } from '@/components/pinecones';
import { ErrorText, Muted } from '@/components/ui';
import { ACTIVE_SUBJECTS } from '@/constants/subjects';
import { colors, fonts, hardShadow, radius, subjectTheme } from '@/constants/theme';
import { T } from '@/i18n/teacher';

/** Багш бүртгүүлсний дараах эхний алхам (мөн "Хичээл солих"): заадаг хичээлээ сонгоно. */
export function SubjectStep({
  initial,
  busy,
  error,
  onPick,
  onCancel,
}: {
  initial: Subject | null;
  busy: boolean;
  error: string;
  onPick: (s: Subject) => void;
  onCancel?: () => void;
}) {
  const [value, setValue] = useState<Subject | null>(initial);
  return (
    <View style={styles.wrap}>
      <View accessibilityRole="header">
        <PixelText text={T.title} px={3} color={colors.ink} shadow={colors.lemon} />
      </View>
      <Text style={styles.title}>{T.subjectTitle}</Text>
      <Muted>{T.subjectHint}</Muted>
      <View accessibilityRole="radiogroup" style={styles.list}>
        {ACTIVE_SUBJECTS.map((s) => {
          const t = subjectTheme[s];
          const active = s === value;
          return (
            <Pressable
              key={s}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              accessibilityLabel={T.teacherOf[s]}
              onPress={() => setValue(s)}
              style={({ pressed }) => [styles.card, { backgroundColor: t.bg }, active && styles.active, pressed && styles.pressed]}
            >
              <Text style={[styles.name, { color: t.fg }]}>{T.teacherOf[s]}</Text>
              <Text style={[styles.glyph, { color: t.fg }]} accessibilityElementsHidden importantForAccessibility="no">
                {t.glyph}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <ErrorText>{error}</ErrorText>
      <Button title={T.subjectNext} variant="lemon" loading={busy} disabled={!value} onPress={() => value && onPick(value)} />
      {onCancel ? <Button title={T.cancel} variant="ghost" small onPress={onCancel} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 14 },
  title: { fontFamily: fonts.extrabold, fontSize: 26, lineHeight: 32, color: colors.ink },
  list: { gap: 12 },
  card: {
    minHeight: 96,
    justifyContent: 'center',
    paddingHorizontal: 18,
    borderRadius: radius.card,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  active: { borderColor: colors.ink, ...hardShadow(4) },
  pressed: { transform: [{ translateY: 2 }] },
  name: { fontFamily: fonts.extrabold, fontSize: 22 },
  glyph: { position: 'absolute', right: 14, bottom: -4, fontFamily: fonts.extrabold, fontSize: 64, opacity: 0.18 },
});
