import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { Enter, Pop, Sprite } from '@/components/pixel';
import { Screen } from '@/components/ui';
import { fonts, hardShadow, radius } from '@/constants/theme';
import { S } from '@/i18n/strings';
import { OnboardingHeader, ONBOARDING_BG, ONBOARDING_COLORS } from './OnboardingHeader';

const HERO_COLORS = [ONBOARDING_COLORS.yellow, ONBOARDING_COLORS.lavender, '#FF7A62', '#D7E79B', '#E5C7FF'] as const;

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
    <Screen background={ONBOARDING_BG} contentStyle={styles.content}>
      <OnboardingHeader step={step} total={total} onBack={onBack} />

      <Pop trigger={step} from={0.92} key={`q${step}`}>
        <View style={[styles.hero, { backgroundColor: HERO_COLORS[step % HERO_COLORS.length] }]}>
          <View style={styles.heroCopy}>
            <Text style={styles.eyebrow}>{S.onboarding.personalized}</Text>
            <Text accessibilityRole="header" style={styles.bubbleText}>
              {question}
            </Text>
          </View>
          <View style={styles.mascot}>
            <Sprite id="head_idle_112x96" label="Pixel баавгайн толгой" />
          </View>
          <View style={styles.sparkA} />
          <View style={styles.sparkB} />
        </View>
      </Pop>

      <Enter index={1} key={`o${step}`} style={styles.options}>
        {children}
      </Enter>

      <View style={{ flex: 1, minHeight: 12 }} />
      <Button title={nextTitle} variant="ink" disabled={!canNext} loading={busy} onPress={onNext} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingTop: 12, gap: 14 },
  hero: {
    minHeight: 176,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    overflow: 'hidden',
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: ONBOARDING_COLORS.ink,
    padding: 20,
    ...hardShadow(4),
  },
  heroCopy: { flex: 1, gap: 8, zIndex: 2 },
  eyebrow: { fontFamily: fonts.extrabold, fontSize: 11, letterSpacing: 1.1, color: ONBOARDING_COLORS.ink, textTransform: 'uppercase' },
  bubbleText: { fontFamily: fonts.extrabold, fontSize: 24, lineHeight: 29, letterSpacing: -0.5, color: ONBOARDING_COLORS.ink },
  mascot: { width: 112, height: 112, borderRadius: 56, alignItems: 'center', justifyContent: 'center', backgroundColor: ONBOARDING_COLORS.white, borderWidth: 2, borderColor: ONBOARDING_COLORS.ink, overflow: 'hidden', zIndex: 2 },
  sparkA: { position: 'absolute', width: 46, height: 46, borderRadius: 23, right: -12, top: -12, backgroundColor: 'rgba(255,255,255,0.55)' },
  sparkB: { position: 'absolute', width: 18, height: 18, borderRadius: 9, right: 126, bottom: 14, backgroundColor: ONBOARDING_COLORS.white },
  options: { gap: 10 },
});
