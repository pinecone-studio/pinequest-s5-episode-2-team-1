import type { DuelResponse, DuelSummary, LobbyResponse, Subject } from '@shared/types';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native';
import { api, errorText } from '@/api/client';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Enter, PressScale, Sprite } from '@/components/pixel';
import { CountPill } from '@/components/StatPill';
import { Card, Chip, ErrorText, Muted, Screen, SectionTitle } from '@/components/ui';
import { colors, fonts, radius, subjectTheme } from '@/constants/theme';
import { type } from '@/constants/type';
import { S, subjectNames } from '@/i18n/strings';
import { usePixelBear } from '@/lib/mock/pixelBear';

const SUBJECTS: Subject[] = ['math', 'mongolian', 'physics'];
const POLL_MS = 3_000;

export default function DuelLobby() {
  const [lobby, setLobby] = useState<LobbyResponse | null>(null);
  const [subject, setSubject] = useState<Subject>('math');
  const [stakeText, setStakeText] = useState('1');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const entered = useRef<number | null>(null);
  const { coins } = usePixelBear();

  const load = useCallback(async () => {
    try {
      const l = await api<LobbyResponse>('/duels');
      setLobby(l);
      setError('');
      // Үүсгэгч: сорилтыг хүлээн авмагц өрөө рүү автоматаар орно.
      if (l.mine?.status === 'accepted' && entered.current !== l.mine.id) {
        entered.current = l.mine.id;
        router.push(`/duel/${l.mine.id}`);
      }
    } catch (e) {
      setError(errorText(e));
    }
  }, []);

  // Жагсаалт 3 секунд тутам шинэчлэгдэнэ (зөвхөн энэ tab нээлттэй үед).
  useFocusEffect(
    useCallback(() => {
      void load();
      const timer = setInterval(load, POLL_MS);
      return () => clearInterval(timer);
    }, [load]),
  );

  const stake = Number.parseInt(stakeText, 10);
  const max = lobby?.maxStake ?? 0;
  const stakeInvalid = !Number.isInteger(stake) || stake < 1 || stake > max;

  async function run(key: string, fn: () => Promise<void>) {
    setBusy(key);
    setError('');
    try {
      await fn();
      await load();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(null);
    }
  }

  const create = () =>
    run('create', async () => {
      await api<DuelResponse>('/duels', { body: { subject, stake } });
    });

  const cancel = (id: number) =>
    run('cancel', async () => {
      await api(`/duels/${id}/cancel`, { method: 'POST' });
    });

  const accept = (id: number) =>
    run(`accept-${id}`, async () => {
      await api<DuelResponse>(`/duels/${id}/accept`, { method: 'POST' });
      entered.current = id;
      router.push(`/duel/${id}`);
    });

  const changeStake = (delta: number) => setStakeText(String(Math.max(1, (Number.isInteger(stake) ? stake : 1) + delta)));

  if (!lobby) {
    return (
      <Screen contentStyle={styles.center}>
        <ActivityIndicator color={colors.violet} />
        <ErrorText>{error}</ErrorText>
      </Screen>
    );
  }

  const mine = lobby.mine;
  return (
    <Screen tabBar>
      <View style={styles.header}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text accessibilityRole="header" style={type.h1}>
            {S.duel.title}
          </Text>
          <Text style={type.small}>{S.duel.hint}</Text>
        </View>
        <CountPill icon="icon_coin_24x24" value={coins} label="Coin" />
      </View>

      {mine ? (
        <Card style={styles.mine}>
          <Text style={styles.cardTitle}>{mine.status === 'accepted' ? S.duel.inProgress : S.duel.mineTitle}</Text>
          <View style={styles.lineRow}>
            <Text style={styles.line}>{subjectNames[mine.subject]} ·</Text>
            <Sprite id="icon_coin_12x12" />
            <Text style={styles.line}>{S.duel.stakeLabel(mine.stake)}</Text>
          </View>
          {mine.status === 'open' ? (
            <>
              <View style={styles.waitingRow}>
                <ActivityIndicator color={colors.violet} />
                <Muted>{S.duel.waitingAccept}</Muted>
              </View>
              <Button title={S.duel.cancel} variant="secondary" small loading={busy === 'cancel'} onPress={() => cancel(mine.id)} />
            </>
          ) : (
            <Button title={S.duel.enterRoom} onPress={() => router.push(`/duel/${mine.id}`)} />
          )}
        </Card>
      ) : (
        <Card>
          <Text style={styles.cardTitle}>{S.duel.createTitle}</Text>
          <Text style={styles.label}>{S.duel.subject}</Text>
          <View style={styles.chips}>
            {SUBJECTS.map((s) => (
              <Chip key={s} label={subjectNames[s]} selected={subject === s} onPress={() => setSubject(s)} />
            ))}
          </View>
          <Text style={styles.label}>{S.duel.stake}</Text>
          {max < 1 ? (
            <Muted>{S.duel.notEnough}</Muted>
          ) : (
            <>
              <View style={styles.stakeRow}>
                <StepButton label="−" onPress={() => changeStake(-1)} />
                <TextInput
                  value={stakeText}
                  onChangeText={(t) => setStakeText(t.replace(/[^0-9]/g, ''))}
                  keyboardType="number-pad"
                  maxLength={4}
                  accessibilityLabel={S.duel.stake}
                  style={[styles.stakeInput, stakeInvalid && { borderColor: colors.dangerText, color: colors.dangerText }]}
                />
                <StepButton label="+" onPress={() => changeStake(1)} />
              </View>
              <Text style={[styles.hint, stakeInvalid && { color: colors.dangerText, fontFamily: fonts.bold }]}>
                {stakeInvalid && stake > max ? S.duel.stakeTooHigh(max) : S.duel.stakeMax(max)}
              </Text>
              <Button
                title={S.duel.createButton(Number.isInteger(stake) ? stake : 0)}
                disabled={stakeInvalid}
                loading={busy === 'create'}
                onPress={create}
              />
            </>
          )}
        </Card>
      )}

      <ErrorText>{error}</ErrorText>

      <SectionTitle>{S.duel.openTitle}</SectionTitle>
      {lobby.open.length === 0 ? <Muted>{S.duel.empty}</Muted> : null}
      {lobby.open.map((d, i) => (
        <ChallengeCard
          key={d.id}
          index={i}
          duel={d}
          canAfford={d.stake <= lobby.maxStake}
          disabled={!!mine || busy !== null}
          loading={busy === `accept-${d.id}`}
          onAccept={() => accept(d.id)}
        />
      ))}
    </Screen>
  );
}

function StepButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <PressScale accessibilityRole="button" accessibilityLabel={label === '+' ? 'Нэмэх' : 'Хасах'} onPress={onPress} style={styles.step} hitSlop={6}>
      <Text style={styles.stepText}>{label}</Text>
    </PressScale>
  );
}

function ChallengeCard({
  index,
  duel,
  canAfford,
  disabled,
  loading,
  onAccept,
}: {
  index: number;
  duel: DuelSummary;
  canAfford: boolean;
  disabled: boolean;
  loading: boolean;
  onAccept: () => void;
}) {
  return (
    <Enter index={index} style={styles.challenge}>
      <Avatar size={52} />
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={styles.name}>{duel.creator.username}</Text>
        <Muted>{S.duel.level(duel.creator.level)}</Muted>
        <View style={[styles.subjectTag, { backgroundColor: subjectTheme[duel.subject].bg }]}>
          <Text style={[styles.subjectTagText, { color: subjectTheme[duel.subject].fg }]}>{subjectNames[duel.subject]}</Text>
        </View>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 8 }}>
        <View style={styles.lineRow}>
          <Sprite id="icon_coin_24x24" />
          <Text style={styles.stake}>{duel.stake}</Text>
        </View>
        {canAfford ? (
          <Button title={S.duel.accept} small disabled={disabled} loading={loading} onPress={onAccept} />
        ) : (
          <Text style={styles.tooHigh}>{S.duel.tooHighForMe}</Text>
        )}
      </View>
    </Enter>
  );
}

const styles = StyleSheet.create({
  center: { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  mine: { borderWidth: 3, borderColor: colors.violet },
  cardTitle: { fontFamily: fonts.semibold, fontSize: 19, color: colors.ink },
  label: { fontFamily: fonts.bold, fontSize: 12, letterSpacing: 0.8, textTransform: 'uppercase', color: colors.muted },
  line: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink },
  lineRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  waitingRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stakeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  step: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: { fontFamily: fonts.semibold, fontSize: 26, lineHeight: 30, color: colors.ink },
  stakeInput: {
    flex: 1,
    minWidth: 0,
    textAlign: 'center',
    fontFamily: fonts.pixel,
    fontSize: 26,
    color: colors.ink,
    borderWidth: 2,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingVertical: 8,
    backgroundColor: colors.white,
  },
  hint: { fontFamily: fonts.medium, fontSize: 13, color: colors.muted },
  challenge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: radius.card,
    padding: 14,
  },
  name: { fontFamily: fonts.bold, fontSize: 17, color: colors.ink },
  subjectTag: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: radius.pill },
  subjectTagText: { fontFamily: fonts.bold, fontSize: 12 },
  stake: { fontFamily: fonts.pixel, fontSize: 20, color: colors.ink },
  tooHigh: { fontFamily: fonts.semibold, fontSize: 12, color: colors.dangerText, maxWidth: 110, textAlign: 'right' },
});
