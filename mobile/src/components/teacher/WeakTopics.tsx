import type { TopicStatDto } from '@shared/teacher';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { Card, Muted, ProgressBar, SectionTitle } from '@/components/ui';
import { colors, fonts } from '@/constants/theme';
import { T } from '@/i18n/teacher';

/** Хувиар өнгө: 50%-иас доош ягаан (их алддаг), 75% хүртэл шар, дээш ногоон. */
const toneOf = (percent: number) => (percent < 50 ? '#E58FB4' : percent < 75 ? colors.lemon : colors.lime);

/** Ангийн хамгийн их алддаг сэдвүүд; сэдэв бүрээр шууд тэмцээн эхлүүлнэ. */
export function WeakTopics({ topics, onQuiz, busy }: { topics: TopicStatDto[]; onQuiz: (t: TopicStatDto) => void; busy: boolean }) {
  return (
    <Card style={styles.card}>
      <SectionTitle>{T.weakTitle}</SectionTitle>
      {topics.length === 0 ? <Muted>{T.weakEmpty}</Muted> : null}
      {topics.map((t) => (
        <View key={`${t.subject}:${t.topic}`} style={styles.topic}>
          <View style={styles.head}>
            <Text style={styles.name} numberOfLines={2}>
              {t.name}
            </Text>
            <Text style={styles.percent}>{`${t.percent}%`}</Text>
          </View>
          <ProgressBar value={t.percent} max={100} color={toneOf(t.percent)} height={10} />
          <View style={styles.foot}>
            <Text style={styles.meta}>{`${T.subjects[t.subject]} · ${T.weakRow(t.answered)}`}</Text>
            <Button title={T.topicQuiz} variant="ghost" small disabled={busy} onPress={() => onQuiz(t)} />
          </View>
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: 14 },
  topic: { gap: 6 },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  name: { flex: 1, fontFamily: fonts.bold, fontSize: 15, lineHeight: 20, color: colors.ink },
  percent: { fontFamily: fonts.pixelNum, fontSize: 15, color: colors.indigo },
  foot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  meta: { flexShrink: 1, fontFamily: fonts.medium, fontSize: 12, color: colors.muted },
});
