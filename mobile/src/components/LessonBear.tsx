import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { frameSize, SheetFrame, Sprite } from '@/components/pixel';
import { tagFrames } from '@/lib/pixelBear/anim';
import lesson from '@/lib/pixelBear/bear-lesson.json';
import type { SpriteKey } from '@/sprites';

const SHEET: SpriteKey = 'bear_lesson_1155x990';
const BG: SpriteKey = 'lesson_bg_396x468';
const SHADOW: SpriteKey = 'lesson_shadow_108x18';
const COUNT = lesson.frames.length;
const { width: FRAME_W, height: FRAME_H } = frameSize(SHEET, COUNT, lesson.columns);
/** sheet-ийн pixel → dp */
const PX = FRAME_W / lesson.frameSize.w;
const BG_W = lesson.background.w * PX;
/** хивсний төв (баавгай зогсох цэг): дэвсгэрийн голоос хэвтээ, доороос босоо (dp) */
const RUG_X = (lesson.background.rug[0] + 0.5) * PX - BG_W / 2;
const RUG_Y = (lesson.background.h - lesson.background.rug[1] - 0.5) * PX;
const FEET_GAP = (lesson.frameSize.h - lesson.feet) * PX;

type Tag = keyof typeof lesson.tags;
const ms = (f: number) => lesson.frames[f].duration;

export type LessonMood = 'think' | 'right' | 'wrong';

/** Хичээлийн самбарын дэвсгэр (хичээлийн булан): самбарын доод талд наалдаж, хэвтээгээр төвлөрнө. */
export function LessonBackdrop() {
  return <Sprite id={BG} style={styles.bg} />;
}

/**
 * Хичээлийн баавгай (scripts/lesson-sprites.ts, PixelLab): хивсэн дээрээ зогсоно, хөвөхгүй. Бодох үед эрүүгээ барина;
 * зөв хариултад гараа дэлгэж баярлаад даллана; буруу бол гунигтай бөхийнө. «Motion бууруулах» үед хөдөлгөөнгүй.
 */
export function LessonBear({ mood, label }: { mood: LessonMood; label: string }) {
  const reduce = useReducedMotion();
  const [frame, setFrame] = useState(tagFrames(lesson, 'think')[0]);

  useEffect(() => {
    const once: Tag[] = mood === 'right' ? ['cheer', 'wave', 'wave'] : mood === 'wrong' ? ['oops'] : [];
    const after: Tag = mood === 'think' ? 'think' : 'idle';
    if (reduce) {
      setFrame(tagFrames(lesson, mood === 'wrong' ? 'oops' : after).at(-1) ?? 0);
      return;
    }
    // нэг удаа тоглох tag-ууд → (буруу бол гунигтай frame дээр зогсоно) → давталт
    const seq = once.flatMap((t) => tagFrames(lesson, t));
    const loop = mood === 'wrong' ? [] : tagFrames(lesson, after);
    let i = 0;
    let timer: ReturnType<typeof setTimeout>;
    const next = () => {
      const f = i < seq.length ? seq[i] : loop.length ? loop[(i - seq.length) % loop.length] : undefined;
      if (f === undefined) return;
      i++;
      setFrame(f);
      timer = setTimeout(next, ms(f));
    };
    next();
    return () => clearTimeout(timer);
  }, [mood, reduce]);

  return (
    <View style={styles.stage} pointerEvents="none">
      <View style={styles.shadow}>
        <Sprite id={SHADOW} />
      </View>
      <View style={styles.bear}>
        <SheetFrame id={SHEET} frames={COUNT} cols={lesson.columns} frame={frame} label={label} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bg: { position: 'absolute', bottom: 0, left: '50%', marginLeft: -BG_W / 2 },
  stage: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  shadow: { position: 'absolute', left: '50%', marginLeft: RUG_X - 54, bottom: RUG_Y - 9 },
  bear: { position: 'absolute', left: '50%', marginLeft: RUG_X - lesson.pivot * PX, bottom: RUG_Y - FEET_GAP, width: FRAME_W, height: FRAME_H },
});
