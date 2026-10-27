import { HEARD_FROM, type HeardFrom, type Reason, REASONS, SELF_LEVELS, type SelfLevel } from '@shared/onboarding';
import type { Subject } from '@shared/types';
import { StyleSheet, Text, View } from 'react-native';
import { Sprite } from '@/components/pixel';
import { colors, fonts } from '@/constants/theme';
import { S, subjectNames } from '@/i18n/strings';
import type { SpriteKey } from '@/sprites';
import { Emoji, LevelBars, QuizOption } from './QuizOption';

const HEARD_ICON: Record<HeardFrom, string> = { friends: '👫', teacher: '🧑‍🏫', family: '🏠', social: '📱', tiktok: '🎵', youtube: '▶️', other: '💬' };
const REASON_ICON: Record<Reason, string> = { grades: '📈', exam: '📝', catchup: '🏃', fun: '🎮', compete: '⚔️', other: '💬' };
export const GRADES = [6, 7, 8, 9, 10, 11, 12] as const;
const BENEFIT_ICON: SpriteKey[] = ['icon_star_36x36', 'hud_skull_34x30', 'icon_flame_36x36'];

export function HeardStep({ value, onChange }: { value: HeardFrom | null; onChange: (v: HeardFrom) => void }) {
  return HEARD_FROM.map((k) => (
    <QuizOption key={k} icon={<Emoji>{HEARD_ICON[k]}</Emoji>} label={S.onboarding.heard[k]} selected={value === k} onPress={() => onChange(k)} />
  ));
}

export function GradeStep({ value, onChange }: { value: number | null; onChange: (v: number) => void }) {
  return (
    <>
      <Text style={styles.hint}>{S.onboarding.gradeHint}</Text>
      {GRADES.map((g) => (
        <QuizOption
          key={g}
          icon={
            <View style={[styles.num, value === g && styles.numOn]}>
              <Text style={[styles.numText, value === g && styles.numTextOn]}>{g}</Text>
            </View>
          }
          label={S.onboarding.grade(g)}
          selected={value === g}
          onPress={() => onChange(g)}
        />
      ))}
    </>
  );
}

export function ReasonStep({ value, onChange }: { value: Reason | null; onChange: (v: Reason) => void }) {
  return REASONS.map((k) => (
    <QuizOption key={k} icon={<Emoji>{REASON_ICON[k]}</Emoji>} label={S.onboarding.reason[k]} selected={value === k} onPress={() => onChange(k)} />
  ));
}

export function LevelStep({ value, onChange }: { value: SelfLevel | null; onChange: (v: SelfLevel) => void }) {
  return SELF_LEVELS.map((k) => (
    <QuizOption key={k} icon={<LevelBars n={k} />} label={S.onboarding.level[k]} selected={value === k} onPress={() => onChange(k)} />
  ));
}

/** KUMA юу өгөх вэ: сонголт биш, 3 мөр тайлбар */
export function BenefitsStep() {
  return S.onboarding.benefits.map((b, i) => (
    <View key={b.title} style={[styles.benefit, i > 0 && styles.divider]} accessible accessibilityLabel={`${b.title}. ${b.body}`}>
      <View style={styles.benefitIcon}>
        <Sprite id={BENEFIT_ICON[i]} />
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={styles.benefitTitle}>{b.title}</Text>
        <Text style={styles.benefitBody}>{b.body}</Text>
      </View>
    </View>
  ));
}

/** Хариултаас гарсан дүгнэлт: баавгай баярлан хэлнэ */
export function ResultStep({ level, subject }: { level: SelfLevel; subject: Subject }) {
  return (
    <View style={styles.result}>
      <View style={styles.resultBubble}>
        <Text style={styles.resultText}>{S.onboarding.result(level, subjectNames[subject])}</Text>
      </View>
      <Sprite id="bear_cheer_scarf_180x252" label="Баярлаж буй баавгай" />
    </View>
  );
}

const styles = StyleSheet.create({
  hint: { fontFamily: fonts.medium, fontSize: 15, color: colors.muted },
  num: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.track, alignItems: 'center', justifyContent: 'center' },
  numOn: { backgroundColor: colors.violet },
  numText: { fontFamily: fonts.pixel, fontSize: 18, color: colors.indigo },
  numTextOn: { color: colors.white },
  benefit: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 16 },
  divider: { borderTopWidth: 2, borderTopColor: colors.line },
  benefitIcon: { width: 48, alignItems: 'center' },
  benefitTitle: { fontFamily: fonts.extrabold, fontSize: 18, color: colors.ink },
  benefitBody: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 21, color: colors.muted },
  result: { alignItems: 'center', gap: 8, paddingTop: 8 },
  resultBubble: { backgroundColor: colors.white, borderRadius: 20, borderWidth: 2, borderColor: colors.line, padding: 18 },
  resultText: { fontFamily: fonts.semibold, fontSize: 18, lineHeight: 25, color: colors.ink, textAlign: 'center' },
});
