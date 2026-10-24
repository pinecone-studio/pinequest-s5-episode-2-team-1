import type { SubjectPath } from '@shared/types';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useAuth } from '@/auth/AuthContext';
import { Avatar } from '@/components/Avatar';
import { CountPill, XpPill } from '@/components/StatPill';
import { colors } from '@/constants/theme';
import { S } from '@/i18n/strings';
import { usePixelBear } from '@/lib/mock/pixelBear';

/**
 * Нүүр, Сурах зам дээрх дээд мөр: аватар (→ миний профайл), XP, дараалал, coin. `path` өгвөл шатны XP-г тэр хичээлийн
 * сурах замаас харуулна (газрын зураг хичээл бүрт тусдаа).
 */
export function TopBar({ xp = 'total', onMap, path }: { xp?: 'total' | 'level' | 'none'; onMap?: boolean; path?: SubjectPath }) {
  const { me } = useAuth();
  const { coins } = usePixelBear();
  if (!me) return null;
  const levelXp = path ? path.nodeXp : me.levelXp;
  const levelXpNeeded = path ? path.nodeXpNeeded : me.levelXpNeeded;
  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={me.friendRequests > 0 ? `${S.profile.open}, ${S.friends.dot(me.friendRequests)}` : S.profile.open}
        onPress={() => router.push('/profile')}
        style={styles.avatarTap}
      >
        <Avatar size={48} border={onMap ? 2 : undefined} />
        {me.friendRequests > 0 ? <View style={styles.dot} /> : null}
      </Pressable>
      {xp === 'none' ? null : (
        <XpPill
          text={xp === 'total' ? `${me.xp} XP` : `${levelXp}/${levelXpNeeded}`}
          value={levelXp}
          max={levelXpNeeded}
        />
      )}
      <View style={{ flex: 1 }} />
      <CountPill icon="icon_flame_24x24" value={me.streak} label="Дараалал" />
      <CountPill icon="icon_coin_24x24" value={coins} label="Coin" />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  avatarTap: { minWidth: 48, minHeight: 48 },
  // Хариулаагүй найзын хүсэлт
  dot: {
    position: 'absolute',
    right: -1,
    top: -1,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: colors.paper,
    backgroundColor: colors.dangerText,
  },
});
