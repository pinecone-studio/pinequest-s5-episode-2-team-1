import { clanTitle } from '@shared/clan';
import type { ClanPreviewResponse, MyClanResponse } from '@shared/types';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { api, ApiError, errorText } from '@/api/client';
import { Button } from '@/components/Button';
import { ClanMountain } from '@/components/ClanMountain';
import { Enter, Sprite } from '@/components/pixel';
import { BackButton, Card, ErrorText, Muted, Screen } from '@/components/ui';
import { colors, fonts, radius } from '@/constants/theme';
import { type } from '@/constants/type';
import { errorMessages, S } from '@/i18n/strings';
import { formatClanCode, groupDigits } from '@/lib/clan';
import { goBack } from '@/lib/nav';

/** Ууланд нэгдэх: ангийнхны QR, бичсэн код эсвэл хуваалцсан холбоос (/uul/<код>). Нэгдэхээс өмнө Уулыг харуулна. */
export default function ClanJoinScreen() {
  const { code: raw } = useLocalSearchParams<{ code: string }>();
  const code = String(raw ?? '').replace(/\D/g, '');
  const [data, setData] = useState<ClanPreviewResponse | null>(null);
  const [error, setError] = useState<{ text: string; notFound: boolean } | null>(null);
  const [actionError, setActionError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    api<ClanPreviewResponse>(`/clans/${code}`)
      .then((r) => alive && setData(r))
      .catch((e) => {
        if (!alive) return;
        const notFound = e instanceof ApiError && (e.code === 'CLAN_NOT_FOUND' || e.code === 'BAD_REQUEST');
        setError({ text: notFound ? S.clan.notFoundHint : errorText(e), notFound });
      });
    return () => {
      alive = false;
    };
  }, [code, attempt]);

  async function join() {
    setBusy(true);
    setActionError('');
    try {
      await api<MyClanResponse>(`/clans/${code}/join`, { method: 'POST' });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/uul');
    } catch (e) {
      setActionError(errorText(e));
      setBusy(false);
    }
  }

  const clan = data?.clan;
  const full = clan ? clan.members >= clan.maxMembers : false;

  return (
    <Screen>
      <View style={styles.header}>
        <BackButton onPress={() => goBack('/uul')} />
        <View style={{ flex: 1, gap: 4 }}>
          <Text accessibilityRole="header" style={type.h1}>
            {S.clan.previewTitle}
          </Text>
          {code.length > 0 ? <Text style={type.small}>{formatClanCode(code)}</Text> : null}
        </View>
      </View>

      {data && clan ? (
        <>
          <Enter index={0}>
            <Card style={styles.hero}>
              <ClanMountain climbers={clan.looks} label={S.clan.mountainLabel(clanTitle(clan.name), clan.height)} />
              <Text style={type.h2} numberOfLines={2}>
                {clanTitle(clan.name)}
              </Text>
              <Text style={type.small}>{S.clan.previewLine(clan.owner, clan.members, clan.maxMembers)}</Text>
              <Text style={styles.height}>
                {groupDigits(clan.height)}
                <Text style={styles.unit}> м</Text>
              </Text>
            </Card>
          </Enter>

          <Enter index={1}>
            <Card style={[styles.action, data.status === 'member' && { backgroundColor: colors.lime }]}>
              {data.status === 'none' ? (
                full ? (
                  <Text style={styles.status}>{S.clan.full(clan.maxMembers)}</Text>
                ) : (
                  <Button title={S.clan.join} variant="lemon" loading={busy} onPress={join} />
                )
              ) : null}
              {data.status === 'member' ? (
                <>
                  <View style={styles.memberRow}>
                    <Sprite id="head_happy_52x34" />
                    <Text style={styles.memberText}>{S.clan.isMember}</Text>
                  </View>
                  <Button title={S.clan.goMine} onPress={() => router.replace('/uul')} />
                </>
              ) : null}
              {data.status === 'elsewhere' ? (
                <>
                  <Text style={styles.status}>{S.clan.elsewhere}</Text>
                  <Button title={S.clan.goMine} variant="secondary" onPress={() => router.replace('/uul')} />
                </>
              ) : null}
              <ErrorText>{actionError}</ErrorText>
            </Card>
          </Enter>
        </>
      ) : error ? (
        <View style={styles.center}>
          <Sprite id="bear_tired_scarf_164x280" label="Ядарсан баавгай" />
          {error.notFound ? <Text style={[type.h3, { textAlign: 'center' }]}>{errorMessages.CLAN_NOT_FOUND}</Text> : null}
          {error.notFound ? <Muted center>{error.text}</Muted> : <ErrorText>{error.text}</ErrorText>}
          {error.notFound ? null : <Button
              title={S.common.retry}
              small
              onPress={() => {
                setError(null);
                setAttempt((n) => n + 1);
              }}
            />}
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
  hero: { gap: 10 },
  height: { fontFamily: fonts.pixelNum, fontSize: 30, lineHeight: 36, color: colors.ink },
  unit: { fontFamily: fonts.bold, fontSize: 18 },
  action: { gap: 10 },
  status: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 21, color: colors.ink },
  memberRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: radius.md },
  memberText: { fontFamily: fonts.bold, fontSize: 18, color: colors.ink },
});
