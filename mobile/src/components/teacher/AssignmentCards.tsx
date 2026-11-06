import type { AssignmentCardDto, AssignmentsResponse } from '@shared/assignment';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { api } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { Button } from '@/components/Button';
import { ProgressBar } from '@/components/ui';
import { colors, fonts, hardShadow, radius } from '@/constants/theme';
import { A, daysUntil } from '@/i18n/assignments';

/** Сурагчийн Анги tab: багшийн өгсөн, хугацаа нь дуусаагүй даалгаврууд (дуусаагүй нь эхэндээ). */
export function AssignmentCards() {
  const { me } = useAuth();
  const [items, setItems] = useState<AssignmentCardDto[]>([]);
  useFocusEffect(
    useCallback(() => {
      api<AssignmentsResponse>('/assignments')
        .then((r) => setItems(r.assignments))
        .catch(() => undefined);
    }, []),
  );
  if (items.length === 0) return null;
  const today = me?.today ?? new Date().toISOString().slice(0, 10);
  const done = (a: AssignmentCardDto) => a.answered >= a.total;
  return (
    <View style={styles.list}>
      {[...items.filter((a) => !done(a)), ...items.filter(done)].map((a) => (
        <View key={a.id} style={[styles.card, done(a) && styles.cardDone]}>
          <View style={styles.head}>
            <Text style={styles.kicker}>{A.banner}</Text>
            <Text style={styles.due}>{A.dueLabel(daysUntil(today, a.dueDay))}</Text>
          </View>
          <Text style={styles.title} numberOfLines={2}>
            {a.topicName ?? A.mixed}
          </Text>
          <ProgressBar value={a.answered} max={a.total} color={done(a) ? colors.lime : colors.violet} height={10} />
          <View style={styles.foot}>
            <Text style={styles.meta}>
              {done(a) ? A.result(a.correct, a.total) : `${A.questions(a.total)} · ${A.progress(a.answered, a.total)}`}
            </Text>
            <Button
              title={done(a) ? A.open : a.answered > 0 ? A.continue : A.start}
              variant={done(a) ? 'white' : 'lemon'}
              small
              onPress={() => router.push(`/assignment/${a.id}`)}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 12 },
  card: {
    gap: 8,
    padding: 16,
    borderRadius: radius.card,
    borderWidth: 2,
    borderColor: colors.ink,
    backgroundColor: colors.white,
    ...hardShadow(4),
  },
  cardDone: { backgroundColor: colors.paper },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  kicker: { fontFamily: fonts.bold, fontSize: 12, letterSpacing: 0.6, textTransform: 'uppercase', color: colors.indigo },
  due: { fontFamily: fonts.semibold, fontSize: 12, color: colors.muted },
  title: { fontFamily: fonts.extrabold, fontSize: 19, lineHeight: 24, color: colors.ink },
  foot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  meta: { flexShrink: 1, fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
});
