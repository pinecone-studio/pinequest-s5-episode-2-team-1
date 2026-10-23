import { useLocalSearchParams } from 'expo-router';
import { useRef } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { Button } from '@/components/Button';
import { Pop } from '@/components/pixel';
import { TutorBear } from '@/components/TutorBear';
import { colors, fonts, radius } from '@/constants/theme';
import { useBearTalk } from '@/hooks/useBearTalk';
import { S, subjectNames } from '@/i18n/strings';
import { goBack } from '@/lib/nav';

const SOFT = '#CFC6FF';

/**
 * Алдсан бодлогоо баавгайтай дуугаар ярилцах. `?questionId=` бол тэр бодлогын тухай, үгүй бол сүүлд алдсан
 * бодлогуудын тухай. Баавгай ба хүүхэд ээлжлэн ярина: баавгай дуусмагц mic автоматаар асна.
 */
export default function TutorScreen() {
  const { questionId } = useLocalSearchParams<{ questionId?: string }>();
  const parsed = Number(questionId);
  const talk = useBearTalk(questionId && Number.isInteger(parsed) && parsed > 0 ? parsed : undefined);
  const insets = useSafeAreaInsets();
  const scroll = useRef<ScrollView>(null);

  const bubble =
    talk.phase === 'ended' ? (talk.notice ?? '') : talk.phase === 'connecting' ? S.tutor.connecting : talk.bearText || '…';
  const listening = talk.phase === 'listening';

  return (
    <View style={[styles.root, { paddingTop: insets.top + 4, paddingBottom: insets.bottom + 16 }]}>
      <View style={styles.top}>
        <Pressable accessibilityRole="button" accessibilityLabel={S.common.close} onPress={() => goBack()} style={styles.close}>
          <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={colors.white} strokeWidth={2.6} strokeLinecap="round">
            <Path d="M6 6l12 12M18 6 6 18" />
          </Svg>
        </Pressable>
        <View style={styles.pill}>
          <Text style={styles.pillText}>{talk.topic ? subjectNames[talk.topic.subject] : S.tutor.title}</Text>
        </View>
      </View>

      {talk.topic ? (
        <Text style={styles.topic} numberOfLines={3}>
          {talk.topic.prompt}
        </Text>
      ) : questionId ? null : (
        <Text style={styles.topic}>{S.tutor.recent}</Text>
      )}

      <View style={styles.stage}>
        <Pop trigger={talk.phase} from={0.9} style={styles.bubbleWrap}>
          <View style={styles.bubble}>
            <ScrollView
              ref={scroll}
              style={{ maxHeight: 190 }}
              onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.bubbleText} accessibilityLiveRegion="polite">
                {bubble}
              </Text>
            </ScrollView>
          </View>
        </Pop>
        <View style={styles.circle} />
        <TutorBear phase={talk.phase} mouth={talk.mouth} label={listening ? S.tutor.bearListening : S.tutor.bearTalking} />
      </View>

      <View style={styles.status}>
        {talk.phase === 'connecting' ? (
          <ActivityIndicator color={colors.white} />
        ) : talk.phase !== 'ended' ? (
          <View style={[styles.dot, { backgroundColor: listening ? colors.lime : SOFT }]} />
        ) : null}
        <Text style={styles.statusText}>
          {talk.phase === 'listening' ? S.tutor.listening : talk.phase === 'bear' ? S.tutor.speaking : ''}
        </Text>
      </View>
      {talk.kidText ? (
        <Text style={styles.kid} numberOfLines={3}>
          {S.tutor.you}: {talk.kidText}
        </Text>
      ) : null}

      <View style={styles.actions}>
        {talk.phase === 'ended' ? (
          <>
            <Button title={S.tutor.restart} variant="lime" onPress={talk.restart} />
            <Button title={S.common.back} variant="white" small onPress={() => goBack()} />
          </>
        ) : (
          <>
            {talk.phase === 'bear' ? <Button title={S.tutor.interrupt} variant="lime" onPress={talk.interrupt} /> : null}
            <Button title={S.tutor.finish} variant="white" small onPress={() => goBack()} />
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.indigo, paddingHorizontal: 20 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginLeft: -6 },
  pill: { height: 36, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: colors.white, justifyContent: 'center' },
  pillText: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
  topic: { marginTop: 12, fontFamily: fonts.semibold, fontSize: 16, lineHeight: 22, color: SOFT, textAlign: 'center' },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 8 },
  circle: { position: 'absolute', bottom: 0, width: 250, height: 250, borderRadius: 125, backgroundColor: '#34209A' },
  bubbleWrap: { alignSelf: 'stretch', marginBottom: 14, zIndex: 2 },
  bubble: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: colors.white,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderBottomRightRadius: 22,
    borderBottomLeftRadius: 4,
  },
  bubbleText: { fontFamily: fonts.bold, fontSize: 17, lineHeight: 23, color: colors.ink },
  status: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 28, marginTop: 14 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  statusText: { fontFamily: fonts.bold, fontSize: 15, color: colors.white },
  kid: { marginTop: 6, fontFamily: fonts.medium, fontSize: 14, lineHeight: 19, color: SOFT, textAlign: 'center' },
  actions: { gap: 6, marginTop: 14 },
});
