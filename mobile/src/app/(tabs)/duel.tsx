import type { DuelResponse, DuelSummary, LobbyResponse, Subject } from '@shared/types';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { api, errorText } from '@/api/client';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Card, Chip, ErrorText, Muted, Screen, SectionTitle, Title } from '@/components/ui';
import { colors, radius, spacing, subjectColors } from '@/constants/theme';
import { S, subjectIcons, subjectNames } from '@/i18n/strings';

const SUBJECTS: Subject[] = ['math', 'mongolian', 'physics'];
const POLL_MS = 3_000;

export default function DuelLobby() {
  const [lobby, setLobby] = useState<LobbyResponse | null>(null);
  const [subject, setSubject] = useState<Subject>('math');
  const [stakeText, setStakeText] = useState('1');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const entered = useRef<number | null>(null);

  const load = useCallback(async () => {
    try {
      const l = await api<LobbyResponse>('/duels');
      setLobby(l);
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
        <ActivityIndicator color={colors.primary} />
        <ErrorText>{error}</ErrorText>
      </Screen>
    );
  }

  const mine = lobby.mine;
  return (
    <Screen>
      <Title>{S.duel.title}</Title>
      <Muted>{S.duel.hint}</Muted>
      <Text style={styles.points}>🪙 {S.duel.myPoints(lobby.points)}</Text>

      {mine ? (
        <Card style={{ borderWidth: 2, borderColor: colors.primary }}>
          <Text style={styles.cardTitle}>{mine.status === 'accepted' ? S.duel.inProgress : S.duel.mineTitle}</Text>
          <Text style={styles.line}>
            {subjectIcons[mine.subject]} {subjectNames[mine.subject]} · 🪙 {S.duel.stakeLabel(mine.stake)}
          </Text>
          {mine.status === 'open' ? (
            <>
              <View style={styles.waitingRow}>
                <ActivityIndicator color={colors.primary} />
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
              <Chip
                key={s}
                label={`${subjectIcons[s]} ${subjectNames[s]}`}
                selected={subject === s}
                color={subjectColors[s]}
                onPress={() => setSubject(s)}
              />
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
                  style={[styles.stakeInput, stakeInvalid && { borderColor: colors.danger, color: colors.danger }]}
                />
                <StepButton label="+" onPress={() => changeStake(1)} />
              </View>
              <Text style={[styles.hint, stakeInvalid && { color: colors.danger, fontWeight: '700' }]}>
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
      {lobby.open.map((d) => (
        <ChallengeCard
          key={d.id}
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
    <Pressable onPress={onPress} style={({ pressed }) => [styles.step, pressed && { opacity: 0.7 }]} hitSlop={6}>
      <Text style={styles.stepText}>{label}</Text>
    </Pressable>
  );
}

function ChallengeCard({
  duel,
  canAfford,
  disabled,
  loading,
  onAccept,
}: {
  duel: DuelSummary;
  canAfford: boolean;
  disabled: boolean;
  loading: boolean;
  onAccept: () => void;
}) {
  return (
    <Card style={styles.challenge}>
      <Avatar look={duel.creator.avatar} size={52} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.name}>{duel.creator.username}</Text>
        <Muted>{S.duel.level(duel.creator.level)}</Muted>
        <Text style={[styles.line, { color: subjectColors[duel.subject] }]}>
          {subjectIcons[duel.subject]} {subjectNames[duel.subject]}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: spacing.sm }}>
        <Text style={styles.stake}>🪙 {duel.stake}</Text>
        {canAfford ? (
          <Button title={S.duel.accept} small disabled={disabled} loading={loading} onPress={onAccept} />
        ) : (
          <Text style={styles.tooHigh}>{S.duel.tooHighForMe}</Text>
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  center: { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
  points: { fontSize: 17, fontWeight: '800', color: colors.gold },
  cardTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  label: { fontSize: 14, fontWeight: '700', color: colors.muted },
  line: { fontSize: 15, fontWeight: '700', color: colors.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  waitingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  stakeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  step: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: { fontSize: 26, fontWeight: '700', color: colors.primaryDark, lineHeight: 30 },
  stakeInput: {
    flex: 1,
    minWidth: 0,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.card,
  },
  hint: { fontSize: 13, color: colors.muted },
  challenge: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  name: { fontSize: 17, fontWeight: '800', color: colors.text },
  stake: { fontSize: 18, fontWeight: '900', color: colors.gold },
  tooHigh: { fontSize: 12, color: colors.danger, maxWidth: 110, textAlign: 'right' },
});
