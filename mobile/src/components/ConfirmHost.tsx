import { useEffect, useRef, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { colors, fonts, radius } from '@/constants/theme';
import { S } from '@/i18n/strings';
import { type ConfirmAsk, setConfirmHost } from '@/lib/confirm';

/** Web-ийн confirm() асуултыг харуулах цонх (lib/confirm). Утсан дээр Alert ашигладаг тул юу ч зурахгүй. */
export function ConfirmHost() {
  const [ask, setAsk] = useState<ConfirmAsk | null>(null);
  const current = useRef<ConfirmAsk | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    setConfirmHost((next) => {
      // Өмнөх асуулт хариугүй үлдэхгүй
      current.current?.resolve(false);
      current.current = next;
      setAsk(next);
    });
    return () => setConfirmHost(null);
  }, []);

  if (!ask) return null;
  const answer = (ok: boolean) => {
    current.current = null;
    ask.resolve(ok);
    setAsk(null);
  };

  return (
    <Modal transparent animationType="fade" visible onRequestClose={() => answer(false)}>
      <Pressable accessibilityLabel={S.common.cancel} style={styles.backdrop} onPress={() => answer(false)}>
        <Pressable accessibilityRole="alert" style={styles.card} onPress={() => {}}>
          <Text style={styles.message}>{ask.message}</Text>
          <View style={styles.actions}>
            <Button title={S.common.cancel} variant="secondary" small onPress={() => answer(false)} style={styles.action} />
            <Button title={ask.yesLabel} variant="primary" small onPress={() => answer(true)} style={styles.action} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: 'rgba(25, 21, 46, 0.45)' },
  card: { width: '100%', maxWidth: 360, gap: 20, padding: 24, borderRadius: radius.card, backgroundColor: colors.white },
  message: { fontFamily: fonts.bold, fontSize: 18, lineHeight: 24, color: colors.ink, textAlign: 'center' },
  actions: { flexDirection: 'row', gap: 10 },
  action: { flex: 1 },
});
