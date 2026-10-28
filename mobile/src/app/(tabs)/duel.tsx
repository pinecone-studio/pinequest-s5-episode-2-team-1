import type { Subject } from '@shared/types';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '@/auth/AuthContext';
import { Button } from '@/components/Button';
import { ChallengeCard } from '@/components/duel/ChallengeCard';
import { CreateDuelCard } from '@/components/duel/CreateDuelCard';
import { JoinCodeCard } from '@/components/duel/JoinCodeCard';
import { LobbyHero } from '@/components/duel/LobbyHero';
import { SquadRoom } from '@/components/duel/SquadRoom';
import { Sprite } from '@/components/pixel';
import { Card, ErrorText, Muted, Screen, SectionTitle } from '@/components/ui';
import { colors, fonts } from '@/constants/theme';
import { useDuelLobby } from '@/hooks/useDuelLobby';
import { S, subjectNames } from '@/i18n/strings';
import { usePixelBear } from '@/lib/mock/pixelBear';

export default function DuelLobby() {
  const { me } = useAuth();
  const myId = me?.id ?? 0;
  const { honey } = usePixelBear();
  const [subject, setSubject] = useState<Subject>('math');
  const { lobby, busy, error, enter, create, cancel, leaveTeam, switchTeam, accept, join, share } = useDuelLobby();

  if (!lobby) {
    return (
      <Screen contentStyle={styles.center}>
        <ActivityIndicator color={colors.violet} />
        <ErrorText>{error}</ErrorText>
      </Screen>
    );
  }

  const mine = lobby.mine;
  const playing = mine?.status === 'accepted';
  // Сорилт үүсгэж байхад сонгосон хичээлийн хүлээж буй тулаанууд эхэнд гарна.
  const open = mine ? lobby.open : [...lobby.open].sort((a, b) => Number(b.subject === subject) - Number(a.subject === subject));
  const matching = mine ? 0 : lobby.open.filter((d) => d.subject === subject && d.stake <= lobby.maxStake).length;
  return (
    <Screen tabBar>
      <LobbyHero honey={honey} />

      {mine && !playing ? (
        <SquadRoom
          duel={mine}
          myId={myId}
          busy={busy}
          onSwitch={(team) => switchTeam(mine.id, team)}
          onShare={() => share(mine)}
          onCancel={() => cancel(mine.id)}
          onLeave={() => leaveTeam(mine.id)}
        />
      ) : mine ? (
        <Card style={styles.playing}>
          <Text style={styles.title}>{S.duel.inProgress}</Text>
          <View style={styles.lineRow}>
            <Text style={styles.line}>
              {S.duel.modeLabel(mine.teamSize)} · {subjectNames[mine.subject]} ·
            </Text>
            <Sprite id="btn_honey_12x12" />
            <Text style={styles.line}>{S.duel.stakeLabel(mine.stake)}</Text>
          </View>
          <Button title={S.duel.enterRoom} onPress={() => enter(mine.id)} />
        </Card>
      ) : (
        <CreateDuelCard subject={subject} onSubject={setSubject} max={lobby.maxStake} matching={matching} loading={busy === 'create'} onCreate={create} />
      )}

      {playing ? null : <JoinCodeCard busy={busy !== null} loading={busy === 'join'} onJoin={join} />}

      <ErrorText>{error}</ErrorText>

      <SectionTitle>{S.duel.openTitle}</SectionTitle>
      {open.length === 0 ? <Muted>{S.duel.empty}</Muted> : null}
      {open.map((d, i) => (
        <ChallengeCard
          key={d.id}
          index={i}
          duel={d}
          highlight={!mine && d.subject === subject}
          canAfford={d.stake <= lobby.maxStake}
          disabled={playing || busy !== null}
          loading={busy === `accept-${d.id}`}
          onAccept={() => accept(d.id)}
        />
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
  playing: { borderWidth: 3, borderColor: colors.violet },
  title: { fontFamily: fonts.semibold, fontSize: 19, color: colors.ink },
  line: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink },
  lineRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
