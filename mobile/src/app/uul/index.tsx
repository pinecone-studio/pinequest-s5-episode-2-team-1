import { CLAN_CODE_LENGTH, clanTitle, defaultClanName, normalizeClanName, peakProgress } from '@shared/clan';
import type { ClanBody, ClanDto, ClanMemberDto, MyClanResponse } from '@shared/types';
import * as Haptics from 'expo-haptics';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { api, errorText } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { Button } from '@/components/Button';
import { ClanMountain } from '@/components/ClanMountain';
import { FriendRow } from '@/components/FriendRow';
import { Enter } from '@/components/pixel';
import { QrIsland } from '@/components/QrIsland';
import { BackButton, Card, ErrorText, Muted, ProgressBar, Screen, SectionTitle, TextField } from '@/components/ui';
import { colors, fonts, radius } from '@/constants/theme';
import { type } from '@/constants/type';
import { S } from '@/i18n/strings';
import { clanLink, clanQrText, formatClanCode, groupDigits } from '@/lib/clan';
import { confirm } from '@/lib/confirm';
import { usePixelBear } from '@/lib/mock/pixelBear';
import { goBack } from '@/lib/nav';
import { bgById } from '@/lib/pixelBear/catalog';

/** Ангид QR-аа үзүүлж байхад шинэ гишүүд шууд гарч ирэхийн тулд ингэж шинэчилнэ. */
const POLL_MS = 5_000;

/**
 * Миний Уул (Профайл → Уул): Ууланд байхгүй бол байгуулах эсвэл кодоор нэгдэх; байвал Уулын өндөр, дараагийн оргил,
 * энэ 7 хоногт хамгийн их өндөрсгөсөн гишүүд, ангийнхнаа урих код/QR. Эзэн нь нэр, код солих, гишүүн хасна.
 */
export default function ClanScreen() {
  // undefined = ачаалж байна, null = Уулгүй
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

  /** Уулын үйлдэл: амжилттай бол шинэ төлөвийг харуулна. */
  async function act(key: string, fn: () => Promise<MyClanResponse>): Promise<boolean> {
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
  }

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

type Act = (key: string, fn: () => Promise<MyClanResponse>) => Promise<boolean>;

/** Уулгүй үед: байгуулах (нэр нь "<миний нэрийн>"), эсвэл ангийнхныхаа кодоор нэгдэх. */
function NoClan({ busy, error, act }: { busy: string | null; error: string; act: Act }) {
  const { me } = useAuth();
  const [name, setName] = useState(() => defaultClanName(me?.name ?? me?.username ?? ''));
  const [code, setCode] = useState('');
  const clean = normalizeClanName(name);

  async function create() {
    const ok = await act('create', () => api<MyClanResponse>('/clans', { body: { name: clean } satisfies ClanBody }));
    if (ok) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }
  const view = () => {
    if (code.length === CLAN_CODE_LENGTH) router.push(`/uul/${code}`);
  };

  return (
    <>
      <Enter index={0}>
        <Card style={styles.hero}>
          <ClanMountain label={S.clan.title} />
          <Text style={styles.body}>{S.clan.intro}</Text>
        </Card>
      </Enter>

      <Enter index={1}>
        <Card>
          <Text accessibilityRole="header" style={styles.cardTitle}>
            {S.clan.createTitle}
          </Text>
          <TextField
            label={S.clan.nameLabel}
            hint={S.clan.createHint}
            value={name}
            onChangeText={setName}
            autoCapitalize="sentences"
            maxLength={40}
            onSubmitEditing={create}
            returnKeyType="done"
          />
          <Text style={styles.preview} numberOfLines={2}>
            {clanTitle(clean || '…')}
          </Text>
          <Button title={S.clan.create} variant="lemon" loading={busy === 'create'} disabled={!clean} onPress={create} />
          <ErrorText>{error}</ErrorText>
        </Card>
      </Enter>

      <Enter index={2}>
        <Card>
          <Text accessibilityRole="header" style={styles.cardTitle}>
            {S.clan.joinTitle}
          </Text>
          <Muted>{S.clan.joinHint}</Muted>
          <View style={styles.row}>
            <TextInput
              value={code}
              // maxLength тавихгүй: хуваалцсан "482 913"-ийг буулгахад сүүлийн орон тасрахгүй
              onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, CLAN_CODE_LENGTH))}
              onSubmitEditing={view}
              keyboardType="number-pad"
              returnKeyType="go"
              placeholder="000 000"
              placeholderTextColor={colors.mutedIcon}
              accessibilityLabel={S.clan.manualHint}
              style={styles.codeInput}
            />
            <Button title={S.clan.joinButton} small disabled={code.length !== CLAN_CODE_LENGTH} onPress={view} />
          </View>
          <Button title={S.clan.scan} variant="secondary" small onPress={() => router.push({ pathname: '/scan', params: { for: 'uul' } })} />
        </Card>
      </Enter>
    </>
  );
}

function MyClan({ clan, busy, error, act }: { clan: ClanDto; busy: string | null; error: string; act: Act }) {
  const { bgId } = usePixelBear();
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState('');
  const [editing, setEditing] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [note, setNote] = useState('');
  const title = clanTitle(clan.name);
  const { passed, next } = peakProgress(clan.height);
  const base = passed?.height ?? 0;

  async function rename() {
    if (await act('rename', () => api<MyClanResponse>('/clans/mine', { method: 'PATCH', body: { name: normalizeClanName(name) } satisfies ClanBody }))) {
      setRenaming(false);
    }
  }

  async function rotate() {
    if (!(await confirm(S.clan.rotateConfirm, S.clan.rotateYes))) return;
    setNote('');
    if (await act('rotate', () => api<MyClanResponse>('/clans/mine/code', { method: 'POST' }))) setNote(S.clan.rotated);
  }

  async function remove(m: ClanMemberDto) {
    if (!(await confirm(S.clan.removeConfirm(m.name ?? m.username), S.clan.removeYes))) return;
    await act(`remove-${m.code}`, () => api<MyClanResponse>(`/clans/mine/members/${m.code}`, { method: 'DELETE' }));
  }

  async function leave() {
    const ask = clan.members.length <= 1 ? S.clan.leaveLast : clan.isOwner ? S.clan.leaveOwner : S.clan.leaveConfirm;
    if (!(await confirm(ask, S.clan.leaveYes))) return;
    await act('leave', () => api<MyClanResponse>('/clans/mine/leave', { method: 'POST' }));
  }

  async function share() {
    const message = S.clan.shareMessage(clan.name, formatClanCode(clan.code), clanLink(clan.code));
    try {
      await Share.share({ message });
    } catch {
      // Web дээр navigator.share байхгүй байж болно: мессежийг хуулна (болохгүй бол код дэлгэц дээр харагдсаар байна).
      const clipboard = globalThis.navigator?.clipboard;
      if (!clipboard) return;
      try {
        await clipboard.writeText(message);
        setNote(S.clan.copied);
      } catch {
        // хуулж чадсангүй
      }
    }
  }

  return (
    <>
      <Enter index={0}>
        <Card style={styles.hero}>
          <ClanMountain climbers={clan.members.map((m) => m.look)} label={S.clan.mountainLabel(title, clan.height)} />
          {renaming ? (
            <View style={{ gap: 10 }}>
              <TextField label={S.clan.nameLabel} value={name} onChangeText={setName} autoCapitalize="sentences" maxLength={40} autoFocus />
              <Text style={styles.preview} numberOfLines={2}>
                {clanTitle(normalizeClanName(name) || '…')}
              </Text>
              <View style={styles.row}>
                <Button title={S.clan.save} small loading={busy === 'rename'} disabled={!normalizeClanName(name)} onPress={rename} style={{ flex: 1 }} />
                <Button title={S.clan.cancel} variant="white" small onPress={() => setRenaming(false)} style={{ flex: 1 }} />
              </View>
            </View>
          ) : (
            <View style={styles.titleRow}>
              <Text accessibilityRole="header" style={[type.h2, { flex: 1 }]} numberOfLines={2}>
                {title}
              </Text>
              {clan.isOwner ? (
                <Button
                  title={S.clan.rename}
                  variant="ghost"
                  small
                  onPress={() => {
                    setName(clan.name);
                    setRenaming(true);
                  }}
                />
              ) : null}
            </View>
          )}
          <View style={styles.heightRow} accessible accessibilityLabel={`${S.clan.heightLabel}: ${S.clan.height(clan.height)}. ${S.clan.week(clan.weekHeight)}`}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heightLabel}>{S.clan.heightLabel}</Text>
              <Text style={styles.height}>
                {groupDigits(clan.height)}
                <Text style={styles.unit}> м</Text>
              </Text>
            </View>
            <View style={styles.weekChip}>
              <Text style={styles.weekText}>{S.clan.week(clan.weekHeight)}</Text>
            </View>
          </View>
          {next ? (
            <View style={{ gap: 6 }}>
              <ProgressBar value={clan.height - base} max={next.height - base} />
              <Text style={styles.peak}>{S.clan.nextPeak(next.name, next.height, next.height - clan.height)}</Text>
            </View>
          ) : (
            <Text style={styles.peak}>{S.clan.topPeak}</Text>
          )}
          {passed ? <Text style={styles.passed}>{S.clan.passedPeak(passed.name, passed.height)}</Text> : null}
        </Card>
      </Enter>

      <Enter index={1} style={styles.section}>
        <View style={styles.sectionHead}>
          <View style={{ flex: 1 }}>
            <SectionTitle>{S.clan.members(clan.members.length, clan.maxMembers)}</SectionTitle>
          </View>
          {clan.isOwner && clan.members.length > 1 ? (
            <Button title={editing ? S.clan.doneEditing : S.clan.editMembers} variant="ghost" small onPress={() => setEditing((v) => !v)} />
          ) : null}
        </View>
        <Card style={styles.members}>
          {clan.members.map((m, i) => (
            <View key={m.code} style={[styles.member, m.isMe && styles.meRow]}>
              <View style={[styles.rank, i === 0 && m.weekMeters > 0 && styles.rankTop]}>
                <Text style={styles.rankText}>{i + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <FriendRow friend={m} onPress={() => router.push(m.isMe ? '/profile' : `/u/${m.code}`)}>
                {editing && !m.isMe ? (
                  <Button title={S.clan.remove} variant="pink" small loading={busy === `remove-${m.code}`} onPress={() => remove(m)} />
                ) : (
                  <View accessible accessibilityLabel={S.clan.memberLabel(i + 1, m.name ?? m.username, m.weekMeters, m.meters)} style={styles.meters}>
                    {m.owner ? <Text style={styles.owner}>{S.clan.owner}</Text> : null}
                    <Text style={[styles.week, m.weekMeters === 0 && styles.weekNone]}>+{groupDigits(m.weekMeters)} м</Text>
                    <Text style={styles.total}>{S.clan.height(m.meters)}</Text>
                  </View>
                )}
                </FriendRow>
              </View>
            </View>
          ))}
        </Card>
      </Enter>

      <Enter index={2}>
        <Card>
          <Text accessibilityRole="header" style={styles.cardTitle}>
            {S.clan.invite}
          </Text>
          <Muted>{S.clan.inviteHint}</Muted>
          <Text selectable accessibilityLabel={`${S.clan.codeLabel}: ${clan.code.split('').join(' ')}`} style={styles.code}>
            {formatClanCode(clan.code)}
          </Text>
          <View style={styles.row}>
            <Button title={S.clan.share} variant="lemon" small onPress={share} style={{ flex: 1 }} />
            <Button title={showQr ? S.clan.hideQr : S.clan.showQr} variant="secondary" small onPress={() => setShowQr((v) => !v)} style={{ flex: 1 }} />
          </View>
          {showQr ? (
            <QrIsland
              value={clanQrText(clan.code)}
              bg={bgById(bgId)}
              islandHint={S.profile.islandHint}
              qrHint={S.clan.qrHint}
              islandLabel={S.profile.islandLabel}
              qrLabel={S.clan.qrLabel}
            />
          ) : null}
          {clan.isOwner ? <Button title={S.clan.rotate} variant="ghost" small loading={busy === 'rotate'} onPress={rotate} /> : null}
          {note ? <Text style={styles.note}>{note}</Text> : null}
        </Card>
      </Enter>

      <ErrorText>{error}</ErrorText>
      <Button title={S.clan.leave} variant="pink" small loading={busy === 'leave'} onPress={leave} />
    </>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  center: { paddingVertical: 40, alignItems: 'center' },
  hero: { gap: 14 },
  body: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 21, color: colors.ink },
  cardTitle: { fontFamily: fonts.semibold, fontSize: 18, color: colors.ink },
  preview: { fontFamily: fonts.bold, fontSize: 17, color: colors.indigo, textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heightRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  heightLabel: { fontFamily: fonts.bold, fontSize: 13, color: colors.muted },
  height: { fontFamily: fonts.pixelNum, fontSize: 34, lineHeight: 40, color: colors.ink },
  unit: { fontFamily: fonts.bold, fontSize: 20 },
  weekChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: colors.lime, marginBottom: 6 },
  weekText: { fontFamily: fonts.bold, fontSize: 13, color: colors.ink },
  peak: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 19, color: colors.ink },
  passed: { fontFamily: fonts.medium, fontSize: 13, color: colors.okText },
  section: { gap: 10 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  members: { gap: 6, paddingHorizontal: 10 },
  member: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: radius.sm, paddingHorizontal: 4 },
  meRow: { backgroundColor: colors.trackAlt },
  rank: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  rankTop: { backgroundColor: colors.lemon },
  rankText: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
  meters: { alignItems: 'flex-end', gap: 1, minWidth: 58 },
  owner: { fontFamily: fonts.bold, fontSize: 11, color: colors.violet },
  week: { fontFamily: fonts.bold, fontSize: 15, color: colors.okText },
  weekNone: { color: colors.mutedIcon },
  total: { fontFamily: fonts.medium, fontSize: 12, color: colors.muted },
  code: { fontFamily: fonts.pixelNum, fontSize: 30, lineHeight: 36, letterSpacing: 3, color: colors.ink, textAlign: 'center' },
  codeInput: {
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
  note: { fontFamily: fonts.semibold, fontSize: 13, color: colors.okText, textAlign: 'center' },
});
