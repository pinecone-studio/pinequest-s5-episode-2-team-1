import { clanTitle } from '@shared/clan';
import type { TeacherClassesResponse } from '@shared/teacher';
import type { Subject } from '@shared/types';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { api, errorText } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { PixelText } from '@/components/pinecones';
import { ClassGrid } from '@/components/teacher/ClassGrid';
import { LiveCard } from '@/components/teacher/ClassStats';
import { SubjectStep } from '@/components/teacher/SubjectStep';
import { Card, ErrorText, Muted, Screen, SectionTitle, TextField } from '@/components/ui';
import { colors, fonts, hardShadow, radius } from '@/constants/theme';
import { T } from '@/i18n/teacher';
import { confirm } from '@/lib/confirm';

/** Багшийн нүүр: (хичээлгүй бол эхлээд хичээл сонгоно) товч мэдээлэл, явж буй тэмцээн, ангиууд, шинэ анги, гарах. */
export default function TeacherHome() {
  const { me, signOut } = useAuth();
  const [data, setData] = useState<TeacherClassesResponse | null>(null);
  const [adding, setAdding] = useState(false);
  const [picking, setPicking] = useState(false);
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
      setAdding(false);
      setError('');
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  async function pickSubject(subject: Subject) {
    setBusy(true);
    try {
      setData(await api<TeacherClassesResponse>('/teacher/subject', { method: 'PUT', body: { subject } }));
      setPicking(false);
      setError('');
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  if (data && (!data.subject || picking)) {
    return (
      <Screen contentStyle={styles.content}>
        <SubjectStep initial={data.subject} busy={busy} error={error} onPick={pickSubject} onCancel={data.subject ? () => setPicking(false) : undefined} />
      </Screen>
    );
  }

  const classes = data?.classes ?? [];
  const live = classes.find((c) => c.liveQuizId);
  const students = classes.reduce((n, c) => n + c.students, 0);
  // анги байхгүй бол нээх маягт шууд харагдана
  const showForm = adding || (data !== null && classes.length === 0);
  return (
    <Screen contentStyle={styles.content} onRefresh={() => void load()}>
      <View style={styles.hero}>
        <Avatar size={64} border={2} look={me?.look} />
        <View style={styles.heroTexts}>
          <View accessibilityRole="header">
            <PixelText text={T.title} px={3} color={colors.lemon} shadow={colors.ink} />
          </View>
          <Text style={styles.hello}>{T.hello(me?.name ?? me?.username ?? '')}</Text>
          {data?.subject ? <Text style={styles.summary}>{`${T.teacherOf[data.subject]} · ${T.summary(classes.length, students)}`}</Text> : null}
        </View>
      </View>
      {live?.liveQuizId ? <LiveCard quizId={live.liveQuizId} title={clanTitle(live.name)} /> : null}

      <SectionTitle>{T.classes}</SectionTitle>
      {!data ? (
        error ? (
          <ErrorText>{error}</ErrorText>
        ) : (
          <ActivityIndicator color={colors.violet} />
        )
      ) : classes.length === 0 ? (
        <Muted>{T.noClasses}</Muted>
      ) : (
        <ClassGrid classes={classes} onAdd={showForm ? undefined : () => setAdding(true)} />
      )}

      {showForm ? (
        <Card style={styles.create}>
          <SectionTitle>{T.newClass}</SectionTitle>
          <TextField
            label={T.classNameLabel}
            hint={T.classNameHint}
            value={name}
            onChangeText={setName}
            maxLength={24}
            onSubmitEditing={create}
            autoFocus={adding}
          />
          {data && error ? <ErrorText>{error}</ErrorText> : null}
          <Button title={T.create} variant="lemon" onPress={create} loading={busy} disabled={!name.trim()} />
          {adding && classes.length > 0 ? <Button title={T.cancel} variant="ghost" small onPress={() => setAdding(false)} /> : null}
        </Card>
      ) : null}

      <View style={styles.foot}>
        <Button title={T.subjectChange} variant="ghost" small onPress={() => setPicking(true)} />
        <Button title={T.logout} variant="ghost" small onPress={async () => (await confirm(T.logoutConfirm, T.logout)) && signOut()} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: 14, paddingTop: 16 },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: radius.card,
    borderWidth: 2,
    borderColor: colors.ink,
    backgroundColor: colors.indigo,
    ...hardShadow(4),
  },
  heroTexts: { flex: 1, gap: 4 },
  hello: { fontFamily: fonts.bold, fontSize: 17, color: colors.white },
  summary: { fontFamily: fonts.medium, fontSize: 14, color: colors.lavender },
  create: { gap: 12 },
  foot: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 8 },
});
