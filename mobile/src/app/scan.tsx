import { type BarcodeScanningResult, CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { CLAN_CODE_LENGTH } from '@shared/clan';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from '@/components/Button';
import { BackButton, Card, Muted, Screen } from '@/components/ui';
import { colors, fonts, radius } from '@/constants/theme';
import { type } from '@/constants/type';
import { S } from '@/i18n/strings';
import { parseClanLink } from '@/lib/clan';
import { goBack } from '@/lib/nav';
import { parseProfileCode, PROFILE_CODE_LENGTH } from '@/lib/profile';

/**
 * Найз нэмэх: найзын профайл дээрх QR-ийг камераар уншуулна (камергүй бол кодыг бичнэ) → найзын профайл нээгдэнэ.
 * `?for=uul` (Уул → «QR уншуулах»): ангийнхны Уулын QR эсвэл 6 оронтой код → Ууланд нэгдэх. Аль ч горимд Уулын QR-ийг
 * уншуулбал Уул, профайлынхыг уншуулбал профайл нээгдэнэ.
 */
export default function ScanScreen() {
  const forClan = useLocalSearchParams<{ for?: string }>().for === 'uul';
  const codeLength = forClan ? CLAN_CODE_LENGTH : PROFILE_CODE_LENGTH;
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraError, setCameraError] = useState(false);
  const [wrongQr, setWrongQr] = useState(false);
  const [codeText, setCodeText] = useState('');
  const handled = useRef(false);

  function open(path: string) {
    if (handled.current) return;
    handled.current = true;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.replace(path);
  }

  function onScanned({ data }: BarcodeScanningResult) {
    const clan = parseClanLink(data);
    const profile = clan ? null : parseProfileCode(data);
    if (clan) open(`/uul/${clan}`);
    else if (profile) open(`/u/${profile}`);
    else setWrongQr(true);
  }

  const submit = () => {
    if (codeText.length === codeLength) open(forClan ? `/uul/${codeText}` : `/u/${codeText}`);
  };

  return (
    <Screen>
      <View style={styles.header}>
        <BackButton onPress={() => goBack(forClan ? '/uul' : '/profile')} />
        <View style={{ flex: 1, gap: 4 }}>
          <Text accessibilityRole="header" style={type.h1}>
            {forClan ? S.clan.scanTitle : S.friends.scanTitle}
          </Text>
          <Text style={type.small}>{forClan ? S.clan.scanHint : S.friends.scanHint}</Text>
        </View>
      </View>

      <View style={styles.camera}>
        {!permission ? (
          <ActivityIndicator color={colors.white} />
        ) : !permission.granted ? (
          <View style={styles.ask}>
            <Text style={styles.askText}>{permission.canAskAgain ? (forClan ? S.clan.cameraAsk : S.friends.cameraAsk) : S.friends.cameraDenied}</Text>
            {permission.canAskAgain ? <Button title={S.friends.cameraAllow} variant="lemon" small onPress={requestPermission} /> : null}
          </View>
        ) : cameraError ? (
          <View style={styles.ask}>
            <Text style={styles.askText}>{S.friends.cameraFailed}</Text>
          </View>
        ) : (
          <>
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={onScanned}
              onMountError={() => setCameraError(true)}
            />
            <View pointerEvents="none" style={styles.frame}>
              <View style={[styles.corner, styles.tl]} />
              <View style={[styles.corner, styles.tr]} />
              <View style={[styles.corner, styles.bl]} />
              <View style={[styles.corner, styles.br]} />
            </View>
          </>
        )}
      </View>
      {wrongQr ? (
        <Text accessibilityRole="alert" style={styles.wrong}>
          {S.friends.notProfileQr}
        </Text>
      ) : null}

      <Card>
        <Text style={styles.cardTitle}>{forClan ? S.clan.manualTitle : S.friends.manualTitle}</Text>
        <Muted>{forClan ? S.clan.manualHint : S.friends.manualHint}</Muted>
        <View style={styles.findRow}>
          <TextInput
            value={codeText}
            // maxLength тавихгүй: хуваалцсан "4821 9137" (зайтай, 9 тэмдэгт)-ийг буулгахад сүүлийн орон тасрахгүй
            onChangeText={(t) => setCodeText(t.replace(/\D/g, '').slice(0, codeLength))}
            onSubmitEditing={submit}
            keyboardType="number-pad"
            returnKeyType="go"
            placeholder={forClan ? '000 000' : '0000 0000'}
            placeholderTextColor={colors.mutedIcon}
            accessibilityLabel={forClan ? S.clan.manualHint : S.friends.manualHint}
            style={styles.input}
          />
          <Button title={S.friends.manualButton} small disabled={codeText.length !== codeLength} onPress={submit} />
        </View>
      </Card>
    </Screen>
  );
}

const CORNER = 34;

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  camera: {
    height: 340,
    borderRadius: radius.stage,
    overflow: 'hidden',
    backgroundColor: colors.indigo,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ask: { padding: 24, gap: 14, alignItems: 'center' },
  askText: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 21, color: colors.white, textAlign: 'center' },
  frame: { width: 220, height: 220 },
  corner: { position: 'absolute', width: CORNER, height: CORNER, borderColor: colors.lemon },
  tl: { left: 0, top: 0, borderLeftWidth: 5, borderTopWidth: 5, borderTopLeftRadius: 14 },
  tr: { right: 0, top: 0, borderRightWidth: 5, borderTopWidth: 5, borderTopRightRadius: 14 },
  bl: { left: 0, bottom: 0, borderLeftWidth: 5, borderBottomWidth: 5, borderBottomLeftRadius: 14 },
  br: { right: 0, bottom: 0, borderRightWidth: 5, borderBottomWidth: 5, borderBottomRightRadius: 14 },
  wrong: { fontFamily: fonts.semibold, fontSize: 14, color: colors.dangerText, textAlign: 'center' },
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
    fontFamily: fonts.pixelNum,
    fontSize: 17,
    letterSpacing: 2,
    color: colors.ink,
  },
});
