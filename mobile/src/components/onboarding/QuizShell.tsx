import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { AnimatedBar, Enter, Pop, Sprite } from '@/components/pixel';
import { Screen } from '@/components/ui';
import { colors, fonts, radius } from '@/constants/theme';
import { S } from '@/i18n/strings';

/**
 * Onboarding-ийн нэг асуултын хүрээ (Duolingo маягийн): дээр нь буцах сум ба ахицын зурвас, баавгай асуултаа хөөсөөр
 * асууна, доор нь сонголтууд, хамгийн доор Үргэлжлүүлэх. `step` солигдох бүрт хөөс, сонголтууд дахин орж ирнэ.
 */
export function QuizShell({
  step,
  total,
  question,
  onBack,
  onNext,
  canNext,
  busy,
  nextTitle = S.onboarding.continue,
  children,
}: {
  step: number;
  total: number;
  question: string;
  onBack?: () => void;
  onNext: () => void;
  canNext: boolean;
  busy?: boolean;
  nextTitle?: string;
  children: ReactNode;
}) {
  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.top}>
        {onBack ? (
          <Pressable accessibilityRole="button" accessibilityLabel={S.onboarding.back} onPress={onBack} style={styles.back} hitSlop={8}>
            <Text style={styles.backGlyph}>←</Text>
          </Pressable>
        ) : (
          <View style={styles.back} />
        )}
        <View style={styles.track} accessible accessibilityLabel={S.onboarding.progress(step + 1, total)}>
          <AnimatedBar value={(step + 1) / total} color={colors.violet} height={14} />
        </View>
      </View>

      <View style={styles.bubbleRow} key={`q${step}`}>
        <Sprite id="head_idle_112x96" label="Pixel баавгайн толгой" />
        <Pop trigger={step} from={0.85} style={styles.bubbleWrap}>
          <View style={styles.bubble}>
            <Text accessibilityRole="header" style={styles.bubbleText}>
              {question}
            </Text>
          </View>
        </Pop>
      </View>

      <Enter index={1} key={`o${step}`} style={styles.options}>
        {children}
      </Enter>

      <View style={{ flex: 1, minHeight: 12 }} />
      <Button title={nextTitle} disabled={!canNext} loading={busy} onPress={onNext} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingTop: 12, gap: 18 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  back: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  backGlyph: { fontFamily: fonts.bold, fontSize: 28, color: colors.mutedIcon },
  track: { flex: 1, height: 14, borderRadius: 7, backgroundColor: colors.track, overflow: 'hidden' },
  bubbleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  bubbleWrap: { flex: 1 },
  bubble: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderBottomLeftRadius: 6,
    borderWidth: 2,
    borderColor: colors.line,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 40,
  },
  bubbleText: { fontFamily: fonts.semibold, fontSize: 17, lineHeight: 23, color: colors.ink },
  options: { gap: 10 },
});
