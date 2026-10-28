import type { FriendBody, FriendsResponse, MyProfileResponse } from '@shared/types';
import * as Haptics from 'expo-haptics';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Share, StyleSheet, Text, View } from 'react-native';
import { api, errorText } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { FriendRow } from '@/components/FriendRow';
import { Enter } from '@/components/pixel';
import { ProfileView } from '@/components/ProfileView';
import { QrIsland } from '@/components/QrIsland';
import { BackButton, Card, ErrorText, Muted, Screen, SectionTitle } from '@/components/ui';
import { colors, fonts } from '@/constants/theme';
import { type } from '@/constants/type';
import { S } from '@/i18n/strings';
import { canShareCardImage, shareBearCard } from '@/lib/bearCard';
import { confirm } from '@/lib/confirm';
import { usePixelBear } from '@/lib/mock/pixelBear';
import { goBack } from '@/lib/nav';
import { bgById } from '@/lib/pixelBear/catalog';
import { formatProfileCode, profileLink, profileQrText } from '@/lib/profile';

/** QR-аа үзүүлж байхад найзын хүсэлт шууд гарч ирэхийн тулд жагсаалтыг ингэж байнга шинэчилнэ. */
const POLL_MS = 3_000;

/**
 * Миний профайл (аватар дээр дарж нээнэ): QR арал (найз нь уншуулна), найз болох хүсэлтүүд, найзууд, бусдад харагдах
 * байдал. Найз нь QR-ийг уншуулаад «Найз болох» дармагц хүсэлт энд гарч ирэхэд «Зөвшөөрөх» дарна.
 */
export default function ProfileScreen() {
  const { me, refreshMe } = useAuth();
  const { bgId } = usePixelBear();
  const [data, setData] = useState<MyProfileResponse | null>(null);
  const [friends, setFriends] = useState<FriendsResponse | null>(null);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [cardNote, setCardNote] = useState('');
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

  /** Баавгайн картыг зургаар (вэб); утсан дээр зураг үүсгэх боломжгүй тул кодоо текстээр хуваалцана. */
  async function shareBear() {
    if (!me || !data) return;
    if (!canShareCardImage()) return share();
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

  async function rotate() {
    if (!(await confirm(S.profile.rotateConfirm, S.profile.rotateYes))) return;
    setNote('');
    await act('rotate', async () => {
      setData(await api<MyProfileResponse>('/me/profile/code', { method: 'POST' }));
      setNote(S.profile.rotated);
    });
  }

  const open = (code: string) => router.push(`/u/${code}`);
  const incoming = friends?.incoming ?? [];
  const outgoing = friends?.outgoing ?? [];
  const list = friends?.friends ?? [];

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
          {me ? (
            <Enter index={0}>
              <Card style={styles.photoCard}>
                <Avatar size={64} look={me.look} label={S.avatar.preview(me.name ?? me.username)} />
                <Text style={[styles.cardTitle, { flex: 1 }]} numberOfLines={1}>
                  {me.name ?? me.username}
                </Text>
                <Button title={S.avatar.change} variant="secondary" small onPress={() => router.push('/avatar')} />
              </Card>
              <Button title={S.profile.shareBear} variant="lemon" loading={busy === 'card'} onPress={shareBear} style={styles.shareBear} />
              {cardNote ? <Text style={styles.note}>{cardNote}</Text> : null}
            </Enter>
          ) : null}

          {incoming.length > 0 ? (
            <Enter index={0}>
              <Card style={styles.requests}>
                <Text accessibilityRole="header" style={styles.cardTitle}>
                  {S.friends.requests(incoming.length)}
                </Text>
                {incoming.map((f) => (
                  <View key={f.code} style={styles.request}>
                    <FriendRow friend={f} onPress={() => open(f.code)} />
                    <View style={styles.actions}>
                      <Button
                        title={S.friends.accept}
                        small
                        loading={busy === `accept-${f.code}`}
                        onPress={() => accept(f.code)}
                        style={{ flex: 1 }}
                      />
                      <Button
                        title={S.friends.decline}
                        variant="white"
                        small
                        disabled={busy !== null}
                        accessibilityLabel={`${S.friends.decline}: ${f.name ?? f.username}`}
                        onPress={() => remove(f.code)}
                      />
                    </View>
                  </View>
                ))}
              </Card>
            </Enter>
          ) : null}

          <Enter index={1}>
            <Card style={styles.qrCard}>
              <QrIsland
                value={profileQrText(data.code)}
                bg={bgById(bgId)}
                islandHint={S.profile.islandHint}
                qrHint={S.profile.qrHint}
                islandLabel={S.profile.islandLabel}
                qrLabel={S.profile.qrLabel}
              />
              <View style={styles.codeRow}>
                <Text style={styles.label}>{S.profile.codeLabel}</Text>
                <Text selectable accessibilityLabel={`${S.profile.codeLabel}: ${data.code.split('').join(' ')}`} style={styles.code}>
                  {formatProfileCode(data.code)}
                </Text>
              </View>
              <Muted center>{S.profile.codeHint}</Muted>
              <View style={styles.actions}>
                <Button title={S.friends.add} variant="lemon" small onPress={() => router.push('/scan')} style={{ flex: 1 }} />
                <Button title={S.profile.share} variant="secondary" small onPress={share} style={{ flex: 1 }} />
              </View>
              <Button title={S.profile.rotate} variant="ghost" small loading={busy === 'rotate'} onPress={rotate} />
              {note ? <Text style={styles.note}>{note}</Text> : null}
              <ErrorText>{error}</ErrorText>
            </Card>
          </Enter>

          <Enter index={2} style={styles.section}>
            <SectionTitle>{S.friends.title(list.length)}</SectionTitle>
            <Card>
              {list.length === 0 ? <Muted>{S.friends.empty}</Muted> : null}
              {list.map((f) => (
                <FriendRow key={f.code} friend={f} onPress={() => open(f.code)} />
              ))}
              {outgoing.length > 0 ? <Text style={styles.subTitle}>{S.friends.outgoing}</Text> : null}
              {outgoing.map((f) => (
                <FriendRow key={f.code} friend={f} onPress={() => open(f.code)}>
                  <Button title={S.friends.cancel} variant="white" small loading={busy === `remove-${f.code}`} onPress={() => remove(f.code)} />
                </FriendRow>
              ))}
            </Card>
          </Enter>

          <SectionTitle>{S.profile.preview}</SectionTitle>
          <ProfileView profile={data.profile} index={3} />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  center: { paddingVertical: 40, alignItems: 'center' },
  photoCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  shareBear: { marginTop: 10 },
  requests: { backgroundColor: colors.lavender },
  cardTitle: { fontFamily: fonts.semibold, fontSize: 18, color: colors.ink },
  qrCard: { gap: 10 },
  codeRow: { alignItems: 'center', gap: 2 },
  label: { fontFamily: fonts.bold, fontSize: 12, letterSpacing: 0.8, textTransform: 'uppercase', color: colors.muted },
  code: { fontFamily: fonts.pixel, fontSize: 32, lineHeight: 38, letterSpacing: 2, color: colors.ink },
  actions: { flexDirection: 'row', gap: 10 },
  note: { fontFamily: fonts.semibold, fontSize: 13, color: colors.okText, textAlign: 'center' },
  section: { gap: 10 },
  subTitle: { fontFamily: fonts.bold, fontSize: 13, color: colors.muted, marginTop: 4 },
  request: { gap: 10 },
});
