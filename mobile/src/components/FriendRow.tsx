import type { FriendDto } from '@shared/types';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PressScale, Sprite } from '@/components/pixel';
import { colors, fonts, radius } from '@/constants/theme';
import { S } from '@/i18n/strings';
import { bgById } from '@/lib/pixelBear/catalog';
import { avatarSprite } from '@/components/Avatar';

/** Найз эсвэл хүсэлтийн мөр: баавгайн хөрөг (дэвсгэр өнгөн дээр), нэр, шат, дараалал, баруун талд үйлдэл. */
export function FriendRow({ friend, onPress, children }: { friend: FriendDto; onPress: () => void; children?: ReactNode }) {
  const bg = bgById(friend.look.bg);
  return (
    <View style={styles.row}>
      <PressScale
        accessibilityRole="link"
        accessibilityLabel={`${friend.name ?? friend.username}, @${friend.username}, ${S.friends.meta(friend.level, friend.grade)}, ${S.profile.streak} ${friend.streak}`}
        onPress={onPress}
        style={styles.main}
      >
        <View style={[styles.head, { backgroundColor: bg.hex }]}>
          <Sprite id={avatarSprite(friend.look, 48)} />
        </View>
        <View style={styles.text}>
          <Text style={styles.name} numberOfLines={1}>
            {friend.name ?? friend.username}
          </Text>
          <View style={styles.metaRow}>
            <Text style={styles.meta} numberOfLines={1}>
              @{friend.username} · {S.friends.meta(friend.level, friend.grade)}
            </Text>
            <Sprite id="icon_flame_12x12" />
            <Text style={styles.meta}>{friend.streak}</Text>
          </View>
        </View>
      </PressScale>
      {children ? <View style={styles.actions}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56 },
  head: { width: 56, height: 56, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'flex-end', overflow: 'hidden' },
  text: { flex: 1, gap: 3 },
  name: { fontFamily: fonts.bold, fontSize: 16, color: colors.ink },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  meta: { flexShrink: 1, fontFamily: fonts.medium, fontSize: 13, color: colors.muted },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
