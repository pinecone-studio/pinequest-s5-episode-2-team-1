import type { DuelResponse, JoinDuelBody } from '@shared/types';
import * as Haptics from 'expo-haptics';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { api, errorText } from '@/api/client';
import { ArenaStripes } from '@/components/duel/ArenaStripes';
import { CODE_LENGTH } from '@/components/duel/CodeSlots';
import { CodeTicket } from '@/components/duel/CodeTicket';
import { PixelText } from '@/components/pinecones';
import { Motion, Sprite } from '@/components/pixel';
import { BackButton, Screen } from '@/components/ui';
import { arena, colors } from '@/constants/theme';
import { useLobbyOnce } from '@/hooks/useLobbyOnce';
import { S } from '@/i18n/strings';
import { confirm } from '@/lib/confirm';
import { goBack } from '@/lib/nav';

/**
 * Найзын кодоор орох: arena туузны дээр баавгай тулааны урилгын тасалбараас шагайна. 6 дахь цифр ормогц шууд
 * илгээнэ. Амжилттай бол лобби руу буцна: лобби focus болмогц 1 vs 1 нь өрөө рүү автоматаар орж, багийн тулаанд суудал харагдана.
 */
export default function JoinDuel() {
  const { lobby } = useLobbyOnce();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(c: string) {
    if (c.length !== CODE_LENGTH || busy) return;
    // Өөр тулаанд нэгдэхэд өөрийн нээлттэй сорилт сервер дээр хаагдана: эхлээд асууна.
    if (lobby?.mine?.status === 'open' && !(await confirm(S.duel.replaceMine, S.duel.replaceYes))) return;
    setBusy(true);
    setError('');
    try {
      await api<DuelResponse>('/duels/join', { body: { code: c } satisfies JoinDuelBody });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      goBack('/duel');
    } catch (e) {
      setError(errorText(e));
      setBusy(false);
    }
  }

  const change = (v: string) => {
    setCode(v);
    setError('');
    if (v.length === CODE_LENGTH && v !== code) void submit(v);
  };

  return (
    <Screen background={arena.bg} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar style="light" />
      <View style={styles.band}>
        <ArenaStripes intensity={0.5} />
      </View>
      <View style={styles.header}>
        <BackButton onPress={() => goBack('/duel')} />
        <View accessibilityRole="header">
          <PixelText text={S.duel.joinTitle} px={3} color={colors.white} shadow={colors.violet} />
        </View>
      </View>
      <Motion preset="float" style={styles.bear}>
        <Sprite id="bear_cheer_scarf_180x252" style={styles.bearImg} />
      </Motion>
      <CodeTicket code={code} onChange={change} onSubmit={() => submit(code)} error={error} busy={busy} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  // Screen-ий 20dp padding-ийг давж дэлгэцийн өргөнөөр
  band: { position: 'absolute', top: -20, left: -20, right: -20, height: 300, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  // хөл нь тасалбарын ард нуугдана
  bear: { alignSelf: 'center', marginTop: 8, marginBottom: -54 },
  bearImg: { width: 108, height: 151 },
});
