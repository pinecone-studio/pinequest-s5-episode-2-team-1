import type { ClanDto, MyClanResponse } from '@shared/types';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Share, StyleSheet, Text, View } from 'react-native';
import { api, errorText } from '@/api/client';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Enter } from '@/components/pixel';
import { QrIsland } from '@/components/QrIsland';
import { BackButton, Card, ErrorText, Muted, Screen } from '@/components/ui';
import { colors, fonts } from '@/constants/theme';
import { type } from '@/constants/type';
import { S } from '@/i18n/strings';
import { clanLink, clanQrText, formatClanCode } from '@/lib/clan';
import { confirm } from '@/lib/confirm';
import { usePixelBear } from '@/lib/mock/pixelBear';
import { goBack } from '@/lib/nav';
import { bgById } from '@/lib/pixelBear/catalog';

/** Самбар дээр QR-аа үзүүлж байхад нэгдсэн ангийнхан шууд гарч ирнэ. */
const POLL_MS = 5_000;
const FACES = 8;

/** Ангийнхнаа урих (Анги → Гишүүд → "Ангийнхнаа урих"): код, хуваалцах, QR арал, нэгдсэн гишүүд; эзэн нь кодоо солино. */
export default function InviteScreen() {
  const { bgId } = usePixelBear();
  const [clan, setClan] = useState<ClanDto | null | undefined>(undefined);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const next = (await api<MyClanResponse>('/clans/mine')).clan;
      if (!next) return goBack('/uul');
      setClan(next);
    } catch (e) {
      setError(errorText(e));
    }
  }, []);
  useFocusEffect(
    useCallback(() => {
      void load();
      const timer = setInterval(load, POLL_MS);
      return () => clearInterval(timer);
    }, [load]),
  );

  async function share(c: ClanDto) {
    const message = S.clan.shareMessage(c.name, formatClanCode(c.code), clanLink(c.code));
    try {
      await Share.share({ message });
    } catch {
      // Web дээр navigator.share байхгүй байж болно: мессежийг хуулна (болохгүй бол код дэлгэц дээр харагдсаар байна).
      try {
        await globalThis.navigator?.clipboard?.writeText(message);
        setNote(S.clan.copied);
      } catch {
        // хуулж чадсангүй
      }
    }
  }

  async function rotate() {
    if (!(await confirm(S.clan.rotateConfirm, S.clan.rotateYes))) return;
    setBusy(true);
    setNote('');
    setError('');
    try {
      setClan((await api<MyClanResponse>('/clans/mine/code', { method: 'POST' })).clan);
      setNote(S.clan.rotated);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <View style={styles.header}>
        <BackButton onPress={() => goBack('/uul')} />
        <Text accessibilityRole="header" style={[type.h1, { flex: 1 }]}>
          {S.clan.invite}
        </Text>
      </View>

      {!clan ? (
        <View style={styles.center}>{error ? <ErrorText>{error}</ErrorText> : <ActivityIndicator color={colors.violet} />}</View>
      ) : (
        <>
          <Enter index={0}>
            <Card style={styles.codeCard}>
              <Text style={styles.codeLabel}>{S.clan.codeLabel}</Text>
              <Text selectable accessibilityLabel={`${S.clan.codeLabel}: ${clan.code.split('').join(' ')}`} style={styles.code}>
                {formatClanCode(clan.code)}
              </Text>
              <Muted center>{S.clan.inviteHint}</Muted>
              <Button title={S.clan.share} variant="lemon" onPress={() => share(clan)} style={{ alignSelf: 'stretch' }} />
              {note ? <Text style={styles.note}>{note}</Text> : null}
            </Card>
          </Enter>

          <Enter index={1}>
            <QrIsland
              value={clanQrText(clan.code)}
              bg={bgById(bgId)}
              islandHint={S.profile.islandHint}
              qrHint={S.clan.qrHint}
              islandLabel={S.profile.islandLabel}
              qrLabel={S.clan.qrLabel}
            />
          </Enter>

          <Enter index={2}>
            <Card style={styles.joined}>
              <Text style={styles.joinedTitle}>{S.clan.members(clan.members.length, clan.maxMembers)}</Text>
              <View style={styles.faces}>
                {clan.members.slice(0, FACES).map((m, i) => (
                  <View key={m.code} style={i > 0 && styles.overlap}>
                    <Avatar size={36} border={2} look={m.look} />
                  </View>
                ))}
                {clan.members.length > FACES ? <Text style={styles.more}>{`+${clan.members.length - FACES}`}</Text> : null}
              </View>
            </Card>
          </Enter>

          <ErrorText>{error}</ErrorText>
          {clan.isOwner ? <Button title={S.clan.rotate} variant="ghost" small loading={busy} onPress={rotate} /> : null}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  center: { paddingVertical: 40, alignItems: 'center' },
  codeCard: { alignItems: 'center', gap: 12 },
  codeLabel: { fontFamily: fonts.bold, fontSize: 13, color: colors.muted },
  code: { fontFamily: fonts.pixelNum, fontSize: 40, lineHeight: 48, letterSpacing: 4, color: colors.ink, textAlign: 'center' },
  note: { fontFamily: fonts.semibold, fontSize: 13, color: colors.okText, textAlign: 'center' },
  joined: { gap: 10 },
  joinedTitle: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink },
  faces: { flexDirection: 'row', alignItems: 'center' },
  overlap: { marginLeft: -10 },
  more: { marginLeft: 8, fontFamily: fonts.bold, fontSize: 14, color: colors.muted },
});
