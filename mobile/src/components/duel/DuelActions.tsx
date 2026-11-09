import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PressScale, Sprite } from '@/components/pixel';
import { colors, fonts, hardShadow, radius } from '@/constants/theme';
import { D } from '@/i18n/duel';
import { S } from '@/i18n/strings';

/** Лобби-гийн хоёр гол үйлдэл: шинэ тулаан үүсгэх (шар) ба найзын кодоор орох (бараан). Тус бүр өөрийн дэлгэцтэй. */
export function DuelActions({ canCreate }: { canCreate: boolean }) {
  return (
    <View style={styles.row}>
      {canCreate ? (
        <Tile
          dark={false}
          icon={<Sprite id="earn_duel_52x52" style={styles.icon} />}
          title={S.duel.createTitle}
          sub={D.createSub}
          onPress={() => router.push('/duel/new')}
        />
      ) : null}
      <Tile
        dark
        wide={!canCreate}
        icon={<Sprite id="ob_friends_24x24" style={styles.icon} />}
        title={S.duel.joinTitle}
        sub={D.joinSub}
        onPress={() => router.push('/duel/join')}
      />
    </View>
  );
}

/** `wide`: ганцаараа үлдэхэд (миний сорилт хүлээж байхад) нэг мөрөнд намхан харагдана. */
function Tile({ dark, wide, icon, title, sub, onPress }: { dark: boolean; wide?: boolean; icon: ReactNode; title: string; sub: string; onPress: () => void }) {
  const arrow = (
    <View style={[styles.go, dark && styles.goDark]}>
      <Text style={[styles.goText, dark && { color: colors.ink }]}>›</Text>
    </View>
  );
  return (
    <PressScale
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={sub}
      onPress={onPress}
      style={[styles.tile, wide && styles.wide, { backgroundColor: dark ? colors.indigo : colors.lemon }]}
    >
      <View style={styles.top}>
        {icon}
        {wide ? null : arrow}
      </View>
      <View style={wide ? styles.wideText : { gap: 2 }}>
        <Text style={[styles.title, dark && { color: colors.white }]}>{title}</Text>
        <Text style={[styles.sub, dark && styles.subDark]}>{sub}</Text>
      </View>
      {wide ? arrow : null}
    </PressScale>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12 },
  tile: {
    flex: 1,
    minHeight: 150,
    borderRadius: radius.card,
    borderWidth: 3,
    borderColor: colors.ink,
    padding: 14,
    justifyContent: 'space-between',
    gap: 10,
    ...hardShadow(4),
  },
  wide: { minHeight: 0, flexDirection: 'row', alignItems: 'center', gap: 12 },
  wideText: { flex: 1, gap: 2 },
  top: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  icon: { width: 48, height: 48 },
  go: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  goDark: { backgroundColor: colors.lemon },
  goText: { fontFamily: fonts.bold, fontSize: 20, lineHeight: 22, color: colors.lemon, marginTop: -2 },
  title: { fontFamily: fonts.extrabold, fontSize: 17, lineHeight: 21, color: colors.ink },
  sub: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 17, color: colors.ink, opacity: 0.75 },
  subDark: { color: colors.white, opacity: 0.8 },
});
