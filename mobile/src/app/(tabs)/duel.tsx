import type { CreateDuelBody, DuelResponse, DuelSummary, DuelVisibility, JoinDuelBody, LobbyResponse, Subject } from '@shared/types';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { api, errorText } from '@/api/client';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Enter, PressScale, Sprite } from '@/components/pixel';
import { SegmentedTabs } from '@/components/SegmentedTabs';
import { CountPill } from '@/components/StatPill';
import { Card, Chip, ErrorText, Muted, Screen, SectionTitle } from '@/components/ui';
import { colors, fonts, radius, subjectTheme } from '@/constants/theme';
import { type } from '@/constants/type';
import { S, subjectNames } from '@/i18n/strings';
import { confirm } from '@/lib/confirm';
import { usePixelBear } from '@/lib/mock/pixelBear';

const SUBJECTS: Subject[] = ['math', 'mongolian', 'physics'];
const POLL_MS = 3_000;
const CODE_LENGTH = 6;

/** "482913" → "482 913" (уншиж, хэлж өгөхөд амар). */
const formatCode = (code: string) => `${code.slice(0, 3)} ${code.slice(3)}`;

export default function DuelLobby() {
  const [lobby, setLobby] = useState<LobbyResponse | null>(null);
  const [subject, setSubject] = useState<Subject>('math');
  const [stakeText, setStakeText] = useState('1');
  const [visibility, setVisibility] = useState<DuelVisibility>('public');
  const [codeText, setCodeText] = useState('');
  // Кодын алдаа тусдаа: лобби-гийн poll нийтлэг алдааг 3 сек тутам арилгадаг.
  const [codeError, setCodeError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const entered = useRef<number | null>(null);
  const { honey } = usePixelBear();

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
      await api<DuelResponse>('/duels', { body: { subject, stake, visibility } satisfies CreateDuelBody });
    });

  const cancel = (id: number) =>
    run('cancel', async () => {
      await api(`/duels/${id}/cancel`, { method: 'POST' });
    });

  const enter = (id: number) => {
    entered.current = id;
    router.push(`/duel/${id}`);
  };

  // Өөр тулаанд нэгдэхэд өөрийн нээлттэй сорилт сервер дээр хаагдана: эхлээд асууна.
  const leaveMineOk = () => (lobby?.mine?.status === 'open' ? confirm(S.duel.replaceMine, S.duel.replaceYes) : Promise.resolve(true));

  const accept = async (id: number) => {
    if (!(await leaveMineOk())) return;
    await run(`accept-${id}`, async () => {
      await api<DuelResponse>(`/duels/${id}/accept`, { method: 'POST' });
      enter(id);
    });
  };

  const join = async () => {
    if (codeText.length !== CODE_LENGTH || busy !== null || !(await leaveMineOk())) return;
    setBusy('join');
    setCodeError('');
    try {
      const { duel } = await api<DuelResponse>('/duels/join', { body: { code: codeText } satisfies JoinDuelBody });
      setCodeText('');
      enter(duel.id);
      await load();
    } catch (e) {
      setCodeError(errorText(e));
    } finally {
      setBusy(null);
    }
  };

  const share = async (d: DuelSummary) => {
    if (!d.code) return;
    try {
      await Share.share({ message: S.duel.shareMessage(formatCode(d.code), d.subject, d.stake) });
    } catch {
      // Web дээр navigator.share байхгүй байж болно: код дэлгэц дээр харагдсаар байна.
    }
  };

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
  const playing = mine?.status === 'accepted';
  // Сорилт үүсгэж байхад сонгосон хичээлийн хүлээж буй тулаанууд эхэнд гарна.
  const open = mine ? lobby.open : [...lobby.open].sort((a, b) => Number(b.subject === subject) - Number(a.subject === subject));
  const matching = mine ? 0 : lobby.open.filter((d) => d.subject === subject && d.stake <= lobby.maxStake).length;
  return (
    <Screen tabBar>
      <View style={styles.header}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text accessibilityRole="header" style={type.h1}>
            {S.duel.title}
          </Text>
          <Text style={type.small}>{S.duel.hint}</Text>
        </View>
        <CountPill icon="btn_honey_24x24" value={honey} label="Боргоцой" />
      </View>

      {mine ? (
        <Card style={styles.mine}>
          <Text style={styles.cardTitle}>{mine.status === 'accepted' ? S.duel.inProgress : S.duel.mineTitle}</Text>
          <View style={styles.lineRow}>
            <Text style={styles.line}>{subjectNames[mine.subject]} ·</Text>
            <Sprite id="btn_honey_12x12" />
            <Text style={styles.line}>{S.duel.stakeLabel(mine.stake)}</Text>
          </View>
          {mine.status === 'open' ? (
            <>
              {mine.code ? (
                <View style={styles.codeBox}>
                  <Text style={styles.label}>{S.duel.codeLabel}</Text>
                  <Text selectable accessibilityLabel={`${S.duel.codeLabel}: ${mine.code.split('').join(' ')}`} style={styles.code}>
                    {formatCode(mine.code)}
                  </Text>
                  <Text style={styles.hint}>{mine.visibility === 'private' ? S.duel.minePrivate : S.duel.minePublic}</Text>
                  <Button title={S.duel.share} variant="lemon" small onPress={() => share(mine)} />
                </View>
              ) : null}
              <View style={styles.waitingRow}>
                <ActivityIndicator color={colors.violet} />
                <View style={{ flex: 1 }}>
                  <Muted>{S.duel.waitingAccept}</Muted>
                </View>
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
              <Text style={styles.label}>{S.duel.who}</Text>
              <SegmentedTabs
                label={S.duel.who}
                value={visibility}
                onChange={setVisibility}
                options={[
                  { value: 'public', label: S.duel.visPublic },
                  { value: 'private', label: S.duel.visPrivate },
                ]}
              />
              <Text style={styles.hint}>{visibility === 'private' ? S.duel.visPrivateHint : S.duel.visPublicHint}</Text>
              {matching > 0 ? (
                <View style={styles.matching}>
                  <Text style={styles.matchingText}>{S.duel.matching(matching, subject)}</Text>
                </View>
              ) : null}
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

      {playing ? null : (
        <Card>
          <View style={{ gap: 4 }}>
            <Text style={styles.cardTitle}>{S.duel.joinTitle}</Text>
            <Muted>{S.duel.joinHint}</Muted>
          </View>
          <View style={styles.stakeRow}>
            <TextInput
              value={codeText}
              onChangeText={(t) => {
                setCodeText(t.replace(/[^0-9]/g, '').slice(0, CODE_LENGTH));
                setCodeError('');
              }}
              onSubmitEditing={join}
              keyboardType="number-pad"
              returnKeyType="go"
              maxLength={CODE_LENGTH}
              placeholder="000000"
              placeholderTextColor={colors.stone}
              accessibilityLabel={S.duel.joinTitle}
              style={[styles.stakeInput, styles.codeInput, codeError ? { borderColor: colors.dangerText } : null]}
            />
            <Button
              title={S.duel.joinButton}
              small
              disabled={codeText.length !== CODE_LENGTH || busy !== null}
              loading={busy === 'join'}
              onPress={join}
            />
          </View>
          <ErrorText>{codeError}</ErrorText>
        </Card>
      )}

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
  highlight,
  canAfford,
  disabled,
  loading,
  onAccept,
}: {
  index: number;
  duel: DuelSummary;
  highlight: boolean;
  canAfford: boolean;
  disabled: boolean;
  loading: boolean;
  onAccept: () => void;
}) {
  return (
    <Enter index={index} style={[styles.challenge, highlight && styles.challengeMatch]}>
      <Avatar size={52} />
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={styles.name}>{duel.creator.name ?? duel.creator.username}</Text>
        <Muted>@{duel.creator.username} · {S.duel.level(duel.creator.level)}</Muted>
        <View style={[styles.subjectTag, { backgroundColor: subjectTheme[duel.subject].bg }]}>
          <Text style={[styles.subjectTagText, { color: subjectTheme[duel.subject].fg }]}>{subjectNames[duel.subject]}</Text>
        </View>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 8 }}>
        <View style={styles.lineRow}>
          <Sprite id="btn_honey_24x24" />
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
    fontFamily: fonts.pixelNum,
    fontSize: 22,
    color: colors.ink,
    borderWidth: 2,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingVertical: 8,
    backgroundColor: colors.white,
  },
  hint: { fontFamily: fonts.medium, fontSize: 13, color: colors.muted },
  codeBox: { alignItems: 'center', gap: 8, backgroundColor: colors.paper, borderRadius: radius.md, padding: 14 },
  code: { fontFamily: fonts.pixelNum, fontSize: 34, letterSpacing: 4, color: colors.indigo },
  codeInput: { letterSpacing: 6 },
  matching: { backgroundColor: colors.lavender, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 10 },
  matchingText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.indigo },
  challenge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: radius.card,
    padding: 14,
    borderWidth: 2,
    borderColor: colors.white,
  },
  challengeMatch: { borderColor: colors.violet },
  name: { fontFamily: fonts.bold, fontSize: 17, color: colors.ink },
  subjectTag: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: radius.pill },
  subjectTagText: { fontFamily: fonts.bold, fontSize: 12 },
  stake: { fontFamily: fonts.pixelNum, fontSize: 17, color: colors.ink },
  tooHigh: { fontFamily: fonts.semibold, fontSize: 12, color: colors.dangerText, maxWidth: 110, textAlign: 'right' },
});
