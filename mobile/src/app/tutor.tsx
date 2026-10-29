import { fixTranscript } from '@shared/transcript';
import { useLocalSearchParams } from 'expo-router';
import { type ComponentRef, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { Button } from '@/components/Button';
import { LeafCurtain } from '@/components/LeafCurtain';
import { Sprite } from '@/components/pixel';
import { TutorBear } from '@/components/TutorBear';
import { colors, fonts, radius } from '@/constants/theme';
import { useBearTalk } from '@/hooks/useBearTalk';
import { S, subjectNames } from '@/i18n/strings';
import room from '@/lib/pixelBear/classroom.json';
import { goBack } from '@/lib/nav';
import type { SpriteKey } from '@/sprites';

const SOFT = '#CFC6FF';
const ROOM: SpriteKey = 'classroom_396x864';
const SHADOW: SpriteKey = 'lesson_shadow_108x18';
/** ангийн зургийн дээд мөрийн хана: өндөр дэлгэцэнд зургийн дээгүүр */
const WALL = '#F3D2A9';
const CHALK = '#F4F1E4';
const TOP_BAR = 48;

/**
 * Алдсан бодлогоо баавгайтай дуугаар ярилцах анги (scripts/classroom-sprites.ts, PixelLab). `?questionId=` бол тэр
 * бодлогын тухай, үгүй бол сүүлд алдсан бодлогуудын тухай. Баавгай самбарын өмнө зогсож ярина, яриа нь самбар дээр
 * шохойгоор бичигдэнэ; ээлжлэн ярина: баавгай дуусмагц mic автоматаар асна. Баавгай бэлдэж байх хооронд дөрвөн
 * захаас мөчрүүд орж ирж дэлгэцийг бүрхээд, бэлэн болмогц буцаж татагдана.
 */
export default function TutorScreen() {
  const { questionId } = useLocalSearchParams<{ questionId?: string }>();
  const parsed = Number(questionId);
  const talk = useBearTalk(questionId && Number.isInteger(parsed) && parsed > 0 ? parsed : undefined);
  const insets = useSafeAreaInsets();
  // web/tablet дээр дэлгэц 430px-ийн баганад (_layout) багтана: цонхны биш, энэ дэлгэцийн бодит хэмжээгээр байрлуулна,
  // эс бөгөөс өргөн цонхонд анги томорч самбар дээд захаас гарч, бичиг харагдахгүй болно
  const win = useWindowDimensions();
  const [box, setBox] = useState<{ width: number; height: number } | null>(null);
  const { width, height } = box ?? win;
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const lastHeight = useRef(0);

  // анги: доод захад наалдаж, хэвтээгээр төвлөрнө; дэлгэц өргөн бол бүхэл pixel-ээр биш ч өргөнийг дүүргэнэ
  const k = Math.max(room.size.w * 3, width) / room.size.w;
  const roomLeft = (width - room.size.w * k) / 2;
  const [bx, by, bw, bh] = room.board;
  const boardTop = height - (room.size.h - by) * k;
  const board = {
    left: roomLeft + bx * k,
    bottom: (room.size.h - by - bh) * k,
    width: bw * k,
    height: bh * k,
    // богино дэлгэцэнд самбарын дээд хэсэг дээд мөрний ард орно
    paddingTop: Math.max(10, insets.top + 4 + TOP_BAR - boardTop + 6),
  };

  const chalk =
    talk.phase === 'ended' ? (talk.notice ?? '') : talk.phase === 'tap' ? S.tutor.tapHint : talk.phase === 'connecting' ? '' : fixTranscript(talk.bearText) || '…';
  const listening = talk.phase === 'listening';
  const talking = talk.phase === 'talking';
  const thinking = talk.phase === 'thinking';
  const status = talking
    ? S.tutor.holding
    : listening
      ? talk.hint
        ? S.tutor.holdShort
        : S.tutor.holdTip
      : thinking
        ? S.tutor.thinking
        : S.tutor.speaking;
  const topic = talk.topic ? talk.topic.prompt : questionId ? null : S.tutor.recent;

  return (
    <View
      style={styles.root}
      onLayout={(e) => {
        const { width: w, height: h } = e.nativeEvent.layout;
        if (w !== box?.width || h !== box?.height) setBox({ width: w, height: h });
      }}
    >
      <Sprite id={ROOM} style={{ position: 'absolute', bottom: 0, left: roomLeft, width: room.size.w * k, height: room.size.h * k }} />

      <View style={[styles.board, board]}>
        {topic ? (
          <Text style={styles.topic} numberOfLines={2}>
            {topic}
          </Text>
        ) : null}
        {/* Үг бүр ирэхэд доош автоматаар гүйлгэвэл эхний мөрүүд уншиж амжихаас өмнө алга болдог: самбар дээрээсээ
            бичигдэж, хүүхэд өөрөө гүйлгэнэ. Шинэ ээлж (текст богиноссон) эхлэхэд л дээш нь буцаана. */}
        <ScrollView
          ref={scroll}
          onContentSizeChange={(_, h) => {
            if (h < lastHeight.current) scroll.current?.scrollTo({ y: 0, animated: false });
            lastHeight.current = h;
          }}
          nestedScrollEnabled
          style={styles.scroll}
        >
          <Text style={styles.chalk} accessibilityLiveRegion="polite">
            {chalk}
          </Text>
        </ScrollView>
      </View>

      <View style={[styles.top, { paddingTop: insets.top + 4 }]}>
        <Pressable accessibilityRole="button" accessibilityLabel={S.common.close} onPress={() => goBack()} style={styles.close}>
          <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={colors.ink} strokeWidth={2.8} strokeLinecap="round">
            <Path d="M6 6l12 12M18 6 6 18" />
          </Svg>
        </Pressable>
        <View style={styles.pill}>
          <Text style={styles.pillText}>{talk.topic ? subjectNames[talk.topic.subject] : S.tutor.title}</Text>
        </View>
      </View>

      <View style={styles.stage}>
        <Sprite id={SHADOW} style={styles.shadow} />
        <TutorBear phase={talk.phase} mouth={talk.mouth} label={listening ? S.tutor.bearListening : S.tutor.bearTalking} />
      </View>

      <View style={[styles.controls, { paddingBottom: insets.bottom + 16 }]}>
        {talk.phase === 'bear' || listening || talking || thinking ? (
          <View style={styles.status}>
            <View style={styles.statusRow}>
              <View style={[styles.dot, { backgroundColor: talking ? colors.lime : listening ? colors.lemon : SOFT }]} />
              <Text style={styles.statusText}>{status}</Text>
            </View>
            {talk.kidText ? (
              <Text style={styles.kid} numberOfLines={2}>
                {S.tutor.you}: {talk.kidText}
              </Text>
            ) : null}
          </View>
        ) : null}
        <View style={styles.actions}>
          {talk.phase === 'ended' ? (
            <>
              <Button title={S.tutor.restart} variant="lime" onPress={talk.restart} style={styles.main} />
              <Button title={S.common.back} variant="white" onPress={() => goBack()} style={styles.action} />
            </>
          ) : (
            <>
              {talk.phase === 'bear' ? <Button title={S.tutor.interrupt} variant="lime" onPress={talk.interrupt} style={styles.main} /> : null}
              {listening || talking ? <HoldToTalk active={talking} onStart={talk.holdStart} onEnd={talk.holdEnd} /> : null}
              {talk.phase === 'tap' ? <Button title={S.tutor.tap} variant="lime" onPress={talk.restart} style={styles.main} /> : null}
              <Button title={S.tutor.finish} variant="white" onPress={() => goBack()} style={styles.action} />
            </>
          )}
        </View>
      </View>

      {/* Gemini бэлэн болмогц нээгдэнэ: баавгай нээгдэж дууссаны дараа ярьж эхэлнэ (useBearTalk) */}
      <LeafCurtain covered={talk.phase === 'connecting' && !talk.ready} failed={talk.phase === 'ended'} label={S.tutor.connecting} />
    </View>
  );
}

/**
 * Хүүхэд дарсаар байгаад ярина (push-to-talk): дарж байх хооронд л дуу баавгай руу явна, гадны чимээ орохгүй.
 * Web дээр удаан дарахад сонголт, цэс гарахгүй, хуудас гүйхгүй (тасарвал onPressOut = илгээнэ).
 */
function HoldToTalk({ active, onStart, onEnd }: { active: boolean; onStart: () => void; onEnd: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={S.tutor.hold}
      accessibilityHint={S.tutor.holdTip}
      onPressIn={onStart}
      onPressOut={onEnd}
      delayLongPress={60_000}
      style={[styles.main, styles.hold, active && styles.holdActive, NO_SELECT]}
    >
      <Text style={[styles.holdText, NO_SELECT]}>{active ? S.tutor.holding : S.tutor.hold}</Text>
    </Pressable>
  );
}

const NO_SELECT = { userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none', touchAction: 'none' } as object;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: WALL },
  // баавгайн тайзаас (дараа нь зурагдсан, flex: 1) дээр: эс бөгөөс самбарыг гүйлгэх хүрэлтийг тайз авна
  // хөшиг (LeafCurtain, zIndex 2)-ний ард: бэлдэж байхад самбарын бичиг мөчрийн дээгүүр гарахгүй
  board: { position: 'absolute', paddingHorizontal: 12, paddingBottom: 10, zIndex: 1 },
  // web (утасны browser): самбарын төгсгөлд хүрэхэд гүйлгэлт хуудас руу шилжихгүй
  scroll: { overscrollBehavior: 'contain' } as object,
  topic: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18, color: colors.lemon, marginBottom: 6 },
  chalk: {
    fontFamily: fonts.bold,
    fontSize: 17,
    lineHeight: 24,
    color: CHALK,
    textShadowColor: 'rgba(244, 241, 228, 0.35)',
    textShadowRadius: 3,
  },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, zIndex: 3 },
  close: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white },
  pill: { height: 36, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: colors.white, justifyContent: 'center' },
  pillText: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  shadow: { position: 'absolute', bottom: -9 },
  controls: { paddingHorizontal: 20, paddingTop: 12, gap: 10 },
  status: { alignSelf: 'center', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 18, backgroundColor: 'rgba(25, 21, 46, 0.82)' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  statusText: { fontFamily: fonts.bold, fontSize: 15, color: colors.white },
  kid: { marginTop: 4, fontFamily: fonts.medium, fontSize: 14, lineHeight: 19, color: SOFT, textAlign: 'center' },
  actions: { flexDirection: 'row', gap: 10 },
  // lime товч том үсэг, зайтай тул илүү өргөн
  main: { flex: 1.8, paddingHorizontal: 12 },
  action: { flex: 1, paddingHorizontal: 12 },
  hold: { minHeight: 60, borderRadius: radius.pill, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center' },
  holdActive: { backgroundColor: colors.lemon, transform: [{ scale: 1.04 }] },
  holdText: { fontFamily: fonts.extrabold, fontSize: 16, color: colors.ink, textAlign: 'center' },
});
