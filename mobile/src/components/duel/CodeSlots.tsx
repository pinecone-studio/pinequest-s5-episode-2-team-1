import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, fonts, hardShadow } from '@/constants/theme';
import { D } from '@/i18n/duel';

export const CODE_LENGTH = 6;

/**
 * 6 нүдтэй pixel код (3 + 3). Үл үзэгдэх TextInput бүх нүдийг бүрхэнэ: дарахад keyboard нээгдэж, буулгасан
 * "482 913" ч цифр болж орно (maxLength тавихгүй, сүүлийн орон тасрахгүй).
 */
export function CodeSlots({ value, onChange, onSubmit, error }: { value: string; onChange: (v: string) => void; onSubmit: () => void; error: boolean }) {
  const [focused, setFocused] = useState(false);
  const cursor = Math.min(value.length, CODE_LENGTH - 1);
  return (
    <View style={styles.wrap}>
      <View style={styles.row} pointerEvents="none">
        {Array.from({ length: CODE_LENGTH }, (_, i) => {
          const ch = value[i];
          return (
            <View
              key={i}
              style={[
                styles.slot,
                i === 2 && styles.gap,
                ch ? styles.filled : null,
                focused && i === cursor ? styles.active : null,
                error ? styles.bad : null,
              ]}
            >
              <Text style={styles.digit}>{ch ?? ''}</Text>
            </View>
          );
        })}
      </View>
      <TextInput
        value={value}
        onChangeText={(t) => onChange(t.replace(/\D/g, '').slice(0, CODE_LENGTH))}
        onSubmitEditing={onSubmit}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        keyboardType="number-pad"
        returnKeyType="go"
        textContentType="oneTimeCode"
        autoFocus
        caretHidden
        accessibilityLabel={D.codeA11y}
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: 'stretch' },
  row: { flexDirection: 'row', justifyContent: 'center', gap: 7 },
  slot: {
    flex: 1,
    maxWidth: 48,
    aspectRatio: 0.82,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gap: { marginRight: 10 },
  // бөглөсөн нүд товойж гарна
  filled: { borderColor: colors.ink, backgroundColor: colors.white, ...hardShadow(2) },
  active: { borderWidth: 3, borderColor: colors.violet, backgroundColor: colors.white },
  bad: { borderColor: colors.dangerText },
  digit: { fontFamily: fonts.pixelNum, fontSize: 24, color: colors.ink },
  // ≥16px: iPhone Safari focus хийхэд хуудсыг томруулахгүй
  input: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, opacity: 0.02, color: 'transparent', fontSize: 16 },
});
