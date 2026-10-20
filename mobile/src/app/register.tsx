import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { errorText } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { Button } from '@/components/Button';
import { Enter, Sprite } from '@/components/pixel';
import { BackButton, Card, Chip, ErrorText, Muted, Screen, TextField } from '@/components/ui';
import { colors, fonts } from '@/constants/theme';
import { type } from '@/constants/type';
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
      <View style={styles.top}>
        {router.canGoBack() ? <BackButton onPress={() => router.back()} /> : null}
        <View style={styles.progress} accessible accessibilityLabel="Алхам 1/3">
          <View style={[styles.seg, { backgroundColor: colors.violet }]} />
          <View style={[styles.seg, { backgroundColor: colors.dashed }]} />
          <View style={[styles.seg, { backgroundColor: colors.dashed }]} />
        </View>
      </View>
      <Enter index={0} style={styles.bubbleRow}>
        <Sprite id="head_idle_112x96" label="Pixel баавгайн толгой" />
        <View style={styles.bubble}>
          <Text style={styles.bubbleText}>{S.auth.registerTitle}</Text>
        </View>
      </Enter>
      <Enter index={1}>
        <Card>
          <TextField label={S.auth.username} hint={S.auth.usernameHint} value={username} onChangeText={setUsername} maxLength={20} />
          <TextField label={S.auth.password} hint={S.auth.passwordHint} value={password} onChangeText={setPassword} secureTextEntry />
          <View style={{ gap: 8 }}>
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
      </Enter>
      <Pressable accessibilityRole="link" onPress={() => router.replace('/login')} style={styles.linkWrap}>
        <Text style={styles.link}>{S.auth.toLogin}</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingTop: 12 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  progress: { flex: 1, flexDirection: 'row', gap: 6 },
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
  bubbleText: { ...type.h3 },
  label: { fontFamily: fonts.bold, fontSize: 13, color: colors.ink },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tier: { fontFamily: fonts.bold, fontSize: 14, color: colors.violet },
  linkWrap: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  link: { fontFamily: fonts.semibold, fontSize: 16, color: colors.indigo },
});
