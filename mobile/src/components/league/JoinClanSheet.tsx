import { router } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { Sprite } from '@/components/pixel';
import { Muted } from '@/components/ui';
import { colors, fonts, hardShadow, radius } from '@/constants/theme';
import { L } from '@/i18n/league';

/** Ангигүй үед гарчгийн хажуудах "ангийнхан +" товч: дарвал анги үүсгэх / кодоор нэгдэх хэсэг доороос гарна. */
export function JoinClanSheet() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const go = () => {
    close();
    router.push('/uul');
  };
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={L.noClanTitle}
        hitSlop={6}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.btn, pressed && styles.pressed]}
      >
        <Sprite id="ob_friends_24x24" />
        <View style={styles.plus}>
          <Text style={styles.plusText}>+</Text>
        </View>
      </Pressable>

      <Modal transparent visible={open} animationType="slide" onRequestClose={close}>
        <Pressable style={styles.scrim} onPress={close} accessibilityLabel={L.close}>
          <Pressable style={styles.sheet} accessibilityViewIsModal onPress={() => undefined}>
            <Text accessibilityRole="header" style={styles.title}>
              {L.noClanTitle}
            </Text>
            <Muted>{L.noClanBody}</Muted>
            <Button title={L.toClan} variant="lemon" onPress={go} />
            <Button title={L.toJoin} variant="secondary" onPress={go} />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  // гарчгийн мөрийн баруун захад
  btn: {
    marginLeft: 'auto',
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.ink,
    backgroundColor: colors.white,
    ...hardShadow(3),
  },
  pressed: { transform: [{ translateY: 2 }], shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  plus: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.ink,
    backgroundColor: colors.violet,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusText: { fontFamily: fonts.extrabold, fontSize: 14, lineHeight: 16, color: colors.white },
  scrim: { flex: 1, backgroundColor: 'rgba(25,21,46,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.paper, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: 20, paddingBottom: 32, gap: 14, ...hardShadow(4) },
  title: { fontFamily: fonts.extrabold, fontSize: 22, color: colors.ink },
});
