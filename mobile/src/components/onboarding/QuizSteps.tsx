import { HEARD_FROM, type HeardFrom, type Reason, REASONS, SELF_LEVELS, type SelfLevel } from '@shared/onboarding';
import type { Subject } from '@shared/types';
import { StyleSheet, Text, View } from 'react-native';
import { SpeechBubble } from '@/components/AuthShell';
import { Sprite } from '@/components/pixel';
import { colors, fonts, radius } from '@/constants/theme';
import { S, subjectNames } from '@/i18n/strings';
import type { SpriteKey } from '@/sprites';
import { LevelBars, QuizOption } from './QuizOption';

// emoji, нимгэн зураастай icon биш: апп-ын од, гал, хуанлитай ижил pixel icon (PixelLab, docs/design/pixel-bear/sprites/ob_*)
const HEARD_ICON: Record<HeardFrom, SpriteKey> = {
  friends: 'ob_friends_24x24',
  teacher: 'ob_teacher_24x24',
  family: 'ob_family_24x24',
  social: 'ob_social_24x24',
  other: 'ob_other_24x24',
};
const REASON_ICON: Record<Reason, SpriteKey> = {
  grades: 'ob_grades_24x24',
  exam: 'ob_exam_24x24',
  catchup: 'ob_catchup_24x24',
  fun: 'ob_fun_24x24',
  compete: 'ob_compete_24x24',
  other: 'ob_other_24x24',
};
export const GRADES = [6, 7, 8, 9, 10, 11, 12] as const;
const BENEFIT_ICON: SpriteKey[] = ['btn_calendar_24x24', 'ob_fun_24x24', 'icon_flame_24x24'];

export function HeardStep({ value, onChange }: { value: HeardFrom | null; onChange: (v: HeardFrom) => void }) {
  return HEARD_FROM.map((k) => (
    <QuizOption key={k} icon={<Sprite id={HEARD_ICON[k]} />} label={S.onboarding.heard[k]} selected={value === k} onPress={() => onChange(k)} />
  ));
}

export function GradeStep({ value, onChange }: { value: number | null; onChange: (v: number) => void }) {
  return (
    <>
      <Text style={styles.hint}>{S.onboarding.gradeHint}</Text>
      {GRADES.map((g) => (
        <QuizOption
          key={g}
          icon={<Text style={styles.numText}>{g}</Text>}
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
    <QuizOption key={k} icon={<Sprite id={REASON_ICON[k]} />} label={S.onboarding.reason[k]} selected={value === k} onPress={() => onChange(k)} />
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
    <View key={b.title} style={styles.benefit} accessible accessibilityLabel={`${b.title}. ${b.body}`}>
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
      <SpeechBubble size="lg">{S.onboarding.result(level, subjectNames[subject])}</SpeechBubble>
      <Sprite id="bear_cheer_scarf_180x252" label="Баярлаж буй баавгай" />
    </View>
  );
}

const styles = StyleSheet.create({
  hint: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 21, color: colors.muted },
  numText: { fontFamily: fonts.pixelNum, fontSize: 16, color: colors.indigo },
  benefit: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 2, borderColor: colors.line },
  benefitIcon: { width: 40, height: 40, borderRadius: radius.sm, backgroundColor: colors.trackAlt, alignItems: 'center', justifyContent: 'center' },
  benefitTitle: { fontFamily: fonts.extrabold, fontSize: 17, color: colors.ink },
  benefitBody: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 21, color: colors.muted },
  result: { alignItems: 'center', gap: 16, paddingTop: 8 },
});
