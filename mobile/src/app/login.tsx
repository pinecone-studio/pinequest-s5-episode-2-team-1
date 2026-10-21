import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { errorText } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { Button } from '@/components/Button';
import { Enter, Motion, Sprite } from '@/components/pixel';
import { ServerStatus } from '@/components/ServerStatus';
import { BackButton, Card, ErrorText, Screen, TextField } from '@/components/ui';
import { colors, fonts } from '@/constants/theme';
import { type } from '@/constants/type';
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
      {router.canGoBack() ? <BackButton onPress={() => router.back()} /> : null}
      <Enter index={0} style={styles.hero}>
        <Motion preset="bob">
          <Sprite id="head_idle_112x96" label="Pixel баавгайн толгой" />
        </Motion>
        <Text accessibilityRole="header" style={type.h1}>
          {S.auth.loginTitle}
        </Text>
        <Text style={[type.bodyMuted, { textAlign: 'center' }]}>{S.welcome.tagline}</Text>
      </Enter>
      <Enter index={1}>
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
      </Enter>
      <Pressable accessibilityRole="link" onPress={() => router.replace('/register')} style={styles.linkWrap}>
        <Text style={styles.link}>{S.auth.toRegister}</Text>
      </Pressable>
      <View style={{ flex: 1 }} />
      <ServerStatus />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingTop: 12 },
  hero: { alignItems: 'center', gap: 8 },
  linkWrap: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  link: { fontFamily: fonts.semibold, fontSize: 16, color: colors.indigo },
});
