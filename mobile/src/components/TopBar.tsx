import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useAuth } from '@/auth/AuthContext';
import { Avatar } from '@/components/Avatar';
import { CountPill, XpPill } from '@/components/StatPill';
import { colors } from '@/constants/theme';
import { S } from '@/i18n/strings';
import { usePixelBear } from '@/lib/mock/pixelBear';

/** Аватар (→ миний профайл); хариулаагүй найзын хүсэлт байвал цэг. */
export function AvatarLink({ size = 48, border, dotBorder = colors.paper }: { size?: number; border?: number; dotBorder?: string }) {
  const { me } = useAuth();
  if (!me) return null;
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={me.friendRequests > 0 ? `${S.profile.open}, ${S.friends.dot(me.friendRequests)}` : S.profile.open}
      onPress={() => router.push('/profile')}
      style={[styles.avatarTap, { minWidth: Math.max(size, 44), minHeight: Math.max(size, 44) }]}
    >
      <Avatar size={size} border={border} look={me.look} />
      {me.friendRequests > 0 ? <View style={[styles.dot, { borderColor: dotBorder }]} /> : null}
    </Pressable>
  );
}

/** Нүүр дээрх дээд мөр: аватар, XP, дараалал, coin. (Сурах замын мөр: MapHeader.) */
export function TopBar({ xp = 'total' }: { xp?: 'total' | 'level' | 'none' }) {
  const { me } = useAuth();
  const { coins } = usePixelBear();
  if (!me) return null;
  return (
    <View style={styles.row}>
      <AvatarLink />
      {xp === 'none' ? null : (
        <XpPill
          text={xp === 'total' ? `${me.xp} XP` : `${me.levelXp}/${me.levelXpNeeded}`}
          value={me.levelXp}
          max={me.levelXpNeeded}
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
  avatarTap: { alignItems: 'center', justifyContent: 'center' },
  // Хариулаагүй найзын хүсэлт
  dot: {
    position: 'absolute',
    right: -1,
    top: -1,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 3,
    backgroundColor: colors.dangerText,
  },
});
