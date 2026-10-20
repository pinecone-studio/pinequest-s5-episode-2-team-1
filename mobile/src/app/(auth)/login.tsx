import { Link } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { errorText } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { ServerStatus } from '@/components/ServerStatus';
import { Card, ErrorText, Screen, TextField } from '@/components/ui';
import { APP_NAME } from '@/constants/app';
import { colors, spacing } from '@/constants/theme';
import { S } from '@/i18n/strings';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    if (!username.trim() || !password) {
      setError(S.auth.fillAll);
      return;
    }
    setBusy(true);
    setError('');
    try {
      await signIn(username, password);
    } catch (e) {
      setError(errorText(e));
      setBusy(false);
    }
  }

  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.hero}>
        <Avatar look={{}} size={96} />
        <Text style={styles.brand}>{APP_NAME}</Text>
        <Text style={styles.tagline}>{S.auth.tagline}</Text>
      </View>
      <Card>
        <TextField label={S.auth.username} value={username} onChangeText={setUsername} textContentType="username" />
        <TextField
          label={S.auth.password}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          textContentType="password"
          onSubmitEditing={submit}
        />
        <ErrorText>{error}</ErrorText>
        <Button title={S.auth.login} onPress={submit} loading={busy} />
      </Card>
      <Link href="/register" replace style={styles.link}>
        {S.auth.toRegister}
      </Link>
      <ServerStatus />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, justifyContent: 'center' },
  hero: { alignItems: 'center', gap: spacing.sm },
  brand: { fontSize: 36, fontWeight: '900', color: colors.primary },
  tagline: { fontSize: 15, color: colors.muted, textAlign: 'center' },
  link: { color: colors.primaryDark, fontSize: 16, fontWeight: '700', textAlign: 'center', padding: spacing.sm },
});
