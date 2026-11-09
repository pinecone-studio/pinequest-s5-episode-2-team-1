import type { ClanDto, MyClanResponse } from '@shared/types';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { api, errorText } from '@/api/client';
import { Button } from '@/components/Button';
import { ClanHero } from '@/components/clan/ClanHero';
import { ClanMembers } from '@/components/clan/ClanMembers';
import { NoClan } from '@/components/clan/NoClan';
import { Enter } from '@/components/pixel';
import { BackButton, ErrorText, Screen } from '@/components/ui';
import { colors } from '@/constants/theme';
import { type } from '@/constants/type';
import { S } from '@/i18n/strings';
import type { ClanAct } from '@/lib/clan';
import { confirm } from '@/lib/confirm';
import { goBack } from '@/lib/nav';

/** Шинэ гишүүд (урих хуудаснаас буцахад ч) шууд гарч ирэхийн тулд ингэж шинэчилнэ. */
const POLL_MS = 5_000;

/**
 * Миний анги: ангигүй бол байгуулах эсвэл кодоор нэгдэх; байвал нэг картад өдрийн тэмцлийн зураг ба лигийн уралдаан
 * (хэддүгээр байр, дээд ангийг давахад хэдэн м), дараа нь энэ 7 хоногт хамгийн их өндөрсгөсөн гишүүд. Урих код/QR нь тусдаа хуудас (/uul/invite). Эзэн нь нэр
 * солих, гишүүн хасна.
 */
export default function ClanScreen() {
  // undefined = ачаалж байна, null = ангигүй
  const [clan, setClan] = useState<ClanDto | null | undefined>(undefined);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setClan((await api<MyClanResponse>('/clans/mine')).clan);
      setLoadError('');
    } catch (e) {
      setLoadError(errorText(e));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
      const timer = setInterval(load, POLL_MS);
      return () => clearInterval(timer);
    }, [load]),
  );

  const act: ClanAct = async (key, fn) => {
    setBusy(key);
    setError('');
    try {
      setClan((await fn()).clan);
      return true;
    } catch (e) {
      setError(errorText(e));
      return false;
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen>
      <View style={styles.header}>
        <BackButton onPress={() => goBack('/profile')} />
        <Text accessibilityRole="header" style={[type.h1, { flex: 1 }]}>
          {S.clan.title}
        </Text>
      </View>

      {clan === undefined ? (
        <View style={styles.center}>{loadError ? <ErrorText>{loadError}</ErrorText> : <ActivityIndicator color={colors.violet} />}</View>
      ) : clan === null ? (
        <NoClan busy={busy} error={error} act={act} />
      ) : (
        <MyClan clan={clan} busy={busy} error={error} act={act} />
      )}
    </Screen>
  );
}

function MyClan({ clan, busy, error, act }: { clan: ClanDto; busy: string | null; error: string; act: ClanAct }) {
  async function leave() {
    const ask = clan.members.length <= 1 ? S.clan.leaveLast : clan.isOwner ? S.clan.leaveOwner : S.clan.leaveConfirm;
    if (!(await confirm(ask, S.clan.leaveYes))) return;
    await act('leave', () => api<MyClanResponse>('/clans/mine/leave', { method: 'POST' }));
  }

  return (
    <>
      <Enter index={0}>
        <ClanHero clan={clan} busy={busy} act={act} />
      </Enter>
      <Enter index={1}>
        <ClanMembers clan={clan} busy={busy} act={act} />
      </Enter>
      <ErrorText>{error}</ErrorText>
      <Button title={S.clan.leave} variant="pink" small loading={busy === 'leave'} onPress={leave} />
    </>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  center: { paddingVertical: 40, alignItems: 'center' },
});
