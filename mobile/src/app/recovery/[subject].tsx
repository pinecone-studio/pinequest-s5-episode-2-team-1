import type { RecoveryAnswerResponse, RecoveryDto, Subject } from '@shared/types';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { ApiError, api, errorText } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { Button } from '@/components/Button';
import { OptionButton, type OptionState } from '@/components/OptionButton';
import { BackButton, Card, ErrorText, ProgressBar, Screen } from '@/components/ui';
import { colors, fonts } from '@/constants/theme';
import { S, subjectNames } from '@/i18n/strings';

/** Сонголтын байрлалыг оролдлого бүрт холино: хариуг байрлалаар нь цээжлэхээс сэргийлнэ. */
function shuffledOrder(n: number): number[] {
  const order = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

/**
 * Нөхөх салаа зам: даалгаварт олон алдсаны дараа алдсан сэдвүүдийн өөр асуултыг бодно. Буруу бол зөв хариу,
 * тайлбарыг хэлэхгүйгээр холилдсон сонголтоор дахин бодуулна; зөв бол тайлбарыг харуулна.
 */
export default function RecoveryScreen() {
  const { subject } = useLocalSearchParams<{ subject: Subject }>();
  const { refreshMe } = useAuth();
  const [recovery, setRecovery] = useState<RecoveryDto | null>(null);
  const [order, setOrder] = useState<number[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  // Шалгасны дараах дүн; "Үргэлжлүүлэх" / "Дахин бодох" дарахад next-ийг харуулна. correctIndex = 2 дахь буруугийн
  // дараа серверээс ирсэн зөв хариу (асуулт ижил сэдвийн өөр асуултаар солигдоно).
  const [verdict, setVerdict] = useState<{ correct: boolean; explanation?: string; correctIndex?: number; next: RecoveryDto } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const show = useCallback((r: RecoveryDto) => {
    setRecovery(r);
    setOrder(shuffledOrder(r.question?.options.length ?? 0));
    setSelected(null);
    setVerdict(null);
  }, []);

  const load = useCallback(async () => {
    setError('');
    try {
      show(await api<RecoveryDto>(`/recovery/${subject}`));
    } catch (e) {
      setError(errorText(e));
    }
  }, [subject, show]);

  useEffect(() => {
    void load();
  }, [load]);

  async function check() {
    if (!recovery?.question || selected === null || busy) return;
    setBusy(true);
    setError('');
    try {
      const r = await api<RecoveryAnswerResponse>(`/recovery/${subject}/answer`, {
        body: { questionId: recovery.question.id, choice: selected },
      });
      setVerdict({ correct: r.correct, explanation: r.explanation, correctIndex: r.correctIndex, next: r.recovery });
      void Haptics.notificationAsync(r.correct ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error);
    } catch (e) {
      // Өөр төхөөрөмж/давхар хүсэлтээр энэ асуулт аль хэдийн давсан: одоогийн төлвийг дахин ачаална
      if (e instanceof ApiError && e.code === 'ALREADY_ANSWERED') return void load();
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  async function backToPath() {
    await refreshMe();
    router.replace('/path');
  }

  const q = recovery?.question;
  const revealed = !!verdict && !verdict.correct && verdict.correctIndex !== undefined;
  const stateOf = (orig: number): OptionState => {
    if (!verdict) return selected === orig ? 'selected' : 'idle';
    if (revealed && orig === verdict.correctIndex) return 'correct';
    if (selected !== orig) return 'dim';
    return verdict.correct ? 'correct' : 'wrong';
  };

  return (
    <Screen>
      <View style={styles.header}>
        <BackButton label={S.recovery.back} onPress={() => void backToPath()} />
        <View style={{ flex: 1 }}>
          <Text style={styles.caption}>{subjectNames[subject] ?? ''}</Text>
          <Text style={styles.title} accessibilityRole="header">
            {S.recovery.title}
          </Text>
        </View>
      </View>

      <ErrorText>{error}</ErrorText>
      {!recovery ? (
        error ? <Button title={S.recovery.back} variant="white" onPress={() => void backToPath()} /> : <ActivityIndicator color={colors.violet} />
      ) : (
        <>
          <Text style={styles.body}>{S.recovery.intro}</Text>
          <ProgressBar value={recovery.answered} max={recovery.total} />
          {recovery.cleared || !q ? (
            <Card>
              <Text style={styles.title}>{S.recovery.doneTitle}</Text>
              <Text style={styles.body}>{S.recovery.doneBody}</Text>
              <Button title={S.recovery.back} variant="lime" onPress={() => void backToPath()} />
            </Card>
          ) : (
            <Card>
              <Text style={styles.caption}>
                {S.recovery.progress(recovery.answered + 1, recovery.total)}
                {q.topic ? ` · ${q.topic.toUpperCase()}` : ''}
              </Text>
              <Text style={styles.prompt} accessibilityRole="header">
                {q.prompt}
              </Text>
              {order.map((orig, i) => (
                <OptionButton
                  key={orig}
                  index={i}
                  label={q.options[orig]}
                  state={stateOf(orig)}
                  disabled={busy || !!verdict}
                  onPress={() => setSelected(orig)}
                />
              ))}
              {verdict ? (
                <>
                  <Text
                    style={[styles.verdict, { color: verdict.correct ? colors.okText : colors.dangerText }]}
                    accessibilityLiveRegion="polite"
                  >
                    {verdict.correct ? S.recovery.correct : revealed ? S.recovery.revealed : S.recovery.wrong}
                  </Text>
                  {verdict.explanation ? <Text style={styles.body}>{verdict.explanation}</Text> : null}
                  <Button
                    title={verdict.correct || revealed ? S.recovery.next : S.recovery.retry}
                    variant={verdict.correct || revealed ? 'lime' : 'primary'}
                    onPress={() => show(verdict.next)}
                  />
                </>
              ) : (
                <Button title={S.recovery.check} variant="primary" loading={busy} disabled={selected === null} onPress={check} />
              )}
            </Card>
          )}
          <Text style={styles.caption}>{S.recovery.note}</Text>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { fontFamily: fonts.bold, fontSize: 24, lineHeight: 31, color: colors.ink },
  prompt: { fontFamily: fonts.bold, fontSize: 22, lineHeight: 30, color: colors.ink },
  body: { fontFamily: fonts.medium, fontSize: 16, lineHeight: 24, color: colors.ink },
  caption: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 18, color: colors.muted },
  verdict: { fontFamily: fonts.extrabold, fontSize: 17, textAlign: 'center' },
});
