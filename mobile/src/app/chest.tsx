import type { ChestOpenResponse, Subject } from '@shared/types';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, errorText } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { Button } from '@/components/Button';
import { Sprite } from '@/components/pixel';
import { colors, fonts } from '@/constants/theme';
import { S } from '@/i18n/strings';
import { LOOT_ART } from '@/lib/items';
import { goBack } from '@/lib/nav';

type Phase = 'idle' | 'opening' | 'revealed' | 'error';
/** хайрцаг чичрэх (ms): сервер хариу өгсөн ч энэ дуустал таг нээгдэхгүй */
const SHAKE = 700;

/**
 * Нууц хайрцаг: дарахад чичирч, таг нь нээгдэж, гарсан зүйл дээш хөөрнө. Шагналыг сервер нэг л удаа олгоно (дахин нээх,
 * refresh хийхэд ижил зүйл харагдана); Авах = буцах.
 */
export default function ChestScreen() {
  const { subject, node } = useLocalSearchParams<{ subject: Subject; node: string }>();
  const { me, setMe } = useAuth();
  const insets = useSafeAreaInsets();
  const reduce = useReducedMotion();
  const opened = !!me?.paths[subject]?.chests.includes(Number(node));
  const [phase, setPhase] = useState<Phase>('idle');
  const [loot, setLoot] = useState<ChestOpenResponse | null>(null);
  const [error, setError] = useState('');
  const busy = useRef(false);
  const tilt = useSharedValue(0);
  const rise = useSharedValue(0);

  async function open() {
    if (busy.current) return;
    busy.current = true;
    setPhase('opening');
    setError('');
    if (!reduce && !opened) tilt.value = withSequence(...[6, -6, 8, -8, 5, -5, 0].map((d) => withTiming(d, { duration: SHAKE / 7 })));
    try {
      const [r] = await Promise.all([
        api<ChestOpenResponse>('/bag/chests', { body: { subject, node: Number(node) } }),
        new Promise((done) => setTimeout(done, reduce || opened ? 0 : SHAKE)),
      ]);
      setMe(r.me);
      setLoot(r);
      setPhase('revealed');
      rise.value = reduce || !r.fresh ? 1 : withSpring(1, { damping: 16, stiffness: 110, overshootClamping: true });
      if (r.fresh) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      setError(errorText(e));
      setPhase('error');
    } finally {
      busy.current = false;
    }
  }

  // аль хэдийн нээсэн хайрцаг: гарсан шагналаа шууд харуулна
  useEffect(() => {
    if (opened) void open();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const chestStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${tilt.value}deg` }] }));
  const itemStyle = useAnimatedStyle(() => ({ opacity: rise.value, transform: [{ translateY: (1 - rise.value) * 70 }, { scale: 0.4 + rise.value * 0.6 }] }));
  const revealed = phase === 'revealed' && loot;
  const info = loot ? S.items[loot.kind] : null;

  return (
    <View style={[styles.root, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
      <Text accessibilityRole="header" style={styles.title}>
        {S.chest.title}
      </Text>
      <Text style={styles.sub}>{revealed ? (loot.fresh ? S.chest.got : S.chest.already) : phase === 'opening' ? S.chest.opening : S.chest.tapToOpen}</Text>

      <View style={styles.stage}>
        <View style={styles.glow} />
        {/* гарсан зүйл хайрцгийн дээрх тогтмол зайд хөөрнө (гарчигтай давхцахгүй) */}
        <View style={styles.itemSlot}>
          {revealed && info ? (
            <Animated.View style={[styles.item, itemStyle]} accessible accessibilityLabel={`${info.name} ${S.chest.qty(loot.qty)}`}>
              <Sprite id={LOOT_ART[loot.kind]} />
              <Text style={styles.qty}>{S.chest.qty(loot.qty)}</Text>
            </Animated.View>
          ) : null}
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={S.chest.open} disabled={phase !== 'idle'} onPress={open} style={styles.chestHit}>
          <Animated.View style={chestStyle}>
            <Sprite id={revealed ? 'map_chest_open_168x156' : 'map_chest_160x120'} label={revealed ? S.chest.openAlt : S.chest.closedAlt} />
          </Animated.View>
        </Pressable>
      </View>

      {revealed && info ? (
        <View style={styles.card}>
          <Text style={styles.name}>{info.name}</Text>
          <Text style={styles.desc}>{info.desc}</Text>
        </View>
      ) : null}
      {phase === 'error' ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.actions}>
        {revealed ? (
          <Button title={S.chest.take} variant="lime" onPress={() => goBack('/path')} />
        ) : phase === 'error' ? (
          <Button title={S.common.retry} variant="lime" onPress={open} />
        ) : (
          <Button title={S.chest.open} variant="lime" loading={phase === 'opening'} onPress={open} />
        )}
        {revealed ? null : <Button title={S.chest.back} variant="white" onPress={() => goBack('/path')} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#2A1408', paddingHorizontal: 24, alignItems: 'center' },
  title: { fontFamily: fonts.pixel, fontSize: 26, color: '#FFE3A3', textAlign: 'center' },
  sub: { fontFamily: fonts.semibold, fontSize: 16, color: '#F0D2A2', marginTop: 8, textAlign: 'center' },
  stage: { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center', minHeight: 300 },
  glow: { position: 'absolute', bottom: '18%', width: 260, height: 260, borderRadius: 130, backgroundColor: 'rgba(255,190,80,0.16)' },
  chestHit: { minWidth: 168, minHeight: 156, alignItems: 'center', justifyContent: 'flex-end' },
  itemSlot: { height: 170, justifyContent: 'flex-end', alignItems: 'center', marginBottom: 4 },
  item: { alignItems: 'center', gap: 6 },
  qty: { fontFamily: fonts.extrabold, fontSize: 22, color: colors.white },
  card: { width: '100%', backgroundColor: 'rgba(255,240,210,0.1)', borderColor: '#9A5A22', borderWidth: 2, borderRadius: 16, padding: 16, gap: 6, marginBottom: 16 },
  name: { fontFamily: fonts.extrabold, fontSize: 20, color: '#FFF6E5', textAlign: 'center' },
  desc: { fontFamily: fonts.medium, fontSize: 16, lineHeight: 22, color: '#F0D2A2', textAlign: 'center' },
  error: { fontFamily: fonts.semibold, fontSize: 15, color: '#FFB4A8', textAlign: 'center', marginBottom: 12 },
  actions: { width: '100%', gap: 10 },
});
