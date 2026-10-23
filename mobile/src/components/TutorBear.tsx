import { StyleSheet, View } from 'react-native';
import { frameSize, SheetFrame } from '@/components/pixel';
import type { TalkPhase } from '@/hooks/useBearTalk';
import { useTagPlayer } from '@/hooks/useTagPlayer';
import tutor from '@/lib/pixelBear/bear-tutor.json';
import type { MouthLevel } from '@/lib/mouth';
import type { SpriteKey } from '@/sprites';

/** утасны texture-ийн хязгаарт багтаахын тулд frame-ууд хоёр sheet-д (scripts/tutor-sprites.ts) */
const SHEETS: SpriteKey[] = ['bear_tutor_0_1320x1280', 'bear_tutor_1_1320x1024'];
const PER_SHEET = tutor.sheets[0];
const MOUTH: SpriteKey = 'bear_mouth_40x16';
const { width: FRAME_W, height: FRAME_H } = frameSize(SHEETS[0], PER_SHEET, tutor.columns);
/** ярих үеийн дохионууд дараалан (нэг дохиог давтахгүй) */
const GESTURES = ['teach', 'point', 'teach', 'present', 'shape'] as const;
/** sheet-ийн pixel → dp */
const PX = FRAME_W / tutor.frameSize.w;

/**
 * Баавгайтай ярилцах дэлгэцийн баавгай (scripts/tutor-sprites.ts, PixelLab). Ярьж байхдаа багш шиг дохионуудыг
 * ээлжлэн хийнэ (сарвуугаа өргөж тайлбарлах, онцлох, хоёр сарвуугаа дэлгэх, санааг хэлбэржүүлэх), ам нь тоглож буй
 * дууны чанга байдлаар (`mouth`) нээгдэж хаагдана; хүүхдийг сонсохдоо эрүүгээ барина.
 */
export function TutorBear({ phase, mouth, label }: { phase: TalkPhase; mouth: MouthLevel; label: string }) {
  const talking = phase === 'bear';
  const frame = useTagPlayer(tutor, talking ? ['teachIn'] : [], talking ? [...GESTURES] : phase === 'listening' ? 'listen' : 'idle');
  const sheet = Math.floor(frame / PER_SHEET);
  const anchor = (tutor.frames[frame] as { mouth?: number[] }).mouth;

  return (
    <View style={styles.bear} accessible accessibilityLabel={label}>
      <SheetFrame id={SHEETS[sheet]} frames={tutor.sheets[sheet]} cols={tutor.columns} frame={frame % PER_SHEET} />
      {talking && anchor && mouth > 0 ? (
        <View style={[styles.mouth, { left: (anchor[0] - tutor.mouth.origin) * PX, top: anchor[1] * PX }]}>
          <SheetFrame id={MOUTH} frames={tutor.mouth.shapes} frame={mouth - 1} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bear: { width: FRAME_W, height: FRAME_H },
  mouth: { position: 'absolute' },
});
