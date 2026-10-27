import { StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { Enter, Sprite } from '@/components/pixel';
import { colors, fonts, radius } from '@/constants/theme';
import type { SpriteKey } from '@/sprites';

/**
 * Даалгавар/тулаан эхлэх боломжгүй үеийн самбар (дайсны хөөсөнд биш, асуултын оронд): тэмдэг, гарчиг, тайлбар, үйлдэл.
 * `tone` = ялсан (ногоон, туг) эсвэл түгжээтэй/алдаа (ягаан).
 */
export function BattleNotice({
  tone,
  title,
  body,
  primary,
  secondary,
}: {
  tone: 'won' | 'locked';
  title: string;
  body: string;
  primary: { title: string; onPress: () => void };
  secondary?: { title: string; onPress: () => void };
}) {
  const won = tone === 'won';
  const icon: SpriteKey = won ? 'map_flag_32x56' : 'tile_step_lock_48x36';
  return (
    <Enter index={0} style={[styles.card, { borderColor: won ? colors.lime : colors.pink }]}>
      <View accessible accessibilityRole="alert" accessibilityLabel={`${title}. ${body}`} style={styles.head}>
        <View style={[styles.badge, { backgroundColor: won ? '#EEF9D2' : '#FBE7F0' }]}>
          <Sprite id={icon} />
        </View>
        <View style={styles.texts}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.body}>{body}</Text>
        </View>
      </View>
      <View style={styles.actions}>
        <Button title={primary.title} variant="lime" onPress={primary.onPress} />
        {secondary ? <Button title={secondary.title} variant="white" onPress={secondary.onPress} /> : null}
      </View>
    </Enter>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 3, padding: 16, gap: 16 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  badge: { width: 64, height: 64, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  texts: { flex: 1, gap: 4 },
  title: { fontFamily: fonts.extrabold, fontSize: 19, lineHeight: 24, color: colors.ink },
  body: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 21, color: colors.muted },
  actions: { gap: 10 },
});
