import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from '@/components/Button';
import { colors, fonts, radius } from '@/constants/theme';
import { S } from '@/i18n/strings';

const CODE_LENGTH = 6;

/** Найзаасаа авсан 6 оронтой кодоор орох (бараан "тасалбар"). `onJoin` алдааны текст буцаана. */
export function JoinCodeCard({ busy, loading, onJoin }: { busy: boolean; loading: boolean; onJoin: (code: string) => Promise<string | null> }) {
  const [code, setCode] = useState('');
  // Кодын алдаа тусдаа: лобби-гийн poll нийтлэг алдааг 3 сек тутам арилгадаг.
  const [error, setError] = useState('');

  const submit = async () => {
    if (code.length !== CODE_LENGTH || busy) return;
    setError('');
    const err = await onJoin(code);
    if (err) setError(err);
    else setCode('');
  };

  return (
    <View style={styles.card}>
      <View style={{ gap: 4 }}>
        <Text style={styles.title}>{S.duel.joinTitle}</Text>
        <Text style={styles.hint}>{S.duel.joinHint}</Text>
      </View>
      <View style={styles.row}>
        <TextInput
          value={code}
          onChangeText={(t) => {
            setCode(t.replace(/[^0-9]/g, '').slice(0, CODE_LENGTH));
            setError('');
          }}
          onSubmitEditing={submit}
          keyboardType="number-pad"
          returnKeyType="go"
          maxLength={CODE_LENGTH}
          placeholder="000000"
          placeholderTextColor="rgba(255,255,255,0.35)"
          accessibilityLabel={S.duel.joinTitle}
          style={[styles.input, error ? { borderColor: '#F08AB4' } : null]}
        />
        <Button title={S.duel.joinButton} variant="lemon" small disabled={code.length !== CODE_LENGTH || busy} loading={loading} onPress={submit} />
      </View>
      {error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.indigo, borderRadius: radius.card, padding: 16, gap: 12 },
  title: { fontFamily: fonts.semibold, fontSize: 19, color: colors.white },
  hint: { fontFamily: fonts.medium, fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  input: {
    flex: 1,
    minWidth: 0,
    textAlign: 'center',
    fontFamily: fonts.pixelNum,
    fontSize: 22,
    letterSpacing: 6,
    color: colors.white,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.25)',
    borderStyle: 'dashed',
    borderRadius: radius.md,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  error: { fontFamily: fonts.bold, fontSize: 13, color: '#FFC2DA' },
});
