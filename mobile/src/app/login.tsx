import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, type TextInputInstance, View } from 'react-native';
import { errorText } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { Button } from '@/components/Button';
import { Enter, Motion, Sprite } from '@/components/pixel';
import { BackButton, Card, ErrorText, Screen, TextField } from '@/components/ui';
import { colors, fonts, radius } from '@/constants/theme';
import { type } from '@/constants/type';
import { S } from '@/i18n/strings';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const passwordRef = useRef<TextInputInstance>(null);
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
          <TextField
            label={S.auth.username}
            value={username}
            onChangeText={setUsername}
            textContentType="username"
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={() => passwordRef.current?.focus()}
          />
          <View style={styles.field}>
            <Text style={styles.label}>{S.auth.password}</Text>
            <View style={styles.passwordRow}>
              <TextInput
                ref={passwordRef}
                accessibilityLabel={S.auth.password}
                placeholderTextColor={colors.mutedIcon}
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                textContentType="password"
                onSubmitEditing={submit}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={showPassword ? S.auth.hidePassword : S.auth.showPassword}
                onPress={() => setShowPassword((shown) => !shown)}
                style={styles.passwordToggle}
              >
                <Text style={styles.link}>{showPassword ? S.auth.hide : S.auth.show}</Text>
              </Pressable>
            </View>
          </View>
          <ErrorText>{error}</ErrorText>
          <Button title={S.auth.login} onPress={submit} loading={busy} />
        </Card>
      </Enter>
      <Pressable accessibilityRole="link" onPress={() => router.replace('/register')} style={styles.linkWrap}>
        <Text style={styles.link}>{S.auth.toRegister}</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingTop: 28 },
  hero: { alignItems: 'center', gap: 8 },
  field: { gap: 6 },
  label: { fontFamily: fonts.bold, fontSize: 13, color: colors.ink, letterSpacing: 0.3 },
  passwordRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: {
    flex: 1,
    minWidth: 0,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: fonts.medium,
    fontSize: 17,
    color: colors.ink,
    minHeight: 54,
  },
  passwordToggle: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  linkWrap: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  link: { fontFamily: fonts.semibold, fontSize: 16, color: colors.indigo },
});
