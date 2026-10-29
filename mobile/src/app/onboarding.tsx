import type { Reason, SelfLevel } from '@shared/onboarding';
import type { MeResponse, OnboardingBody } from '@shared/types';
import { router } from 'expo-router';
import { useState } from 'react';
import { api, errorText } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { OnboardingIntro } from '@/components/onboarding/OnboardingIntro';
import { ONBOARDING_TOTAL_STEPS } from '@/components/onboarding/OnboardingHeader';
import { GradeStep, LevelStep, ReasonStep } from '@/components/onboarding/QuizSteps';
import { QuizShell } from '@/components/onboarding/QuizShell';
import { ErrorText } from '@/components/ui';
import { S } from '@/i18n/strings';
import { usePixelBear } from '@/lib/mock/pixelBear';
import { isOnline } from '@/lib/online';

type QuizStep = 'grade' | 'reason' | 'level';
type Step = 'intro-0' | 'intro-1' | 'intro-2' | QuizStep;
const STEPS: Step[] = ['intro-0', 'intro-1', 'intro-2', 'grade', 'reason', 'level'];

/**
 * Нэг тасралтгүй 7 алхмын урсгал: KUMA-ийн 3 value slide → анги → зорилго → математикийн түвшин → /avatar.
 */
export default function OnboardingScreen() {
  const { me, setMe } = useAuth();
  const { setSubject } = usePixelBear();
  const [i, setI] = useState(0);
  const [grade, setGrade] = useState<number | null>(null);
  const [reason, setReason] = useState<Reason | null>(null);
  const [level, setLevel] = useState<SelfLevel | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const step = STEPS[i];

  async function finish() {
    if (busy || grade === null || reason === null || level === null) return;
    const body: OnboardingBody = { grade, subject: 'math', reason, level };
    setBusy(true);
    setError('');
    try {
      let nextMe = me;
      if (isOnline()) {
        nextMe = (await api<MeResponse>('/me/onboarding', { method: 'PUT', body })).me;
        setMe(nextMe);
      }
      setSubject('math');
      router.replace(nextMe?.profileSet === false ? '/avatar' : '/');
    } catch (e) {
      setError(`${S.onboarding.saveError} ${errorText(e)}`);
      setBusy(false);
    }
  }

  const answered: Record<QuizStep, boolean> = {
    grade: grade !== null,
    reason: reason !== null,
    level: level !== null,
  };
  const question: Record<QuizStep, string> = {
    grade: S.onboarding.gradeQ,
    reason: S.onboarding.reasonQ,
    level: S.onboarding.levelQ('Математик'),
  };

  if (step.startsWith('intro-')) {
    const intro = Number(step.at(-1));
    return <OnboardingIntro index={intro} onBack={i > 0 ? () => setI(i - 1) : undefined} onNext={() => setI(i + 1)} />;
  }
  const quizStep = step as QuizStep;
  const lastQuestion = quizStep === 'level';

  return (
    <QuizShell
      step={i}
      total={ONBOARDING_TOTAL_STEPS}
      question={question[quizStep]}
      onBack={i > 0 ? () => setI(i - 1) : undefined}
      canNext={answered[quizStep]}
      busy={busy}
      onNext={lastQuestion ? finish : () => setI(i + 1)}
    >
      {step === 'grade' ? <GradeStep value={grade} onChange={setGrade} /> : null}
      {step === 'reason' ? <ReasonStep value={reason} onChange={setReason} /> : null}
      {step === 'level' ? <LevelStep value={level} onChange={setLevel} /> : null}
      {error ? <ErrorText>{error}</ErrorText> : null}
    </QuizShell>
  );
}
