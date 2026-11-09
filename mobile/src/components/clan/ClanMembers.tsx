import type { ClanDto, ClanMemberDto, MyClanResponse } from '@shared/types';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { api } from '@/api/client';
import { Button } from '@/components/Button';
import { FriendRow } from '@/components/FriendRow';
import { Card, SectionTitle } from '@/components/ui';
import { colors, fonts, radius } from '@/constants/theme';
import { S } from '@/i18n/strings';
import { type ClanAct, groupDigits } from '@/lib/clan';
import { confirm } from '@/lib/confirm';

/** Гишүүд энэ 7 хоногт хамгийн их XP авснаар; эзэн нь засах горимд гишүүн хасна. Доор нь урих хуудас руу орох мөр. */
export function ClanMembers({ clan, busy, act }: { clan: ClanDto; busy: string | null; act: ClanAct }) {
  const [editing, setEditing] = useState(false);

  async function remove(m: ClanMemberDto) {
    if (!(await confirm(S.clan.removeConfirm(m.name ?? m.username), S.clan.removeYes))) return;
    await act(`remove-${m.code}`, () => api<MyClanResponse>(`/clans/mine/members/${m.code}`, { method: 'DELETE' }));
  }

  return (
    <View style={styles.section}>
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
            <View style={[styles.rank, i === 0 && m.weekXp > 0 && styles.rankTop]}>
              <Text style={styles.rankText}>{i + 1}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <FriendRow friend={m} onPress={() => router.push(m.isMe ? '/profile' : `/u/${m.code}`)}>
                {editing && !m.isMe ? (
                  <Button title={S.clan.remove} variant="pink" small loading={busy === `remove-${m.code}`} onPress={() => remove(m)} />
                ) : (
                  <View accessible accessibilityLabel={S.clan.memberLabel(i + 1, m.name ?? m.username, m.weekXp, m.xp)} style={styles.points}>
                    {m.owner ? <Text style={styles.owner}>{S.clan.owner}</Text> : null}
                    <Text style={[styles.week, m.weekXp === 0 && styles.weekNone]}>+{groupDigits(m.weekXp)} XP</Text>
                    <Text style={styles.total}>{S.clan.xp(m.xp)}</Text>
                  </View>
                )}
              </FriendRow>
            </View>
          </View>
        ))}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={S.clan.invite}
          onPress={() => router.push('/uul/invite')}
          style={({ pressed }) => [styles.invite, pressed && { opacity: 0.7 }]}
        >
          <View style={styles.plus}>
            <Text style={styles.plusText}>+</Text>
          </View>
          <Text style={styles.inviteText}>{S.clan.invite}</Text>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 10 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  members: { gap: 6, paddingHorizontal: 10 },
  member: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: radius.sm, paddingHorizontal: 4 },
  meRow: { backgroundColor: colors.trackAlt },
  rank: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  rankTop: { backgroundColor: colors.lemon },
  rankText: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
  points: { alignItems: 'flex-end', gap: 1, minWidth: 58 },
  owner: { fontFamily: fonts.bold, fontSize: 11, color: colors.violet },
  week: { fontFamily: fonts.bold, fontSize: 15, color: colors.okText },
  weekNone: { color: colors.mutedIcon },
  total: { fontFamily: fonts.medium, fontSize: 12, color: colors.muted },
  invite: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 10,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.dashed,
  },
  plus: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.lemon },
  plusText: { fontFamily: fonts.extrabold, fontSize: 20, lineHeight: 22, color: colors.ink },
  inviteText: { flex: 1, fontFamily: fonts.bold, fontSize: 15, color: colors.indigo },
  chevron: { fontFamily: fonts.bold, fontSize: 22, color: colors.mutedIcon },
});
