import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { frameSize, SheetFrame, SheetLoop } from '@/components/pixel';
import { AURA, type BearSkill, CRACKS, DUST, type SkillFx } from '@/lib/pixelBear/skills';

type Point = { x: number; y: number };

/** `fx`-ийг `delay` ms-ийн дараа нэг удаа тоглуулна; `at` = зургийн доод голын цэг (газар), `lift` = доод захаас дээш (dp) */
function OneShot({ fx, delay, at, lift = 0, z }: { fx: SkillFx; delay: number; at: Point; lift?: number; z: number }) {
  const [frame, setFrame] = useState<number | null>(null);
  useEffect(() => {
    const timers = Array.from({ length: fx.frames + 1 }, (_, i) =>
      setTimeout(() => setFrame(i < fx.frames ? i : null), delay + i * fx.ms),
    );
    return () => timers.forEach(clearTimeout);
  }, [fx, delay]);
  if (frame === null) return null;
  const { width, height } = frameSize(fx.id, fx.frames, fx.cols);
  return (
    <View style={[styles.abs, { zIndex: z, left: at.x - width / 2, top: at.y - height + lift }]} pointerEvents="none">
      <SheetFrame id={fx.id} frames={fx.frames} cols={fx.cols} frame={frame} />
    </View>
  );
}

/** баавгайн ард хүчний дөл: `until` ms хүртэл давтана */
function Aura({ at, until }: { at: Point; until: number }) {
  const [on, setOn] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setOn(false), until);
    return () => clearTimeout(t);
  }, [until]);
  if (!on) return null;
  const { width, height } = frameSize(AURA.id, AURA.frames, AURA.cols);
  return (
    <View style={[styles.abs, styles.aura, { left: at.x - width / 2, top: at.y - height + 6 }]} pointerEvents="none">
      <SheetLoop id={AURA.id} frames={AURA.frames} cols={AURA.cols} loop={Array.from({ length: AURA.frames }, (_, i) => i)} ms={AURA.ms} />
    </View>
  );
}

/**
 * Баавгайн skill-ийн газрын эффектүүд (boss-д онох эффект нь BossArena-ийн оч): ойроос довтлоход гүйж эхлэх агшинд
 * хөлийн тоос, хос сарвуунд boss-ын хөл доор газар хагарна, балны бөмбөг шидэхийн өмнө баавгайн ард хүчний дөл асна.
 * `n` солигдох бүрт (шинэ цохилт) дахин тоглоно.
 */
export function BearSkillFx({
  n,
  skill,
  bearFeet,
  bossFeet,
  runAt,
  hitAt,
  releaseAt,
}: {
  n: number;
  skill: BearSkill;
  bearFeet: Point;
  bossFeet: Point;
  /** баавгай гүйж эхлэх, boss-д онох, бал шидэх агшин (ms) */
  runAt: number;
  hitAt: number;
  releaseAt: number;
}) {
  const melee = skill === 'claw' || skill === 'cross';
  return (
    <>
      {skill === 'boom' ? <Aura key={`a${n}`} at={bearFeet} until={releaseAt} /> : null}
      {melee ? <OneShot key={`d${n}`} fx={DUST} delay={runAt} at={bearFeet} z={3} /> : null}
      {skill === 'cross' ? <OneShot key={`c${n}`} fx={CRACKS} delay={hitAt} at={bossFeet} lift={CRACKS_LIFT} z={0} /> : null}
    </>
  );
}

/** газрын хагарлын зургийн доод хэсэг нь хөлийн шугамаас доош хэвтэнэ */
const CRACKS_LIFT = 40;

const styles = StyleSheet.create({
  abs: { position: 'absolute' },
  // баавгай (zIndex 2)-ийн ард, бага зэрэг тунгалаг
  aura: { zIndex: 1, opacity: 0.85 },
});
