import { useEffect } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BgArt } from '@/components/BgArt';
import { PressScale, Sprite } from '@/components/pixel';
import { PreviewStage } from '@/components/PreviewStage';
import { formatNumber } from '@/components/StatPill';
import { ErrorText } from '@/components/ui';
import { colors, fonts, radius } from '@/constants/theme';
import { S } from '@/i18n/strings';
import { type BuyTarget, type Outfits, useBuy } from './useBuy';

/** Карт дарахад доороос гарах худалдан авах sheet: амьд баавгай дээр урьдчилан харж, авах / өмсөх / тайлах. */
export function BuySheet({ target, visible, outfits, onClose }: { target: BuyTarget; visible: boolean; outfits: Outfits; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const b = useBuy(target, outfits, onClose);
  const { reset } = b;
  // намхан дэлгэцэнд stage-ийг багасгаж товч харагдах зай үлдээнэ
  const stageH = Math.round(Math.min(260, Math.max(170, useWindowDimensions().height * 0.28)));
  useEffect(() => {
    if (visible) reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- нээгдэх бүрт өмнөх мессежийг арилгана
  }, [visible]);

  return (
    <Modal transparent visible={visible} animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.modal}>
        <Pressable accessibilityRole="button" accessibilityLabel={S.common.close} style={styles.backdrop} onPress={onClose} />
        <Animated.View entering={SlideInDown.duration(280)} style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.grabber} />
          <Text accessibilityRole="header" style={styles.title}>
            {b.cur.owned ? S.shop.ownedTitle : S.shop.buyTitle}
          </Text>
          <PreviewStage height={stageH} bg={b.bgDef} items={b.previewItems} alt={S.shop.previewAlt(b.outfitDef.name, b.bgDef.name)} />
          <View style={styles.itemRow}>
            <View style={[styles.thumb, { backgroundColor: b.isBg ? b.bgDef.hex : b.outfitDef.tile }]}>
              {b.isBg ? <BgArt bg={b.bgDef} /> : <Sprite id={b.outfitDef.card} style={{ marginTop: b.outfitDef.imgTop }} />}
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.itemName}>{b.cur.name}</Text>
              <Text style={styles.itemKind}>{b.kind}</Text>
            </View>
            <View style={styles.itemPrice}>
              {b.status.showHoney ? <Sprite id="btn_honey_24x24" /> : null}
              <Text style={[b.status.showHoney ? styles.priceNum : styles.priceText, { color: b.status.color }]}>{b.status.text}</Text>
            </View>
          </View>
          {b.message ? (
            <Animated.Text entering={FadeIn} style={styles.message}>
              {b.message}
            </Animated.Text>
          ) : null}
          <ErrorText>{b.error}</ErrorText>
          <PressScale
            accessibilityRole="button"
            accessibilityLabel={b.action.title}
            accessibilityState={{ disabled: b.action.disabled, busy: b.busy }}
            disabled={b.action.disabled || b.busy}
            onPress={b.onAction}
            style={[styles.action, { backgroundColor: b.action.bg, borderColor: b.action.bg === colors.white ? colors.ink : b.action.bg }]}
          >
            {b.busy ? (
              <ActivityIndicator color={b.action.fg} />
            ) : b.buying ? (
              <>
                <Text style={[styles.actionText, { color: b.action.fg }]}>{S.shop.buy}</Text>
                <Sprite id="btn_honey_24x24" />
                <Text style={[styles.actionNum, { color: b.action.fg }]}>{formatNumber(b.cur.price)}</Text>
              </>
            ) : (
              <Text style={[styles.actionText, { color: b.action.fg }]}>{b.action.title}</Text>
            )}
          </PressScale>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modal: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(25, 21, 46, 0.45)' },
  sheet: { gap: 14, paddingHorizontal: 20, paddingTop: 10, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet, backgroundColor: colors.white },
  grabber: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: colors.stone },
  title: { fontFamily: fonts.bold, fontSize: 20, color: colors.ink, textAlign: 'center' },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: radius.md, backgroundColor: colors.paper },
  thumb: { width: 64, height: 64, borderRadius: radius.sm, alignItems: 'center', overflow: 'hidden' },
  itemName: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 21, color: colors.ink },
  itemKind: { fontFamily: fonts.medium, fontSize: 14, color: colors.muted },
  itemPrice: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  priceNum: { fontFamily: fonts.pixelNum, fontSize: 18 },
  priceText: { fontFamily: fonts.semibold, fontSize: 14 },
  // хүрээ нь цагаан sheet дээр цагаан товчийг (Тайлах, Сонгосон) ялгана
  action: { height: 52, flexDirection: 'row', gap: 8, paddingHorizontal: 16, borderWidth: 2, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  actionText: { fontFamily: fonts.bold, fontSize: 16 },
  actionNum: { fontFamily: fonts.pixelNum, fontSize: 17 },
  message: { fontFamily: fonts.semibold, fontSize: 14, color: colors.okText, textAlign: 'center' },
});
