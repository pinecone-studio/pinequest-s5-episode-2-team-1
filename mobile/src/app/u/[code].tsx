import type { ProfileResponse } from '@shared/types';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { api, ApiError, errorText } from '@/api/client';
import { Button } from '@/components/Button';
import { Sprite } from '@/components/pixel';
import { ProfileView } from '@/components/ProfileView';
import { BackButton, ErrorText, Muted, Screen } from '@/components/ui';
import { colors, fonts, radius } from '@/constants/theme';
import { type } from '@/constants/type';
import { errorMessages, S } from '@/i18n/strings';
import { goBack } from '@/lib/nav';
import { formatProfileCode } from '@/lib/profile';

/** Найзын профайл: профайлын кодоор (Миний профайл → «Найзын профайл», эсвэл хуваалцсан холбоос /u/<код>). */
export default function FriendProfileScreen() {
  const { code: raw } = useLocalSearchParams<{ code: string }>();
  const code = String(raw ?? '').replace(/\D/g, '');
  const [data, setData] = useState<ProfileResponse | null>(null);
  const [error, setError] = useState<{ text: string; notFound: boolean } | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    setData(null);
    setError(null);
    api<ProfileResponse>(`/profiles/${code}`)
      .then((r) => alive && setData(r))
      .catch((e) => {
        if (!alive) return;
        const notFound = e instanceof ApiError && (e.code === 'PROFILE_NOT_FOUND' || e.code === 'BAD_REQUEST');
        setError({ text: notFound ? S.profile.notFoundHint : errorText(e), notFound });
      });
    return () => {
      alive = false;
    };
  }, [code, attempt]);

  return (
    <Screen>
      <View style={styles.header}>
        <BackButton onPress={() => goBack('/profile')} />
        <View style={{ flex: 1, gap: 4 }}>
          <Text accessibilityRole="header" style={type.h1}>
            {S.profile.friendTitle}
          </Text>
          {code.length > 0 ? <Text style={type.small}>{formatProfileCode(code)}</Text> : null}
        </View>
      </View>

      {data ? (
        <>
          {data.isMe ? (
            <View style={styles.meChip}>
              <Text style={styles.meText}>{S.profile.isMe}</Text>
            </View>
          ) : null}
          <ProfileView profile={data.profile} />
        </>
      ) : error ? (
        <View style={styles.center}>
          <Sprite id="bear_tired_scarf_164x280" label="Ядарсан баавгай" />
          {error.notFound ? <Text style={[type.h3, { textAlign: 'center' }]}>{errorMessages.PROFILE_NOT_FOUND}</Text> : null}
          {error.notFound ? <Muted center>{error.text}</Muted> : <ErrorText>{error.text}</ErrorText>}
          {error.notFound ? null : <Button title={S.common.retry} small onPress={() => setAttempt((n) => n + 1)} />}
        </View>
      ) : (
        <View style={styles.center}>
          <ActivityIndicator color={colors.violet} />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  center: { paddingVertical: 24, alignItems: 'center', gap: 12 },
  meChip: { alignSelf: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: colors.lavender },
  meText: { fontFamily: fonts.bold, fontSize: 13, color: colors.indigo },
});
