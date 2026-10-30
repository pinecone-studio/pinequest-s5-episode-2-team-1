import { clanTitle } from '@shared/clan';
import type { ClanDto, FriendBody, FriendsResponse, MyClanResponse, MyProfileResponse } from '@shared/types';
import * as Haptics from 'expo-haptics';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Share, StyleSheet, Text, View } from 'react-native';
import { api, errorText } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { ClanMountain } from '@/components/ClanMountain';
import { FriendRow } from '@/components/FriendRow';
import { Enter, PressScale } from '@/components/pixel';
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
 * Миний профайл (аватар дээр дарж нээнэ): баавгай, нэр, шат; баавгайгаа хуваалцах; найз болох хүсэлт, найзууд. Миний
 * код (QR арал, код, хуваалцах, солих) «Миний код»-ыг дарахад л нээгдэнэ. Найз нь QR-ийг уншуулаад «Найз болох» дармагц
 * хүсэлт энд гарч ирэхэд «Зөвшөөрөх» дарна.
 */
export default function ProfileScreen() {
  const { me, refreshMe, signOut } = useAuth();
  const { bgId } = usePixelBear();
  const [data, setData] = useState<MyProfileResponse | null>(null);
  const [friends, setFriends] = useState<FriendsResponse | null>(null);
  // undefined = ачаалж байна, null = Уулгүй
  const [clan, setClan] = useState<ClanDto | null | undefined>(undefined);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
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
      api<MyClanResponse>('/clans/mine')
        .then((r) => setClan(r.clan))
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

  async function onLogout() {
    if (await confirm(S.auth.logoutConfirm, S.auth.logout)) await signOut();
  }

  const open = (code: string) => router.push(`/u/${code}`);
  const incoming = friends?.incoming ?? [];
  const outgoing = friends?.outgoing ?? [];
  const list = friends?.friends ?? [];

  return (
    <Screen>
      <View style={styles.header}>
        <BackButton onPress={() => goBack()} />
        <Text accessibilityRole="header" style={[type.h1, { flex: 1 }]}>
          {S.profile.title}
        </Text>
      </View>

      {!data ? (
        <View style={styles.center}>
          {error ? <ErrorText>{error}</ErrorText> : <ActivityIndicator color={colors.violet} />}
        </View>
      ) : (
        <>
          {me ? (
            <Enter index={0}>
              <Card style={styles.hero}>
                <View style={styles.heroRow}>
                  <Avatar size={72} look={me.look} label={S.avatar.preview(me.name ?? me.username)} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.cardTitle} numberOfLines={1}>
                      {me.name ?? me.username}
                    </Text>
                    <Text style={type.small} numberOfLines={1}>
                      {S.profile.heroLine(me.username, me.level)}
                    </Text>
                  </View>
                  <Button title={S.avatar.change} variant="secondary" small onPress={() => router.push('/avatar')} />
                </View>
                <Button title={S.profile.shareBear} variant="lemon" loading={busy === 'card'} onPress={shareBear} />
                {cardNote ? <Text style={styles.note}>{cardNote}</Text> : null}
              </Card>
            </Enter>
          ) : null}

          {clan !== undefined ? (
            <Enter index={1}>
              <PressScale
                accessibilityRole="link"
                accessibilityLabel={clan ? `${S.clan.cardTitle}: ${clanTitle(clan.name)}, ${S.clan.cardLine(clan.members.length, clan.maxMembers, clan.height)}` : S.clan.cardTitle}
                onPress={() => router.push('/uul')}
              >
                <Card style={styles.clan}>
                  <View style={styles.clanArt}>
                    <ClanMountain />
                  </View>
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text style={styles.subTitle}>{S.clan.cardTitle}</Text>
                    {clan ? (
                      <>
                        <Text style={styles.cardTitle} numberOfLines={2}>
                          {clanTitle(clan.name)}
                        </Text>
                        <Text style={type.small}>{S.clan.cardLine(clan.members.length, clan.maxMembers, clan.height)}</Text>
                      </>
                    ) : (
                      <Text style={styles.clanEmpty}>{S.clan.cardEmpty}</Text>
                    )}
                  </View>
                  <Text style={styles.chevron}>›</Text>
                </Card>
              </PressScale>
            </Enter>
          ) : null}

          {incoming.length > 0 ? (
            <Enter index={1}>
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

          <Enter index={2} style={styles.section}>
            <SectionTitle>{S.friends.title(list.length)}</SectionTitle>
            <Card style={styles.friends}>
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
              <View style={styles.actions}>
                <Button title={S.friends.add} variant="lemon" small onPress={() => router.push('/scan')} style={{ flex: 1 }} />
                <Button
                  title={showCode ? S.profile.hideCode : S.profile.myCode}
                  variant="secondary"
                  small
                  onPress={() => setShowCode((v) => !v)}
                  style={{ flex: 1 }}
                />
              </View>
              {showCode ? (
                <View style={styles.codePanel}>
                  <QrIsland
                    value={profileQrText(data.code)}
                    bg={bgById(bgId)}
                    islandHint={S.profile.islandHint}
                    qrHint={S.profile.qrHint}
                    islandLabel={S.profile.islandLabel}
                    qrLabel={S.profile.qrLabel}
                  />
                  <Text selectable accessibilityLabel={`${S.profile.codeLabel}: ${data.code.split('').join(' ')}`} style={styles.code}>
                    {formatProfileCode(data.code)}
                  </Text>
                  <View style={styles.actions}>
                    <Button title={S.profile.share} variant="secondary" small onPress={share} style={{ flex: 1 }} />
                    <Button title={S.profile.rotate} variant="ghost" small loading={busy === 'rotate'} onPress={rotate} style={{ flex: 1 }} />
                  </View>
                </View>
              ) : null}
              {note ? <Text style={styles.note}>{note}</Text> : null}
              <ErrorText>{error}</ErrorText>
            </Card>
          </Enter>
        </>
      )}

      {/* Профайл ачаалагдаагүй (офлайн) байсан ч гарч болно. */}
      <Button title={S.auth.logout} variant="white" onPress={onLogout} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  center: { paddingVertical: 40, alignItems: 'center' },
  hero: { gap: 14 },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  requests: { backgroundColor: colors.lavender },
  cardTitle: { fontFamily: fonts.semibold, fontSize: 18, color: colors.ink },
  friends: { gap: 4 },
  codePanel: { gap: 10, marginTop: 8, alignItems: 'stretch' },
  code: { fontFamily: fonts.pixelNum, fontSize: 27, lineHeight: 32, letterSpacing: 2, color: colors.ink, textAlign: 'center' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  note: { fontFamily: fonts.semibold, fontSize: 13, color: colors.okText, textAlign: 'center' },
  section: { gap: 10 },
  subTitle: { fontFamily: fonts.bold, fontSize: 13, color: colors.muted, marginTop: 4 },
  request: { gap: 10 },
  clan: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  clanArt: { width: 92 },
  clanEmpty: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 19, color: colors.ink },
  chevron: { fontFamily: fonts.bold, fontSize: 26, color: colors.mutedIcon },
});
