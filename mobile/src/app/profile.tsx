import type { MyProfileResponse } from '@shared/types';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { api, errorText } from '@/api/client';
import { Button } from '@/components/Button';
import { Enter } from '@/components/pixel';
import { ProfileView } from '@/components/ProfileView';
import { BackButton, Card, ErrorText, Muted, Screen, SectionTitle } from '@/components/ui';
import { colors, fonts, radius } from '@/constants/theme';
import { type } from '@/constants/type';
import { S } from '@/i18n/strings';
import { confirm } from '@/lib/confirm';
import { goBack } from '@/lib/nav';
import { formatProfileCode, PROFILE_CODE_LENGTH, profileLink } from '@/lib/profile';

/** Миний профайл (аватар дээр дарж нээнэ): хуваалцах код, найзын профайлыг кодоор харах, бусдад харагдах байдал. */
export default function ProfileScreen() {
  const [data, setData] = useState<MyProfileResponse | null>(null);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [rotating, setRotating] = useState(false);
  const [codeText, setCodeText] = useState('');

  // Дэлгүүрт хувцас солиод буцаж ирэхэд шинэчлэгдэнэ.
  useFocusEffect(
    useCallback(() => {
      api<MyProfileResponse>('/me/profile')
        .then((r) => {
          setData(r);
          setError('');
        })
        .catch((e) => setError(errorText(e)));
    }, []),
  );

  async function share() {
    if (!data) return;
    const message = S.profile.shareMessage(formatProfileCode(data.code), profileLink(data.code));
    try {
      await Share.share({ message });
    } catch {
      // Web дээр navigator.share байхгүй байж болно: мессежийг хуулна (болохгүй бол код дэлгэц дээр харагдсаар байна).
      const clipboard = globalThis.navigator?.clipboard;
      if (!clipboard) return;
      try {
        await clipboard.writeText(message);
        setNote(S.profile.copied);
      } catch {
        // хуулж чадсангүй
      }
    }
  }

  async function rotate() {
    if (!(await confirm(S.profile.rotateConfirm, S.profile.rotateYes))) return;
    setRotating(true);
    setNote('');
    try {
      setData(await api<MyProfileResponse>('/me/profile/code', { method: 'POST' }));
      setNote(S.profile.rotated);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setRotating(false);
    }
  }

  const find = () => {
    if (codeText.length !== PROFILE_CODE_LENGTH) return;
    router.push(`/u/${codeText}`);
    setCodeText('');
  };

  return (
    <Screen>
      <View style={styles.header}>
        <BackButton onPress={() => goBack()} />
        <View style={{ flex: 1, gap: 4 }}>
          <Text accessibilityRole="header" style={type.h1}>
            {S.profile.title}
          </Text>
          <Text style={type.small}>{S.profile.subtitle}</Text>
        </View>
      </View>

      {!data ? (
        <View style={styles.center}>
          {error ? <ErrorText>{error}</ErrorText> : <ActivityIndicator color={colors.violet} />}
        </View>
      ) : (
        <>
          <Enter index={0}>
            <Card style={styles.codeCard}>
              <Text style={styles.label}>{S.profile.codeLabel}</Text>
              <Text selectable accessibilityLabel={`${S.profile.codeLabel}: ${data.code.split('').join(' ')}`} style={styles.code}>
                {formatProfileCode(data.code)}
              </Text>
              <Muted center>{S.profile.codeHint}</Muted>
              <View style={styles.actions}>
                <Button title={S.profile.share} variant="lemon" small onPress={share} style={{ flex: 1 }} />
                <Button title={S.profile.rotate} variant="white" small loading={rotating} onPress={rotate} />
              </View>
              {note ? <Text style={styles.note}>{note}</Text> : null}
              <ErrorText>{error}</ErrorText>
            </Card>
          </Enter>

          <Enter index={1}>
            <Card>
              <Text style={styles.cardTitle}>{S.profile.findTitle}</Text>
              <Muted>{S.profile.findHint}</Muted>
              <View style={styles.findRow}>
                <TextInput
                  value={codeText}
                  // maxLength тавихгүй: хуваалцсан "4821 9137" (зайтай, 9 тэмдэгт)-ийг буулгахад сүүлийн орон тасрахгүй
                  onChangeText={(t) => setCodeText(t.replace(/\D/g, '').slice(0, PROFILE_CODE_LENGTH))}
                  onSubmitEditing={find}
                  keyboardType="number-pad"
                  returnKeyType="go"
                  placeholder="0000 0000"
                  placeholderTextColor={colors.mutedIcon}
                  accessibilityLabel={S.profile.findHint}
                  style={styles.input}
                />
                <Button title={S.profile.findButton} small disabled={codeText.length !== PROFILE_CODE_LENGTH} onPress={find} />
              </View>
            </Card>
          </Enter>

          <SectionTitle>{S.profile.preview}</SectionTitle>
          <ProfileView profile={data.profile} index={2} />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  center: { paddingVertical: 40, alignItems: 'center' },
  codeCard: { alignItems: 'center', backgroundColor: colors.lemon },
  label: { fontFamily: fonts.bold, fontSize: 12, letterSpacing: 0.8, textTransform: 'uppercase', color: colors.ink },
  code: { fontFamily: fonts.pixel, fontSize: 40, lineHeight: 46, letterSpacing: 2, color: colors.ink },
  actions: { flexDirection: 'row', alignSelf: 'stretch', gap: 10 },
  note: { fontFamily: fonts.semibold, fontSize: 13, color: colors.okText, textAlign: 'center' },
  cardTitle: { fontFamily: fonts.semibold, fontSize: 18, color: colors.ink },
  findRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  input: {
    flex: 1,
    // web дээр TextInput өөрийн өргөнтэй тул minWidth-гүй бол товч картаас гарна
    minWidth: 0,
    minHeight: 48,
    paddingHorizontal: 16,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.white,
    fontFamily: fonts.pixel,
    fontSize: 20,
    letterSpacing: 2,
    color: colors.ink,
  },
});
