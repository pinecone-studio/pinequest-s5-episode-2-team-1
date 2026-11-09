import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Sprite } from '@/components/pixel';
import { BackButton } from '@/components/ui';
import { colors, fonts } from '@/constants/theme';
import { P } from '@/i18n/profile';
import { goBack } from '@/lib/nav';
import type { SpriteKey } from '@/sprites';

/** Профайлын дээд мөр (гүйлгэхэд дээр наалдана): буцах, нэр, профайл засах (харандаа), тохиргоо (шүд). */
export function ProfileHeader({ name }: { name: string }) {
  return (
    <View style={styles.bar}>
      <BackButton onPress={() => goBack()} />
      <Text accessibilityRole="header" style={styles.name} numberOfLines={1}>
        {name}
      </Text>
      <IconButton icon="icon_pencil_30x30" label={P.changeLook} onPress={() => router.push('/avatar')} />
      <IconButton icon="icon_gear_30x30" label={P.settings} onPress={() => router.push('/settings')} />
    </View>
  );
}

function IconButton({ icon, label, onPress }: { icon: SpriteKey; label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={4}
      onPress={onPress}
      style={({ pressed }) => [styles.icon, pressed && { opacity: 0.6, transform: [{ scale: 0.92 }] }]}
    >
      <Sprite id={icon} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Screen-ий 20dp padding-ийг давж бүтэн өргөнөөр; доорх контент энэ мөрийн ард гүйлгэгдэнэ
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginHorizontal: -20,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 10,
    backgroundColor: colors.paper,
    borderBottomWidth: 2,
    borderBottomColor: colors.line,
  },
  name: { flex: 1, fontFamily: fonts.extrabold, fontSize: 20, color: colors.ink, textAlign: 'center' },
  icon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
