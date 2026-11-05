import { clanTitle } from '@shared/clan';
import type { TeacherClassesResponse } from '@shared/teacher';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { api, errorText } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { Button } from '@/components/Button';
import { PixelText } from '@/components/pinecones';
import { Card, ErrorText, Muted, Screen, SectionTitle, TextField } from '@/components/ui';
import { colors, fonts, hardShadow, radius } from '@/constants/theme';
import { T } from '@/i18n/teacher';
import { confirm } from '@/lib/confirm';

/** Багшийн нүүр: ангиуд, шинэ анги нээх. Багшийн бүртгэлээр нэвтэрвэл сурагчийн tab-уудын оронд энд ирнэ. */
export default function TeacherHome() {
  const { me, signOut } = useAuth();
  const [data, setData] = useState<TeacherClassesResponse | null>(null);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setData(await api<TeacherClassesResponse>('/teacher/classes'));
      setError('');
    } catch (e) {
      setError(errorText(e));
    }
  }, []);
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function create() {
    setBusy(true);
    try {
      setData(await api<TeacherClassesResponse>('/teacher/classes', { body: { name } }));
      setName('');
      setError('');
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen contentStyle={styles.content} onRefresh={() => void load()}>
      <View style={styles.top}>
        <View accessibilityRole="header">
          <PixelText text={T.title} px={4} color={colors.ink} shadow={colors.stone} />
        </View>
        <Button title={T.logout} variant="ghost" small onPress={async () => (await confirm(T.logoutConfirm, T.logout)) && signOut()} />
      </View>
      <Text style={styles.hello}>{T.hello(me?.name ?? me?.username ?? '')}</Text>

      <SectionTitle>{T.classes}</SectionTitle>
      {!data ? (
        error ? <ErrorText>{error}</ErrorText> : <ActivityIndicator color={colors.violet} />
      ) : data.classes.length === 0 ? (
        <Muted>{T.noClasses}</Muted>
      ) : (
        <View style={styles.grid}>
          {data.classes.map((c) => (
            <Pressable
              key={c.code}
              accessibilityRole="button"
              onPress={() => router.push(`/teacher/${c.code}`)}
              style={({ pressed }) => [styles.tile, pressed && { transform: [{ translateY: 2 }] }]}
            >
              <Text style={styles.tileName} numberOfLines={1}>
                {clanTitle(c.name)}
              </Text>
              <Text style={styles.tileMeta}>{T.students(c.students, c.maxStudents)}</Text>
              {c.liveQuizId ? <Text style={styles.live}>{`● ${T.live}`}</Text> : null}
            </Pressable>
          ))}
        </View>
      )}

      <Card style={styles.create}>
        <SectionTitle>{T.newClass}</SectionTitle>
        <TextField label={T.classNameLabel} hint={T.classNameHint} value={name} onChangeText={setName} maxLength={24} onSubmitEditing={create} />
        {data && error ? <ErrorText>{error}</ErrorText> : null}
        <Button title={T.create} variant="lemon" onPress={create} loading={busy} disabled={!name.trim()} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: 14, paddingTop: 16 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  hello: { fontFamily: fonts.medium, fontSize: 16, color: colors.muted },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile: {
    flexGrow: 1,
    flexBasis: '45%',
    minHeight: 104,
    gap: 4,
    padding: 16,
    borderRadius: radius.card,
    borderWidth: 2,
    borderColor: colors.ink,
    backgroundColor: colors.lavender,
    ...hardShadow(4),
  },
  tileName: { fontFamily: fonts.extrabold, fontSize: 20, color: colors.ink },
  tileMeta: { fontFamily: fonts.semibold, fontSize: 14, color: colors.muted },
  live: { fontFamily: fonts.bold, fontSize: 13, color: colors.dangerText },
  create: { gap: 12 },
});
