import { Link } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { errorText } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { Button } from '@/components/Button';
import { Card, Chip, ErrorText, Muted, Screen, TextField, Title } from '@/components/ui';
import { colors, spacing } from '@/constants/theme';
import { S } from '@/i18n/strings';

const GRADES = [6, 7, 8, 9, 10];
const tierOf = (grade: number) => (grade <= 7 ? 1 : grade <= 9 ? 2 : 3);

export default function RegisterScreen() {
  const { signUp } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [grade, setGrade] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    if (!username.trim() || !password) {
      setError(S.auth.fillAll);
      return;
    }
    if (!grade) {
      setError(S.auth.pickGrade);
      return;
    }
    setBusy(true);
    setError('');
    try {
      await signUp(username, password, grade);
    } catch (e) {
      setError(errorText(e));
      setBusy(false);
    }
  }

  return (
    <Screen contentStyle={styles.content}>
      <Title>{S.auth.registerTitle}</Title>
      <Card>
        <TextField label={S.auth.username} hint={S.auth.usernameHint} value={username} onChangeText={setUsername} maxLength={20} />
        <TextField label={S.auth.password} hint={S.auth.passwordHint} value={password} onChangeText={setPassword} secureTextEntry />
        <View style={{ gap: spacing.sm }}>
          <Text style={styles.label}>{S.auth.grade}</Text>
          <View style={styles.chips}>
            {GRADES.map((g) => (
              <Chip key={g} label={S.auth.gradeChip(g)} selected={grade === g} onPress={() => setGrade(g)} />
            ))}
          </View>
          {grade ? <Text style={styles.tier}>{S.auth.tierHint(tierOf(grade))}</Text> : null}
        </View>
        <ErrorText>{error}</ErrorText>
        <Button title={S.auth.register} onPress={submit} loading={busy} />
        <Muted center>{S.auth.privacy}</Muted>
      </Card>
      <Link href="/login" replace style={styles.link}>
        {S.auth.toLogin}
      </Link>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, justifyContent: 'center' },
  label: { fontSize: 15, fontWeight: '700', color: colors.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tier: { fontSize: 14, color: colors.primaryDark, fontWeight: '700' },
  link: { color: colors.primaryDark, fontSize: 16, fontWeight: '700', textAlign: 'center', padding: spacing.sm },
});
