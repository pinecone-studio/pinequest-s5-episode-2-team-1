import type { PlusBoxResponse } from '@shared/types';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, errorText } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { Button } from '@/components/Button';
import { Sprite } from '@/components/pixel';
import { formatNumber } from '@/components/StatPill';
import { colors, fonts } from '@/constants/theme';
import { S } from '@/i18n/strings';
import { usePixelBear } from '@/lib/mock/pixelBear';
import { goBack } from '@/lib/nav';
import { outfitById, type OutfitId } from '@/lib/pixelBear/catalog';

type Phase = 'idle' | 'opening' | 'revealed' | 'error';
const SHAKE = 700;

/**
 * KUMA Plus бэлэг хайрцаг (POST /me/plus-box): дарахад чичирч нээгдээд Plus-ын онцгой хувцаснаас санамсаргүй нэг гарна.
 * Plus төлбөр бүрт нэг хайрцаг. Бүх Plus хувцсыг эзэмшсэн бол оронд нь боргоцой.
 */
export default function PlusBoxScreen() {
  const { me, setMe } = useAuth();
  const bear = usePixelBear();
  const insets = useSafeAreaInsets();
  const reduce = useReducedMotion();
  const boxes = me?.plusBoxes ?? 0;
  const [phase, setPhase] = useState<Phase>('idle');
  const [prize, setPrize] = useState<PlusBoxResponse | null>(null);
  const [error, setError] = useState('');
  const busy = useRef(false);
  const tilt = useSharedValue(0);
  const rise = useSharedValue(0);

  async function open() {
    if (busy.current || boxes <= 0) return;
    busy.current = true;
    setPhase('opening');
    setError('');
    rise.value = 0;
    if (!reduce) tilt.value = withSequence(...[6, -6, 8, -8, 5, -5, 0].map((d) => withTiming(d, { duration: SHAKE / 7 })));
    try {
      const [r] = await Promise.all([api<PlusBoxResponse>('/me/plus-box', { method: 'POST' }), new Promise((done) => setTimeout(done, reduce ? 0 : SHAKE))]);
      setMe(r.me);
      setPrize(r);
      setPhase('revealed');
      rise.value = reduce ? 1 : withSpring(1, { damping: 16, stiffness: 110, overshootClamping: true });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      setError(errorText(e));
      setPhase('error');
    } finally {
      busy.current = false;
    }
  }

  const boxStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${tilt.value}deg` }] }));
  const itemStyle = useAnimatedStyle(() => ({ opacity: rise.value, transform: [{ translateY: (1 - rise.value) * 70 }, { scale: 0.4 + rise.value * 0.6 }] }));
  const revealed = phase === 'revealed' && prize;
  const outfit = revealed && prize.outfit ? outfitById(prize.outfit as OutfitId) : null;

  return (
    <View style={[styles.root, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
      <Text accessibilityRole="header" style={styles.title}>
        {S.plusBox.title}
      </Text>
      <Text style={styles.sub}>
        {revealed ? (outfit ? S.plusBox.got : S.plusBox.coins) : boxes > 0 ? S.plusBox.tapToOpen : S.plusBox.none}
      </Text>

      <View style={styles.stage}>
        <View style={styles.glow} />
        <View style={styles.itemSlot}>
          {revealed ? (
            <Animated.View style={[styles.item, itemStyle]}>
              {outfit ? <Sprite id={outfit.card} label={outfit.name} /> : <Sprite id="btn_honey_36x36" label={S.plusBox.coins} />}
              {outfit ? null : <Text style={styles.qty}>+{formatNumber(prize.coins)}</Text>}
            </Animated.View>
          ) : null}
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={S.chest.open} disabled={phase !== 'idle' || boxes <= 0} onPress={open} style={styles.boxHit}>
          <Animated.View style={boxStyle}>
            <Sprite id={revealed ? 'map_chest_open_168x156' : 'map_chest_160x120'} label={revealed ? S.chest.openAlt : S.chest.closedAlt} />
          </Animated.View>
        </Pressable>
      </View>

      {outfit ? <Text style={styles.name}>{outfit.name}</Text> : null}
      {phase === 'error' ? <Text style={styles.error}>{error}</Text> : null}
      {!revealed && boxes > 0 ? <Text style={styles.left}>{S.plusBox.left(boxes)}</Text> : null}

      <View style={styles.actions}>
        {revealed && outfit ? (
          <Button
            title={S.plusBox.wear}
            variant="lime"
            onPress={() => {
              bear.equipOutfit(outfit.id);
              router.replace('/shop');
            }}
          />
        ) : null}
        {revealed && boxes > 0 ? (
          <Button
            title={S.plusBox.openButton(boxes)}
            variant="lemon"
            onPress={() => {
              setPrize(null);
              setPhase('idle');
            }}
          />
        ) : null}
        {!revealed && boxes > 0 ? <Button title={S.chest.open} variant="lime" loading={phase === 'opening'} onPress={open} /> : null}
        <Button title={revealed ? S.plusBox.done : S.chest.back} variant="white" onPress={() => goBack('/plans')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.indigo, paddingHorizontal: 24, alignItems: 'center' },
  // Pixelify-ийн кирилл Б нь В шиг харагддаг тул энгийн фонт
  title: { fontFamily: fonts.extrabold, fontSize: 26, color: colors.lemon, textAlign: 'center' },
  sub: { fontFamily: fonts.semibold, fontSize: 16, color: colors.lavender, marginTop: 8, textAlign: 'center' },
  stage: { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center', minHeight: 320 },
  glow: { position: 'absolute', bottom: '16%', width: 260, height: 260, borderRadius: 130, backgroundColor: 'rgba(212,245,94,0.14)' },
  boxHit: { minWidth: 168, minHeight: 156, alignItems: 'center', justifyContent: 'flex-end' },
  itemSlot: { height: 190, justifyContent: 'flex-end', alignItems: 'center', marginBottom: 4 },
  item: { alignItems: 'center', gap: 6 },
  qty: { fontFamily: fonts.extrabold, fontSize: 22, color: colors.white },
  name: { fontFamily: fonts.extrabold, fontSize: 22, color: colors.white, textAlign: 'center', marginBottom: 16 },
  left: { fontFamily: fonts.semibold, fontSize: 14, color: colors.lavender, marginBottom: 12 },
  error: { fontFamily: fonts.semibold, fontSize: 15, color: '#FFB4A8', textAlign: 'center', marginBottom: 12 },
  actions: { width: '100%', gap: 10 },
});
