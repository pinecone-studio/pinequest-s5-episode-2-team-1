import type { TopicStatDto } from '@shared/teacher';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { Card, Chip, ErrorText, Muted, SectionTitle } from '@/components/ui';
import { colors, fonts } from '@/constants/theme';
import { A } from '@/i18n/assignments';

const DAYS = [1, 3, 7];

/** Даалгавар өгөх: сэдэв (холимог эсвэл ангийн сул сэдвүүдээс) ба хугацаа. Сэдвийг эцэг удирдана (сул сэдвээс шууд ирнэ). */
export function AssignForm({
  topics,
  topic,
  onTopic,
  busy,
  error,
  onGive,
}: {
  topics: TopicStatDto[];
  topic: string | null;
  onTopic: (topic: string | null) => void;
  busy: boolean;
  error: string;
  onGive: (days: number) => void;
}) {
  const [days, setDays] = useState(3);
  return (
    <Card style={styles.card}>
      <View style={styles.head}>
        <SectionTitle>{A.title}</SectionTitle>
        <Muted>{A.sub}</Muted>
      </View>
      <Text style={styles.label}>{A.topic}</Text>
      <View style={styles.chips}>
        <Chip label={A.mixed} selected={topic === null} onPress={() => onTopic(null)} />
        {topics.map((t) => (
          <Chip key={t.topic} label={t.name} selected={topic === t.topic} onPress={() => onTopic(t.topic)} />
        ))}
      </View>
      <Text style={styles.label}>{A.due}</Text>
      <View style={styles.chips}>
        {DAYS.map((d) => (
          <Chip key={d} label={A.days(d)} selected={d === days} onPress={() => setDays(d)} />
        ))}
      </View>
      <ErrorText>{error}</ErrorText>
      <Button title={A.give} variant="lemon" loading={busy} onPress={() => onGive(days)} />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12 },
  head: { gap: 2 },
  label: { fontFamily: fonts.bold, fontSize: 13, letterSpacing: 0.3, color: colors.ink },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
