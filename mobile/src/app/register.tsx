import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import type { TextInputInstance } from 'react-native';
import { errorText } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { AuthField, type AuthMood, AuthShell, passwordOk, usernameOk } from '@/components/AuthShell';
import { Button } from '@/components/Button';
import { FlowTop } from '@/components/onboarding/FlowTop';
import { ErrorText, Muted } from '@/components/ui';
import { S } from '@/i18n/strings';
import { T } from '@/i18n/teacher';

export default function RegisterScreen() {
  const { signUp } = useAuth();
  // /register?role=teacher: нэвтрэх дэлгэцийн "Би багш"-аас
  const teacher = useLocalSearchParams<{ role?: string }>().role === 'teacher';
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fails, setFails] = useState(0);
  const [typingPassword, setTypingPassword] = useState(false);
  const passwordRef = useRef<TextInputInstance>(null);
  const ready = usernameOk(username) && passwordOk(password);
  const mood: AuthMood = error ? 'oops' : typingPassword ? 'peek' : ready ? 'yay' : 'idle';

  async function submit() {
    if (!ready) {
      setError(S.auth.fillAll);
      setFails((n) => n + 1);
      return;
    }
    setBusy(true);
    setError('');
    try {
      await signUp(username, password, teacher);
    } catch (e) {
      setError(errorText(e));
      setFails((n) => n + 1);
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title={teacher ? T.registerTitle : S.auth.registerTitle}
      top={teacher ? null : <FlowTop step={1} onBack={router.canGoBack() ? () => router.back() : undefined} />}
      sub={teacher ? T.registerSub : S.auth.registerSub}
      hello={teacher ? T.registerHello : S.auth.registerHello}
      mood={mood}
      shake={fails}
      busy={busy}
      link={S.auth.toLogin}
      onLink={() => router.replace('/login')}
    >
      <AuthField
        label={S.auth.username}
        hint={S.auth.usernameHint}
        valid={username ? usernameOk(username) : null}
        value={username}
        onChangeText={(v) => {
          setUsername(v);
          setError('');
        }}
        maxLength={20}
        textContentType="username"
        autoComplete="username"
        returnKeyType="next"
        blurOnSubmit={false}
        onSubmitEditing={() => passwordRef.current?.focus()}
      />
      <AuthField
        label={S.auth.password}
        hint={S.auth.passwordHint}
        valid={password ? passwordOk(password) : null}
        value={password}
        onChangeText={(v) => {
          setPassword(v);
          setError('');
        }}
        onFocus={() => setTypingPassword(true)}
        onBlur={() => setTypingPassword(false)}
        secureTextEntry
        inputRef={passwordRef}
        textContentType="newPassword"
        autoComplete="new-password"
        returnKeyType="go"
        onSubmitEditing={submit}
      />
      <ErrorText>{error}</ErrorText>
      <Button title={S.auth.register} onPress={submit} loading={busy} disabled={!ready} />
      <Muted center>{S.auth.privacy}</Muted>
    </AuthShell>
  );
}
