import type { DuelTeam } from '@shared/types';
import { StyleSheet, Text, View } from 'react-native';
import { OptionButton, type OptionState } from '@/components/OptionButton';
import { Card, Muted, ProgressBar } from '@/components/ui';
import { colors, fonts } from '@/constants/theme';
import type { DuelView } from '@/hooks/useDuelSocket';
import { S } from '@/i18n/strings';
import { otherTeam } from '@/lib/duelTeams';

type Tone = 'ok' | 'bad' | null;

/** Асуултын доорх төлөвийн мөр: 1 vs 1-д хэн авсныг, багийн тулаанд хоёр багийн нэмсэн оноог. */
function statusOf(view: DuelView, myId: number, myTeam: DuelTeam): [string | null, Tone] {
  const reveal = view.phase === 'reveal' ? view.reveal : null;
  const my = view.myAnswer;
  if (view.teamSize > 1) {
    if (reveal) {
      const gain = (t: DuelTeam) => (reveal.correct ?? []).filter((id) => view.players.find((p) => p.id === id)?.team === t).length;
      const [mine, theirs] = [gain(myTeam), gain(otherTeam(myTeam))];
      return [S.duel.teamGain(mine, theirs), mine > theirs ? 'ok' : mine < theirs ? 'bad' : null];
    }
    return my ? [S.duel.teamAnswered, my.correct ? 'ok' : 'bad'] : [null, null];
  }
  if (reveal) {
    const name = view.players.find((p) => p.id !== myId)?.name ?? '';
    if (reveal.winnerId === myId) return [S.duel.youGot, 'ok'];
    return reveal.winnerId ? [S.duel.theyGot(name), 'bad'] : [S.duel.nobody, null];
  }
  if (my && !my.correct) return [S.duel.youWrong, 'bad'];
  return view.opponentWrong ? [S.duel.opponentWrong, null] : [null, null];
}

export function DuelQuestion({
  view,
  myId,
  myTeam,
  remainingMs,
  onAnswer,
}: {
  view: DuelView;
  myId: number;
  myTeam: DuelTeam;
  remainingMs: number;
  onAnswer: (choice: number) => void;
}) {
  const q = view.question!;
  const reveal = view.phase === 'reveal' ? view.reveal : null;
  const my = view.myAnswer;
  const locked = !!my || view.phase !== 'question';
  const [status, tone] = statusOf(view, myId, myTeam);

  const stateOf = (i: number): OptionState => {
    if (reveal) {
      if (i === reveal.correctIndex) return 'correct';
      if (my && i === my.choice) return 'wrong';
      return 'dim';
    }
    if (my && i === my.choice) return my.correct ? 'correct' : 'wrong';
    return my ? 'dim' : 'idle';
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
