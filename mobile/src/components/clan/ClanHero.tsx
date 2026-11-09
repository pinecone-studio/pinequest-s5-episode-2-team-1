import { type ClanIcon, clanTitle, normalizeClanName } from '@shared/clan';
import type { ClanBody, ClanDto, MyClanResponse } from '@shared/types';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { api } from '@/api/client';
import { Button } from '@/components/Button';
import { ClanEmblem, EmblemPicker } from '@/components/clan/ClanEmblem';
import { RaceBox } from '@/components/league/RaceBox';
import { Card, TextField } from '@/components/ui';
import { colors, fonts } from '@/constants/theme';
import { type } from '@/constants/type';
import { S } from '@/i18n/strings';
import type { ClanAct } from '@/lib/clan';

/** Миний ангийн карт: icon ба нэр (эзэн нь солино), энэ 7 хоногийн ба нийт XP, лигийн уралдаан (RaceBox). Зураггүй. */
export function ClanHero({ clan, busy, act }: { clan: ClanDto; busy: string | null; act: ClanAct }) {
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState<ClanIcon>(clan.icon);

  async function rename() {
    if (await act('rename', () => api<MyClanResponse>('/clans/mine', { method: 'PATCH', body: { name: normalizeClanName(name), icon } satisfies ClanBody }))) {
      setRenaming(false);
    }
  }

  return (
    <Card style={styles.card}>
      {renaming ? (
        <View style={{ gap: 10 }}>
          <TextField label={S.clan.nameLabel} value={name} onChangeText={setName} autoCapitalize="sentences" maxLength={40} autoFocus />
          <EmblemPicker value={icon} onChange={setIcon} />
          <Text style={styles.preview} numberOfLines={2}>
            {clanTitle(normalizeClanName(name) || '…')}
          </Text>
          <View style={styles.row}>
            <Button title={S.clan.save} small loading={busy === 'rename'} disabled={!normalizeClanName(name)} onPress={rename} style={{ flex: 1 }} />
            <Button title={S.clan.cancel} variant="white" small onPress={() => setRenaming(false)} style={{ flex: 1 }} />
          </View>
        </View>
      ) : (
        <View style={{ gap: 4 }}>
          <View style={styles.titleRow}>
            <ClanEmblem icon={clan.icon} />
            <Text accessibilityRole="header" style={[type.h2, styles.title]} numberOfLines={2}>
              {clanTitle(clan.name)}
            </Text>
            {clan.isOwner ? (
              <Button
                title={S.clan.rename}
                variant="ghost"
                small
                onPress={() => {
                  setName(clan.name);
                  setIcon(clan.icon);
                  setRenaming(true);
                }}
              />
            ) : null}
          </View>
          <Text style={styles.meta}>{`${S.clan.week(clan.weekXp)} · ${S.clan.total(clan.xp)}`}</Text>
        </View>
      )}
      <RaceBox />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: 20, paddingVertical: 20 },
  preview: { fontFamily: fonts.bold, fontSize: 17, color: colors.indigo, textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { flex: 1, fontSize: 22, lineHeight: 26 },
  meta: { fontFamily: fonts.semibold, fontSize: 15, color: colors.muted },
});
