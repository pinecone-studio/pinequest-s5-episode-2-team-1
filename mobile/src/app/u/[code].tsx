import type { FriendActionResponse, FriendBody, FriendStatus, ProfileResponse } from '@shared/types';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { api, ApiError, errorText } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { Button } from '@/components/Button';
import { Pop, Sprite } from '@/components/pixel';
import { ProfileView } from '@/components/ProfileView';
import { BackButton, Card, ErrorText, Muted, Screen } from '@/components/ui';
import { colors, fonts, radius } from '@/constants/theme';
import { type } from '@/constants/type';
import { errorMessages, S } from '@/i18n/strings';
import { confirm } from '@/lib/confirm';
import { goBack } from '@/lib/nav';
import { formatProfileCode } from '@/lib/profile';

/** Хүсэлт илгээсний дараа найз нь зөвшөөрөхийг (QR-аа үзүүлсэн утсан дээрээ) хүлээж ингэж шалгана. */
const POLL_MS = 3_000;

/** Найзын профайл: QR уншуулсан, кодыг бичсэн эсвэл хуваалцсан холбоос (/u/<код>). Эндээс найз болох хүсэлт илгээнэ. */
export default function FriendProfileScreen() {
  const { code: raw } = useLocalSearchParams<{ code: string }>();
  const code = String(raw ?? '').replace(/\D/g, '');
  const { refreshMe } = useAuth();
  const [data, setData] = useState<ProfileResponse | null>(null);
  const [error, setError] = useState<{ text: string; notFound: boolean } | null>(null);
  const [actionError, setActionError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  // Энэ дэлгэц дээр байхад найз болсон бол баяр хүргэнэ
  const [became, setBecame] = useState(false);

  const shown = useRef<FriendStatus | null>(null);
  useEffect(() => {
    shown.current = data?.friend ?? null;
  }, [data]);
  const setFriend = useCallback((friend: FriendStatus) => {
    if (shown.current !== null && shown.current !== 'friends' && friend === 'friends') {
      setBecame(true);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setData((d) => (d ? { ...d, friend } : d));
  }, []);

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

  const waiting = data?.friend === 'outgoing';
  useEffect(() => {
    if (!waiting) return;
    const timer = setInterval(() => {
      api<ProfileResponse>(`/profiles/${code}`)
        .then((r) => setFriend(r.friend))
        .catch(() => {});
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [waiting, code, setFriend]);

  async function act(fn: () => Promise<FriendActionResponse>) {
    setBusy(true);
    setActionError('');
    try {
      setFriend((await fn()).friend);
      void refreshMe();
    } catch (e) {
      setActionError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  const request = () => act(() => api<FriendActionResponse>('/friends', { body: { code } satisfies FriendBody }));
  const remove = () => act(() => api<FriendActionResponse>(`/friends/${code}`, { method: 'DELETE' }));
  const unfriend = async () => {
    if (data && (await confirm(S.friends.removeConfirm(data.profile.name ?? data.profile.username), S.friends.removeYes))) await remove();
  };

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
          ) : (
            <Card style={[styles.friendCard, data.friend === 'friends' && { backgroundColor: colors.lime }]}>
              {data.friend === 'none' ? <Button title={S.friends.request} loading={busy} onPress={request} /> : null}
              {data.friend === 'outgoing' ? (
                <>
                  <View style={styles.waitRow}>
                    <ActivityIndicator color={colors.violet} />
                    <Text style={styles.status}>{S.friends.sent}</Text>
                  </View>
                  <Button title={S.friends.cancel} variant="secondary" small loading={busy} onPress={remove} />
                </>
              ) : null}
              {data.friend === 'incoming' ? (
                <>
                  <Text style={styles.status}>{S.friends.incoming}</Text>
                  <View style={styles.row}>
                    <Button title={S.friends.accept} loading={busy} onPress={request} style={{ flex: 1 }} />
                    <Button title={S.friends.decline} variant="white" disabled={busy} onPress={remove} />
                  </View>
                </>
              ) : null}
              {data.friend === 'friends' ? (
                <>
                  <Pop trigger={became} from={0.7}>
                    <View style={styles.friendsRow}>
                      <Sprite id="head_happy_52x34" />
                      <Text style={styles.friendsText}>{became ? S.friends.became : S.friends.isFriend}</Text>
                    </View>
                  </Pop>
                  <Button title={S.friends.remove} variant="ghost" small disabled={busy} onPress={unfriend} />
                </>
              ) : null}
              <ErrorText>{actionError}</ErrorText>
            </Card>
          )}
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
  friendCard: { gap: 10 },
  waitRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  status: { flex: 1, fontFamily: fonts.semibold, fontSize: 15, lineHeight: 21, color: colors.ink },
  row: { flexDirection: 'row', gap: 10 },
  friendsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  friendsText: { fontFamily: fonts.bold, fontSize: 18, color: colors.ink },
});
