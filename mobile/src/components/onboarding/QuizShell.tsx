import { type ReactNode, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { useMe } from '@/auth/AuthContext';
import { SpeechBubble } from '@/components/AuthShell';
import { avatarSprite } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Enter, Pop, Sprite } from '@/components/pixel';
import { Screen } from '@/components/ui';
import { colors } from '@/constants/theme';
import { S } from '@/i18n/strings';
import { FlowTop } from './FlowTop';

/**
 * Onboarding-ийн нэг асуултын хүрээ (Duolingo маягийн): дээр нь бүртгэлтэй ижил буцах + ахицын зурвас, лаванда тойрог
 * дотроос баавгай асуултаа бүртгэлийнхтэй ижил хөөсөөр асууна, доор нь сонголтууд, хамгийн доор Үргэлжлүүлэх.
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
  /** 1-ээс эхэлнэ */
  step: number;
  total?: number;
  question: string;
  onBack?: () => void;
  onNext: () => void;
  canNext: boolean;
  busy?: boolean;
  nextTitle?: string;
  children: ReactNode;
}) {
  return (
    // key: алхам бүр дээрээс эхэлнэ (өмнөх асуултын scroll үлдэхгүй); товч нь доор үргэлж харагдана
    <Screen key={step} contentStyle={styles.content} footer={<Button title={nextTitle} disabled={!canNext} loading={busy} onPress={onNext} />}>
      <FlowTop step={step} total={total} onBack={onBack} />

      <View style={styles.bubbleRow}>
        <View style={styles.head}>
          <WinkingBear />
        </View>
        <Pop trigger={step} from={0.85} style={styles.bubbleWrap}>
          <SpeechBubble tail="left" size="lg">
            {question}
          </SpeechBubble>
        </Pop>
      </View>

      <Enter index={1} style={styles.options}>
        {children}
      </Enter>
    </Screen>
  );
}

/** Асуулт асууж буй баавгай = хэрэглэгчийн өмнөх алхамд сонгосон баавгай; хааяа зүүн нүдээ ирмэнэ (PixelLab wink хөрөг) */
function WinkingBear() {
  const { look } = useMe();
  const reduce = useReducedMotion();
  const [wink, setWink] = useState(false);
  useEffect(() => {
    if (reduce) return;
    let close: ReturnType<typeof setTimeout>;
    const id = setInterval(() => {
      setWink(true);
      close = setTimeout(() => setWink(false), 450);
    }, 3200);
    return () => {
      clearInterval(id);
      clearTimeout(close);
    };
  }, [reduce]);
  const portrait = { fur: look.fur ?? 'brown', chest: look.chest ?? true } as const;
  // хоёр frame-ийг хоёуланг нь ачаалж, нэгийг нь нууна: анх ирмэхэд зураг ачаалж анивчихгүй
  return (
    <View style={styles.portrait} accessible accessibilityLabel="Нүдээ ирмэж буй баавгай">
      <Sprite id={avatarSprite({ ...portrait, face: 'calm' }, 160)} style={[styles.portrait, styles.frame, { opacity: wink ? 0 : 1 }]} />
      <Sprite id={avatarSprite({ ...portrait, face: 'wink' }, 160)} style={[styles.portrait, styles.frame, { opacity: wink ? 1 : 0 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingTop: 8, gap: 18 },
  bubbleRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  head: { width: 104, height: 104, borderRadius: 52, backgroundColor: colors.lavender, alignItems: 'center', justifyContent: 'flex-end', overflow: 'hidden' },
  portrait: { width: 104, height: 104 },
  frame: { position: 'absolute', top: 0, left: 0 },
  bubbleWrap: { flex: 1 },
  options: { gap: 10 },
});
