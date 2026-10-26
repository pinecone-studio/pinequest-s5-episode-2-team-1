import { type LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { PressScale } from '@/components/pixel';
import type { ChapterTheme } from '@/constants/chapterTheme';
import { colors, fonts } from '@/constants/theme';

/** Сумны хэмжээ (эргүүлсэн дөрвөлжин) ба popover-ын хажуугийн зай */
const ARROW = 18;
export const POPOVER_INSET = 16;

/**
 * Зангилаа сонгоход яг доор нь гарах Duolingo маягийн popover: хичээлийн нэр, хэддүгээр хичээл, нэг том цагаан
 * «ЭХЛЭХ +XP» товч. Газрын зурагтай хамт гүйлгэгдэнэ; сум нь сонгосон зангилаа руу заана. Өнгө нь бүлгийн theme.
 */
export function NodePopover({
  theme,
  top,
  arrowX,
  title,
  sub,
  action,
  canStart,
  onStart,
  onClose,
  onHeight,
}: {
  theme: ChapterTheme;
  /** scroll контентын дээд захаас (dp) */
  top: number;
  /** сумны төв, popover-ын зүүн захаас (dp) */
  arrowX: number;
  title: string;
  sub: string;
  /** товчны бичвэр (ЭХЛЭХ +50 XP / ТҮГЖЭЭТЭЙ / ДУУССАН) */
  action: string;
  canStart: boolean;
  onStart: () => void;
  /** дэлгэц уншигчийн «буцах» дохиогоор хаана */
  onClose: () => void;
  onHeight: (h: number) => void;
}) {
  return (
    // onLayout энгийн View дээр: Reanimated-ийн Animated.View web дээр onLayout дуудахгүй
    <View
      style={[styles.pos, { top }]}
      onLayout={(e: LayoutChangeEvent) => onHeight(e.nativeEvent.layout.height)}
      accessibilityViewIsModal
      onAccessibilityEscape={onClose}
    >
      <Animated.View entering={FadeIn.duration(160)} exiting={FadeOut.duration(100)}>
        <View style={[styles.arrow, { left: arrowX - ARROW / 2, backgroundColor: theme.banner }]} />
        <View style={[styles.card, { backgroundColor: theme.banner }]}>
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
          <Text style={styles.sub} numberOfLines={2}>
            {sub}
          </Text>
          <PressScale
            accessibilityRole="button"
            accessibilityLabel={`${action}: ${title}`}
            accessibilityState={{ disabled: !canStart }}
            disabled={!canStart}
            onPress={onStart}
            style={[styles.btn, !canStart && styles.btnOff]}
          >
            <Text style={[styles.btnText, { color: canStart ? theme.banner : colors.white }]} maxFontSizeMultiplier={1.3}>
              {action}
            </Text>
          </PressScale>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  pos: { position: 'absolute', left: POPOVER_INSET, right: POPOVER_INSET },
  arrow: { position: 'absolute', top: -ARROW / 2 + 1, width: ARROW, height: ARROW, borderRadius: 3, transform: [{ rotate: '45deg' }] },
  card: { borderRadius: 20, paddingHorizontal: 18, paddingTop: 16, paddingBottom: 18, gap: 4 },
  title: { fontFamily: fonts.bold, fontSize: 19, lineHeight: 24, color: colors.white },
  sub: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 20, color: 'rgba(255,255,255,0.88)', marginBottom: 10 },
  btn: { minHeight: 52, borderRadius: 14, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  btnOff: { backgroundColor: 'rgba(255,255,255,0.22)' },
  btnText: { fontFamily: fonts.extrabold, fontSize: 16, letterSpacing: 0.6 },
});
