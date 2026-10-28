import type { HeardFrom, Reason, SelfLevel } from '@shared/onboarding';
import type { MeResponse, OnboardingBody, Subject } from '@shared/types';
import { router } from 'expo-router';
import { useState } from 'react';
import { api, errorText } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { BenefitsStep, GradeStep, HeardStep, LevelStep, ReasonStep, ResultStep } from '@/components/onboarding/QuizSteps';
import { QuizShell } from '@/components/onboarding/QuizShell';
import { SubjectPick, SUGGESTED } from '@/components/onboarding/SubjectPick';
import { ErrorText } from '@/components/ui';
import { S, subjectNames } from '@/i18n/strings';
import { usePixelBear } from '@/lib/mock/pixelBear';
import { isOnline } from '@/lib/online';
import { PATH_SUBJECTS } from '@/lib/pixelBear/path';

type Step = 'heard' | 'grade' | 'reason' | 'subject' | 'level' | 'benefits' | 'result';
const STEPS: Step[] = ['heard', 'grade', 'reason', 'subject', 'level', 'benefits', 'result'];

/**
 * 03 · Анх орохдоо асуух асуултууд (Duolingo маягийн): хаанаас сонссон → анги → яагаад → хичээл → түвшин → юу өгөх →
 * дүгнэлт. Хариултыг серверт нэг дор хадгална (анги нь зөвхөн анх удаа хэрэгжинэ); хичээл нь төхөөрөмж дээр Сурах
 * замын хичээл болно. Өмнө нь бөглөсөн хэрэглэгч шинэ төхөөрөмж дээр зөвхөн хичээлээ сонгоно. Сүлжээгүй бол
 * хичээлийг л хадгалж, сүлжээ сэргэхэд дахин асууна.
 */
export default function OnboardingScreen() {
  const { me, setMe } = useAuth();
  const { setSubject } = usePixelBear();
  const [i, setI] = useState(0);
  const [heard, setHeard] = useState<HeardFrom | null>(null);
  const [grade, setGrade] = useState<number | null>(null);
  const [reason, setReason] = useState<Reason | null>(null);
  // өмнө нь бөглөсөн бол тэр хичээлээ (Сурах зам дээр байвал) урьдчилан сонгоно
  const [subject, setPick] = useState<Subject>(() => PATH_SUBJECTS.find((s) => s === me?.subject) ?? SUGGESTED);
  const [level, setLevel] = useState<SelfLevel | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  // нээгдэх үед нэг л удаа шийднэ: дуусгахад setMe(onboarded) болоход гарах шилжилтийн үеэр дэлгэц солигдохгүй
  const [steps] = useState<Step[]>(() => (me?.onboarded === false && isOnline() ? STEPS : ['subject']));
  const step = steps[i];
  const last = i === steps.length - 1;

  async function finish() {
    if (busy) return;
    let body: OnboardingBody | null = null;
    if (steps.length > 1) {
      if (heard === null || grade === null || reason === null || level === null) return;
      body = { heardFrom: heard, grade, reason, subject, level };
    }
    setBusy(true);
    setError('');
    try {
      if (body && isOnline()) setMe((await api<MeResponse>('/me/onboarding', { method: 'PUT', body })).me);
      setSubject(subject);
      router.replace('/');
    } catch (e) {
      setError(`${S.onboarding.saveError} ${errorText(e)}`);
      setBusy(false);
    }
  }

  const answered: Record<Step, boolean> = {
    heard: heard !== null,
    grade: grade !== null,
    reason: reason !== null,
    subject: true,
    level: level !== null,
    benefits: true,
    result: true,
  };
  const question: Record<Step, string> = {
    heard: S.onboarding.heardQ,
    grade: S.onboarding.gradeQ,
    reason: S.onboarding.reasonQ,
    subject: S.onboarding.subjectQ,
    level: S.onboarding.levelQ(subjectNames[subject]),
    benefits: S.onboarding.benefitsQ,
    result: S.onboarding.readyQ,
  };

  return (
    <QuizShell
      step={i}
      total={steps.length}
      question={question[step]}
      onBack={i > 0 ? () => setI(i - 1) : undefined}
      canNext={answered[step]}
      busy={busy}
      nextTitle={last ? S.onboarding.start : S.onboarding.continue}
      onNext={last ? finish : () => setI(i + 1)}
    >
      {step === 'heard' ? <HeardStep value={heard} onChange={setHeard} /> : null}
      {step === 'grade' ? <GradeStep value={grade} onChange={setGrade} /> : null}
      {step === 'reason' ? <ReasonStep value={reason} onChange={setReason} /> : null}
      {step === 'subject' ? <SubjectPick value={subject} onChange={setPick} /> : null}
      {step === 'level' ? <LevelStep value={level} onChange={setLevel} /> : null}
      {step === 'benefits' ? <BenefitsStep /> : null}
      {step === 'result' && level !== null ? <ResultStep level={level} subject={subject} /> : null}
      {error ? <ErrorText>{error}</ErrorText> : null}
    </QuizShell>
  );
}
