import { StyleSheet, View } from 'react-native';
import { frameSize, SheetFrame } from '@/components/pixel';
import type { TalkPhase } from '@/hooks/useBearTalk';
import { useTagPlayer } from '@/hooks/useTagPlayer';
import tutor from '@/lib/pixelBear/bear-tutor.json';
import type { MouthLevel } from '@/lib/mouth';
import type { SpriteKey } from '@/sprites';

const SHEET: SpriteKey = 'bear_tutor_1288x1008';
const MOUTH: SpriteKey = 'bear_mouth_40x16';
const COUNT = tutor.frames.length;
const { width: FRAME_W, height: FRAME_H } = frameSize(SHEET, COUNT, tutor.columns);
/** sheet-ийн pixel → dp */
const PX = FRAME_W / tutor.frameSize.w;

/**
 * Баавгайтай ярилцах дэлгэцийн баавгай (scripts/tutor-sprites.ts, PixelLab). Ярьж байхдаа багш шиг сарвуугаа өргөж
 * тайлбарлана, ам нь тоглож буй дууны чанга байдлаар (`mouth`) нээгдэж хаагдана; хүүхдийг сонсохдоо эрүүгээ барина.
 */
export function TutorBear({ phase, mouth, label }: { phase: TalkPhase; mouth: MouthLevel; label: string }) {
  const talking = phase === 'bear';
  const frame = useTagPlayer(tutor, talking ? ['teachIn'] : [], talking ? 'teach' : phase === 'listening' ? 'listen' : 'idle');
  const anchor = (tutor.frames[frame] as { mouth?: number[] }).mouth;

  return (
    <View style={styles.bear} accessible accessibilityLabel={label}>
      <SheetFrame id={SHEET} frames={COUNT} cols={tutor.columns} frame={frame} />
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
