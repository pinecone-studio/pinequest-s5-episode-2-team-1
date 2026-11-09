import { CLAN_CODE_LENGTH, CLAN_ICONS, type ClanIcon, clanTitle, defaultClanName, normalizeClanName } from '@shared/clan';
import type { ClanBody, MyClanResponse } from '@shared/types';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { api } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { Button } from '@/components/Button';
import { ClanEmblem, EmblemPicker } from '@/components/clan/ClanEmblem';
import { Enter } from '@/components/pixel';
import { Card, ErrorText, Muted, TextField } from '@/components/ui';
import { colors, fonts, radius } from '@/constants/theme';
import { S } from '@/i18n/strings';
import type { ClanAct } from '@/lib/clan';

/** Уулгүй үед: байгуулах (нэр нь "<миний нэрийн>"), эсвэл ангийнхныхаа кодоор нэгдэх. */
export function NoClan({ busy, error, act }: { busy: string | null; error: string; act: ClanAct }) {
  const { me } = useAuth();
  const [name, setName] = useState(() => defaultClanName(me?.name ?? me?.username ?? ''));
  const [icon, setIcon] = useState<ClanIcon>(CLAN_ICONS[0]);
  const [code, setCode] = useState('');
  const clean = normalizeClanName(name);

  async function create() {
    const ok = await act('create', () => api<MyClanResponse>('/clans', { body: { name: clean, icon } satisfies ClanBody }));
    if (ok) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }
  const view = () => {
    if (code.length === CLAN_CODE_LENGTH) router.push(`/uul/${code}`);
  };

  return (
    <>
      <Enter index={0}>
        <Text style={styles.body}>{S.clan.intro}</Text>
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
          <Text style={styles.label}>{S.clan.iconLabel}</Text>
          <EmblemPicker value={icon} onChange={setIcon} />
          <View style={styles.previewRow}>
            <ClanEmblem icon={icon} />
            <Text style={styles.preview} numberOfLines={2}>
              {clanTitle(clean || '…')}
            </Text>
          </View>
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

const styles = StyleSheet.create({
  body: { fontFamily: fonts.medium, fontSize: 16, lineHeight: 23, color: colors.muted },
  cardTitle: { fontFamily: fonts.semibold, fontSize: 18, color: colors.ink },
  label: { fontFamily: fonts.bold, fontSize: 13, color: colors.ink, letterSpacing: 0.3 },
  previewRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  preview: { flexShrink: 1, fontFamily: fonts.bold, fontSize: 17, color: colors.indigo },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
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
});
