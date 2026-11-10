import type { FriendBody, FriendsResponse } from '@shared/types';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { api, errorText } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { Button } from '@/components/Button';
import { FriendRow } from '@/components/FriendRow';
import { PixelText } from '@/components/pinecones';
import { sectionTitle } from '@/components/profile/Overview';
import { SegmentedTabs } from '@/components/SegmentedTabs';
import { BackButton, Card, ErrorText, Muted, Screen } from '@/components/ui';
import { colors, fonts } from '@/constants/theme';
import { P } from '@/i18n/profile';
import { S } from '@/i18n/strings';
import { goBack } from '@/lib/nav';

type Tab = 'friends' | 'requests';
const open = (code: string) => router.push(`/u/${code}`);

/** Найзууд (профайлын "Найз"/"Хүсэлт" тоон дээр дарж нээнэ): найзууд, ирсэн ба илгээсэн хүсэлт, найз нэмэх. */
export default function FriendsScreen() {
  const { refreshMe } = useAuth();
  const params = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<Tab>(params.tab === 'requests' ? 'requests' : 'friends');
  const [data, setData] = useState<FriendsResponse | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setData(await api<FriendsResponse>('/friends'));
    } catch (e) {
      setError(errorText(e));
    }
  }, []);
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function act(key: string, fn: () => Promise<unknown>) {
    setBusy(key);
    setError('');
    try {
      await fn();
      await load();
      void refreshMe();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(null);
    }
  }
  const accept = (code: string) => act(`accept-${code}`, () => api('/friends', { body: { code } satisfies FriendBody }));
  const remove = (code: string) => act(`remove-${code}`, () => api(`/friends/${code}`, { method: 'DELETE' }));

  const friends = data?.friends ?? [];
  const incoming = data?.incoming ?? [];
  const outgoing = data?.outgoing ?? [];

  return (
    <Screen>
      <View style={styles.header}>
        <BackButton onPress={() => goBack('/profile')} />
        <View accessibilityRole="header">
          <PixelText text={P.friendsTitle} px={3} color={colors.ink} shadow={colors.stone} />
        </View>
      </View>

      <SegmentedTabs
        label={P.friendsTitle}
        value={tab}
        onChange={setTab}
        options={[
          { value: 'friends', label: P.tabFriends(friends.length) },
          { value: 'requests', label: P.tabRequests(incoming.length) },
        ]}
      />

      {!data ? (
        <ActivityIndicator color={colors.violet} style={{ marginTop: 24 }} />
      ) : tab === 'friends' ? (
        <Card style={styles.list}>
          {friends.length === 0 ? <Muted>{S.friends.empty}</Muted> : null}
          {friends.map((f) => (
            <FriendRow key={f.code} friend={f} onPress={() => open(f.code)} />
          ))}
        </Card>
      ) : (
        <View style={styles.section}>
          <Card style={styles.list}>
            {incoming.length === 0 ? <Muted>{P.noRequests}</Muted> : null}
            {incoming.map((f) => (
              <FriendRow key={f.code} friend={f} onPress={() => open(f.code)}>
                <Button title={S.friends.accept} small loading={busy === `accept-${f.code}`} onPress={() => accept(f.code)} />
              </FriendRow>
            ))}
          </Card>
          {outgoing.length > 0 ? (
            <>
              <Text style={sectionTitle}>{S.friends.outgoing}</Text>
              <Card style={styles.list}>
                {outgoing.map((f) => (
                  <FriendRow key={f.code} friend={f} onPress={() => open(f.code)}>
                    <Button title={S.friends.cancel} variant="white" small loading={busy === `remove-${f.code}`} onPress={() => remove(f.code)} />
                  </FriendRow>
                ))}
              </Card>
            </>
          ) : null}
        </View>
      )}
      <ErrorText>{error}</ErrorText>

      <Pressable accessibilityRole="link" onPress={() => router.push('/scan')} style={({ pressed }) => [styles.add, pressed && { opacity: 0.6 }]}>
        <Text style={styles.addText}>{`+ ${S.friends.add}`}</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  section: { gap: 10 },
  list: { gap: 4 },
  add: { alignSelf: 'center', minHeight: 44, justifyContent: 'center', paddingHorizontal: 16 },
  addText: { fontFamily: fonts.extrabold, fontSize: 16, letterSpacing: 0.6, textTransform: 'uppercase', color: colors.indigo },
});
