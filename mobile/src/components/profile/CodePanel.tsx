import type { MyProfileResponse } from '@shared/types';
import { useState } from 'react';
import { Share, StyleSheet, Text, View } from 'react-native';
import { api, errorText } from '@/api/client';
import { Button } from '@/components/Button';
import { QrIsland } from '@/components/QrIsland';
import { Card, ErrorText } from '@/components/ui';
import { colors, fonts } from '@/constants/theme';
import { S } from '@/i18n/strings';
import { confirm } from '@/lib/confirm';
import { usePixelBear } from '@/lib/mock/pixelBear';
import { bgById } from '@/lib/pixelBear/catalog';
import { formatProfileCode, profileLink, profileQrText } from '@/lib/profile';

/** QR товчоор нээгддэг миний код: QR арал, код, хуваалцах, солих (хуучин код ажиллахаа болино). */
export function CodePanel({ data, onRotated }: { data: MyProfileResponse; onRotated: (r: MyProfileResponse) => void }) {
  const { bgId } = usePixelBear();
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function share() {
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
    setBusy(true);
    setNote('');
    setError('');
    try {
      onRotated(await api<MyProfileResponse>('/me/profile/code', { method: 'POST' }));
      setNote(S.profile.rotated);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card style={styles.card}>
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
        <Button title={S.profile.rotate} variant="ghost" small loading={busy} onPress={rotate} style={{ flex: 1 }} />
      </View>
      {note ? <Text style={styles.note}>{note}</Text> : null}
      <ErrorText>{error}</ErrorText>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: 10 },
  code: { fontFamily: fonts.pixelNum, fontSize: 27, lineHeight: 32, letterSpacing: 2, color: colors.ink, textAlign: 'center' },
  actions: { flexDirection: 'row', gap: 10 },
  note: { fontFamily: fonts.semibold, fontSize: 13, color: colors.okText, textAlign: 'center' },
});
