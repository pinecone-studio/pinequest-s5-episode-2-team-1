import { useState } from 'react';
import { errorText } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { Button } from '@/components/Button';
import { ErrorText } from '@/components/ui';
import { S } from '@/i18n/strings';

/**
 * "Шүүгчээр орох": бүртгэл үүсгэхгүйгээр бүх хувцас, зам, боломж нээлттэй шинэ бүртгэлээр шууд орно (POST /auth/judge).
 * Нэвтэрмэгц _layout нүүр рүү шилжүүлнэ. Сервер дээр JUDGE_LOGIN унтарсан бол алдааг доор нь харуулна.
 */
export function JudgeButton() {
  const { signInAsJudge } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function judge() {
    setBusy(true);
    setError('');
    try {
      await signInAsJudge();
    } catch (e) {
      setError(errorText(e));
      setBusy(false);
    }
  }

  return (
    <>
      <Button title={S.welcome.judge} variant="lime" onPress={judge} loading={busy} />
      <ErrorText>{error}</ErrorText>
    </>
  );
}
