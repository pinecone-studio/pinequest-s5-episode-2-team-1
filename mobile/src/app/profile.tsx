import type { FriendBody, FriendsResponse, LeagueResponse, MyProfileResponse } from '@shared/types';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { api, errorText } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { Button } from '@/components/Button';
import { CodePanel } from '@/components/profile/CodePanel';
import { FriendRequests } from '@/components/profile/FriendRequests';
import { LockedShelf } from '@/components/profile/LockedShelf';
import { Overview } from '@/components/profile/Overview';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { ProfileTop } from '@/components/profile/ProfileTop';
import { ErrorText, Screen } from '@/components/ui';
import { colors, fonts } from '@/constants/theme';
import { P } from '@/i18n/profile';
import { S } from '@/i18n/strings';
import { canShareCardImage, shareBearCard } from '@/lib/bearCard';
import { profileLink } from '@/lib/profile';

/** QR-аа үзүүлж байхад найзын хүсэлт шууд гарч ирэхийн тулд жагсаалтыг ингэж байнга шинэчилнэ. */
const POLL_MS = 3_000;

/**
 * Миний профайл: дээр баавгай ба тоонууд (анги, найз, хүсэлт), найз нэмэх / QR код, хүсэлтүүд, тойм (дараалал, лиг,
 * XP, шат), сарын тэмдэг ба амжилт (icon ирэх хүртэл түгжээтэй), хуваалцах. Анги нь Анги tab-д. Найзуудын жагсаалт /friends-д. Багц, гарах нь тохиргоонд.
 */
export default function ProfileScreen() {
  const { me, refreshMe } = useAuth();
  const [data, setData] = useState<MyProfileResponse | null>(null);
  const [friends, setFriends] = useState<FriendsResponse | null>(null);
  const [tier, setTier] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [cardNote, setCardNote] = useState('');
  const [showCode, setShowCode] = useState(false);
  const seenIncoming = useRef<number | null>(null);

  const loadFriends = useCallback(async () => {
    try {
      const f = await api<FriendsResponse>('/friends');
      if (seenIncoming.current !== null && f.incoming.length > seenIncoming.current) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      seenIncoming.current = f.incoming.length;
      setFriends(f);
    } catch {
      // дараагийн шинэчлэлтээр дахин оролдоно
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      api<MyProfileResponse>('/me/profile')
        .then((r) => {
          setData(r);
          setError('');
        })
        .catch((e) => setError(errorText(e)));
      api<LeagueResponse>('/league')
        .then((r) => setTier(r.me.state === 'placed' ? r.me.tier : null))
        .catch(() => {});
      void loadFriends();
      const timer = setInterval(loadFriends, POLL_MS);
      return () => clearInterval(timer);
    }, [loadFriends]),
  );

  async function act(key: string, fn: () => Promise<unknown>) {
    setBusy(key);
    setError('');
    try {
      await fn();
      await loadFriends();
      void refreshMe();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(null);
    }
  }

  const accept = (code: string) => act(`accept-${code}`, () => api('/friends', { body: { code } satisfies FriendBody }));
  const remove = (code: string) => act(`remove-${code}`, () => api(`/friends/${code}`, { method: 'DELETE' }));

  /** Баавгайн картыг зургаар (вэб); утсан дээр зураг үүсгэх боломжгүй тул кодоо текстээр хуваалцуулна. */
  async function shareBear() {
    if (!me || !data) return;
    if (!canShareCardImage()) return setShowCode(true);
    setBusy('card');
    setCardNote('');
    try {
      const look = { fur: me.look.fur ?? 'brown', face: me.look.face ?? 'calm', chest: me.look.chest ?? true };
      const card = { name: me.name ?? me.username, look, level: me.level, streak: me.streak };
      if ((await shareBearCard(card, S.profile.shareBearText(profileLink(data.code)))) === 'downloaded') setCardNote(S.profile.cardSaved);
    } catch {
      setCardNote(S.profile.cardError);
    } finally {
      setBusy(null);
    }
  }

  return (
    // header нь гүйлгэхэд дээр наалдаж, контент түүний ард гүйлгэгдэнэ
    <Screen stickyHeaderIndices={[0]} contentStyle={styles.content}>
      <ProfileHeader name={me ? (me.name ?? me.username) : S.profile.title} />

      {!data || !me ? (
        <View style={styles.center}>{error ? <ErrorText>{error}</ErrorText> : <ActivityIndicator color={colors.violet} />}</View>
      ) : (
        <>
          <ProfileTop
            me={me}
            joinedAt={data.profile.joinedAt}
            friends={friends?.friends.length ?? 0}
            requests={friends?.incoming.length ?? 0}
            showCode={showCode}
            onToggleCode={() => setShowCode((v) => !v)}
          />
          {showCode ? <CodePanel data={data} onRotated={setData} /> : null}
          <FriendRequests friends={friends} busy={busy} onAccept={accept} onRemove={remove} />
          <ErrorText>{error}</ErrorText>
          <Overview index={3} streak={me.streak} tier={tier} xp={me.xp} level={me.level} />
          <LockedShelf index={4} title={P.badges} slots={4} round />
          <LockedShelf index={5} title={P.achievements} slots={4} />
          <Button title={S.profile.shareBear} variant="lemon" loading={busy === 'card'} onPress={shareBear} />
          {cardNote ? <Text style={styles.note}>{cardNote}</Text> : null}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 0 },
  center: { paddingVertical: 40, alignItems: 'center' },
  note: { fontFamily: fonts.semibold, fontSize: 13, color: colors.okText, textAlign: 'center' },
});
