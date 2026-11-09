import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { PixelText } from '@/components/pinecones';
import { Sprite } from '@/components/pixel';
import { colors, fonts, hardShadow, radius } from '@/constants/theme';
import { L } from '@/i18n/league';
import type { SpriteKey } from '@/sprites';

const ICONS: SpriteKey[] = ['nav2_tasks_on_30x30', 'icon_star_24x24', 'nav2_league_on_30x30'];

/**
 * Гарчгийн хажуудах pixel "?" товч: дарвал "Яаж уралдах вэ?" дүрэм доороос гарч ирнэ (даалгавар → 1 зөв = 1 м →
 * 1-р байр дараагийн лигт). Дүрэм дэлгэц дээр байнга байж зай эзлэхгүй.
 */
/** `noClan`: ангигүй бол дүрмийн доор анги үүсгэх / нэгдэх тайлбар. */
export function RulesHelp({ noClan }: { noClan?: boolean }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={L.rulesTitle}
        hitSlop={6}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.help, pressed && styles.helpPressed]}
      >
        <PixelText text="?" px={3} color={colors.indigo} shadow={colors.stone} />
      </Pressable>

      <Modal transparent visible={open} animationType="slide" onRequestClose={close}>
        <Pressable style={styles.scrim} onPress={close} accessibilityLabel={L.close}>
          <Pressable style={styles.sheet} accessibilityViewIsModal onPress={() => undefined}>
            <Text accessibilityRole="header" style={styles.title}>
              {L.rulesTitle}
            </Text>
            {L.rules.map((r, i) => (
              <View key={r.title} style={styles.step} accessible accessibilityLabel={`${i + 1}. ${r.title}. ${r.body}`}>
                <View style={styles.icon}>
                  <Sprite id={ICONS[i]} style={{ width: 30, height: 30 }} />
                </View>
                <View style={styles.texts}>
                  <Text style={styles.stepTitle}>{r.title}</Text>
                  <Text style={styles.stepBody}>{r.body}</Text>
                </View>
              </View>
            ))}
            {noClan ? (
              <View style={styles.note}>
                <Text style={styles.stepTitle}>{L.noClanTitle}</Text>
                <Text style={styles.stepBody}>{L.noClanBody}</Text>
              </View>
            ) : null}
            <Button title={L.gotIt} variant="lemon" onPress={close} />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  help: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 3,
    paddingTop: 3,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.ink,
    backgroundColor: colors.lemon,
    ...hardShadow(3),
  },
  helpPressed: { transform: [{ translateY: 2 }], shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  scrim: { flex: 1, backgroundColor: 'rgba(25,21,46,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.paper, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: 20, paddingBottom: 32, gap: 16, ...hardShadow(4) },
  title: { fontFamily: fonts.extrabold, fontSize: 22, color: colors.ink },
  step: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  icon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.trackAlt },
  texts: { flex: 1, gap: 2 },
  note: { gap: 4, padding: 14, borderRadius: radius.sm, backgroundColor: colors.trackAlt },
  stepTitle: { fontFamily: fonts.bold, fontSize: 16, color: colors.ink },
  stepBody: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 19, color: colors.muted },
});
