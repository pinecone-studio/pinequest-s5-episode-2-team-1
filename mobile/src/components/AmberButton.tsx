import type { HintResponse } from '@shared/types';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { api, errorText } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { Sprite } from '@/components/pixel';
import { colors, fonts, radius } from '@/constants/theme';
import { S } from '@/i18n/strings';

/**
 * Хувын болор (нууц хайрцгаас): асуултын 2 буруу хариултыг нууна. Сервер нэг асуултад нэг л удаа зарцуулна; цүнхэнд
 * болор байхгүй эсвэл хариулсан бол харагдахгүй.
 */
export function AmberButton({
  taskId,
  questionId,
  onHide,
  onError,
}: {
  taskId: number;
  questionId: number;
  onHide: (hide: number[]) => void;
  onError: (message: string) => void;
}) {
  const { me, setMe } = useAuth();
  const [busy, setBusy] = useState(false);
  const count = me?.bag.amber ?? 0;
  if (!me || count <= 0) return null;

  async function use() {
    if (busy || !me) return;
    setBusy(true);
    try {
      const r = await api<HintResponse>('/bag/amber', { body: { taskId, questionId } });
      setMe({ ...me, bag: r.bag });
      onHide(r.hide);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {
      onError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${S.items.useAmber(count)}. ${S.items.amber.desc}`}
      accessibilityState={{ busy }}
      onPress={use}
      style={({ pressed }) => [styles.btn, pressed && styles.pressed]}
    >
      {busy ? <ActivityIndicator color={colors.ink} /> : <Sprite id="item_amber_15x30" />}
      <Text style={styles.text}>{S.items.useAmber(count)}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    alignSelf: 'center',
    minHeight: 56,
    minWidth: 56,
    paddingHorizontal: 18,
    borderRadius: radius.pill,
    backgroundColor: '#FFE3A3',
    borderWidth: 2,
    borderColor: '#9A5A22',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pressed: { transform: [{ scale: 0.97 }] },
  text: { fontFamily: fonts.bold, fontSize: 16, color: '#5C2F12' },
});
