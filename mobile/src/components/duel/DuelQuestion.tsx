import type { DuelTeam } from '@shared/types';
import { StyleSheet, Text, View } from 'react-native';
import { OptionButton, type OptionState } from '@/components/OptionButton';
import { Card, Muted, ProgressBar } from '@/components/ui';
import { colors, fonts } from '@/constants/theme';
import type { DuelView } from '@/hooks/useDuelSocket';
import { S } from '@/i18n/strings';
import { otherTeam } from '@/lib/duelTeams';

type Tone = 'ok' | 'bad' | null;

/** Асуултын доорх төлөвийн мөр: зөв эсэхийг бүгд хариулах эсвэл хугацаа дуустал хэлэхгүй, дараа нь хоёр талын нэмсэн оноо. */
function statusOf(view: DuelView, myTeam: DuelTeam): [string | null, Tone] {
  const reveal = view.phase === 'reveal' ? view.reveal : null;
  if (!reveal) return view.myAnswer ? [S.duel.answerSent, null] : [null, null];
  const gain = (t: DuelTeam) => (reveal.correct ?? []).filter((id) => view.players.find((p) => p.id === id)?.team === t).length;
  const [mine, theirs] = [gain(myTeam), gain(otherTeam(myTeam))];
  return [(view.teamSize > 1 ? S.duel.teamGain : S.duel.gain)(mine, theirs), mine > theirs ? 'ok' : mine < theirs ? 'bad' : null];
}

export function DuelQuestion({
  view,
  myTeam,
  remainingMs,
  onAnswer,
}: {
  view: DuelView;
  myTeam: DuelTeam;
  remainingMs: number;
  onAnswer: (choice: number) => void;
}) {
  const q = view.question!;
  const reveal = view.phase === 'reveal' ? view.reveal : null;
  const my = view.myAnswer;
  const locked = !!my || view.phase !== 'question';
  const [status, tone] = statusOf(view, myTeam);

  const stateOf = (i: number): OptionState => {
    if (reveal) {
      if (i === reveal.correctIndex) return 'correct';
      if (my && i === my.choice) return 'wrong';
      return 'dim';
    }
    if (my) return i === my.choice ? 'selected' : 'dim';
    return 'idle';
  };

  return (
    <>
      <Card>
        <View style={styles.header}>
          <Muted>{S.duel.questionOf(q.q + 1, q.total)}</Muted>
          {view.phase === 'question' ? (
            <Text style={[styles.timer, remainingMs < 5000 && { color: colors.dangerText }]}>{S.duel.seconds(Math.ceil(remainingMs / 1000))}</Text>
          ) : null}
        </View>
        {view.phase === 'question' ? (
          <ProgressBar value={remainingMs} max={view.questionTotalMs} color={remainingMs < 5000 ? '#E58FB4' : colors.violet} height={8} />
        ) : null}
        <Text style={styles.prompt}>{q.prompt}</Text>
      </Card>
      <View style={{ gap: 8 }}>
        {q.options.map((opt, i) => (
          <OptionButton key={i} index={i} label={opt} state={stateOf(i)} disabled={locked} onPress={() => onAnswer(i)} />
        ))}
      </View>
      {status ? (
        <Text style={[styles.status, tone === 'ok' && { color: colors.okText }, tone === 'bad' && { color: colors.dangerText }]}>{status}</Text>
      ) : null}
      {reveal ? <Muted center>{reveal.explanation}</Muted> : null}
    </>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  timer: { fontFamily: fonts.pixelNum, fontSize: 15, color: colors.ink },
  prompt: { fontFamily: fonts.semibold, fontSize: 21, lineHeight: 28, color: colors.ink },
  status: { fontFamily: fonts.bold, fontSize: 17, color: colors.ink, textAlign: 'center' },
});
