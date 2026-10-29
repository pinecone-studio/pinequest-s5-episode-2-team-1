import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, type TextInputInstance } from 'react-native';
import { errorText } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { AuthField, type AuthMood, AuthShell } from '@/components/AuthShell';
import { Button } from '@/components/Button';
import { JudgeButton } from '@/components/JudgeButton';
import { BackButton, ErrorText } from '@/components/ui';
import { colors, fonts } from '@/constants/theme';
import { S } from '@/i18n/strings';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [typingPassword, setTypingPassword] = useState(false);
  const passwordRef = useRef<TextInputInstance>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fails, setFails] = useState(0);
  const filled = !!username.trim() && !!password;
  const mood: AuthMood = error ? 'oops' : typingPassword && !showPassword ? 'peek' : filled ? 'yay' : 'idle';

  async function submit() {
    if (!filled) {
      setError(S.auth.fillAll);
      setFails((n) => n + 1);
      return;
    }
    setBusy(true);
    setError('');
    try {
      await signIn(username, password);
    } catch (e) {
      setError(errorText(e));
      setFails((n) => n + 1);
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title={S.auth.loginTitle}
      top={router.canGoBack() ? <BackButton onPress={() => router.back()} /> : null}
      sub={S.auth.loginSub}
      hello={S.auth.loginHello}
      mood={mood}
      shake={fails}
      busy={busy}
      link={S.auth.toRegister}
      onLink={() => router.replace('/register')}
    >
      <AuthField
        label={S.auth.username}
        valid={null}
        value={username}
        onChangeText={(v) => {
          setUsername(v);
          setError('');
        }}
        textContentType="username"
        returnKeyType="next"
        blurOnSubmit={false}
        onSubmitEditing={() => passwordRef.current?.focus()}
      />
      <AuthField
        label={S.auth.password}
        valid={null}
        inputRef={passwordRef}
        value={password}
        onChangeText={(v) => {
          setPassword(v);
          setError('');
        }}
        secureTextEntry={!showPassword}
        textContentType="password"
        onFocus={() => setTypingPassword(true)}
        onBlur={() => setTypingPassword(false)}
        onSubmitEditing={submit}
        right={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={showPassword ? S.auth.hidePassword : S.auth.showPassword}
            onPress={() => setShowPassword((shown) => !shown)}
            hitSlop={8}
            style={styles.toggle}
          >
            <Text style={styles.toggleText}>{showPassword ? S.auth.hide : S.auth.show}</Text>
          </Pressable>
        }
      />
      <ErrorText>{error}</ErrorText>
      <Button title={S.auth.login} onPress={submit} loading={busy} disabled={!filled} />
      <JudgeButton />
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  toggle: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  toggleText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.indigo },
});
