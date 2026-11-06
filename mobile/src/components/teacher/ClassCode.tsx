import { useState } from 'react';
import { Share, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { QrIsland } from '@/components/QrIsland';
import { Card } from '@/components/ui';
import { colors, fonts, radius } from '@/constants/theme';
import { S } from '@/i18n/strings';
import { T } from '@/i18n/teacher';
import { clanLink, clanQrText, formatClanCode } from '@/lib/clan';
import { usePixelBear } from '@/lib/mock/pixelBear';
import { bgById } from '@/lib/pixelBear/catalog';

/**
 * Ангийн нэгдэх код: хуваалцах, QR (Уулын кодын адил /uul/:code холбоос тул сурагчийн «QR уншуулах» шууд уншина).
 * `big` = сурагчгүй анги: кодыг самбарт бичихэд том; сурагчтай бол жижиг мөр.
 */
export function ClassCode({ name, code, big }: { name: string; code: string; big: boolean }) {
  const { bgId } = usePixelBear();
  const [qr, setQr] = useState(false);
  const [note, setNote] = useState('');

  async function share() {
    const message = T.shareMessage(name, formatClanCode(code), clanLink(code));
    try {
      await Share.share({ message });
    } catch {
      // web: navigator.share байхгүй бол хуулна; болохгүй бол код дэлгэц дээр харагдсаар байна
      try {
        await globalThis.navigator?.clipboard?.writeText(message);
        setNote(T.copied);
      } catch {
        // хуулж чадсангүй
      }
    }
  }

  return (
    <>
      <Card style={[styles.card, !big && styles.slim]}>
        <View style={big ? styles.center : styles.row}>
          <Text style={styles.label}>{big ? T.codeTitle : T.codeShort}</Text>
          <Text selectable style={big ? styles.codeBig : styles.code} accessibilityLabel={code.split('').join(' ')}>
            {formatClanCode(code)}
          </Text>
        </View>
        {big ? <Text style={styles.hint}>{T.codeHint}</Text> : null}
        <View style={styles.row}>
          <Button title={T.share} variant="lemon" small onPress={() => void share()} style={styles.flex} />
          <Button title={qr ? T.hideQr : T.showQr} variant="white" small onPress={() => setQr((v) => !v)} style={styles.flex} />
        </View>
        {note ? <Text style={styles.hint}>{note}</Text> : null}
      </Card>
      {/* QR-ийн тайлбар бараан дэвсгэр дээр уншигдахгүй тул цагаан картад */}
      {qr ? (
        <Card>
          <QrIsland
            value={clanQrText(code)}
            bg={bgById(bgId)}
            islandHint={S.profile.islandHint}
            qrHint={T.qrHint}
            islandLabel={S.profile.islandLabel}
            qrLabel={S.clan.qrLabel}
          />
        </Card>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12, backgroundColor: colors.indigo, borderRadius: radius.card },
  slim: { paddingVertical: 14 },
  center: { alignItems: 'center', gap: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  flex: { flex: 1 },
  label: { fontFamily: fonts.bold, fontSize: 15, color: colors.lavender },
  codeBig: {
    fontFamily: fonts.pixelNum,
    fontSize: 44,
    lineHeight: 56,
    letterSpacing: 4,
    color: colors.lemon,
  },
  code: {
    fontFamily: fonts.pixelNum,
    fontSize: 26,
    lineHeight: 34,
    letterSpacing: 2,
    color: colors.lemon,
  },
  hint: {
    fontFamily: fonts.medium,
    fontSize: 14,
    lineHeight: 20,
    color: colors.white,
    textAlign: 'center',
  },
});
