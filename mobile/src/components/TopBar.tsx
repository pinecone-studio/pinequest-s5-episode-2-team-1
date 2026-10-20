import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useAuth } from '@/auth/AuthContext';
import { Avatar } from '@/components/Avatar';
import { CountPill, XpPill } from '@/components/StatPill';
import { usePixelBear } from '@/lib/mock/pixelBear';

/** Нүүр, Сурах зам дээрх дээд мөр: аватар (→ хуанли), XP, дараалал, coin. */
export function TopBar({ xp = 'total', onMap }: { xp?: 'total' | 'level' | 'none'; onMap?: boolean }) {
  const { me } = useAuth();
  const { coins } = usePixelBear();
  if (!me) return null;
  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel="Профайл ба хуанли"
        onPress={() => router.push('/calendar')}
        style={styles.avatarTap}
      >
        <Avatar size={48} border={onMap ? 2 : undefined} />
      </Pressable>
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
  avatarTap: { minWidth: 48, minHeight: 48 },
});
