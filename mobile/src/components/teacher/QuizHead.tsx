import { clanTitle } from '@shared/clan';
import type { QuizView } from '@shared/teacher';
import { StyleSheet, Text, View } from 'react-native';
import { PixelText } from '@/components/pinecones';
import { colors, fonts } from '@/constants/theme';
import { T } from '@/i18n/teacher';

/** Тэмцээний толгой: "ТЭМЦЭЭН", анги, хичээл. Багш, сурагч хоёулаа. */
export function QuizHead({ view }: { view: QuizView }) {
  return (
    <View style={styles.head}>
      <View accessibilityRole="header">
        <PixelText text="ТЭМЦЭЭН" px={3} color={colors.ink} shadow={colors.stone} />
      </View>
      <Text style={styles.sub}>{`${clanTitle(view.className)} · ${T.subjects[view.subject]}`}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { gap: 6 },
  sub: { fontFamily: fonts.semibold, fontSize: 15, color: colors.muted },
});
