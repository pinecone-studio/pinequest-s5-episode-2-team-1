import type { BookLesson, Subject } from '@shared/types';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { frameSize, Motion, SheetFrame, SheetLoop, Sprite } from '@/components/pixel';
import { colors, fonts, radius } from '@/constants/theme';
import { S } from '@/i18n/strings';
import golems from '@/lib/pixelBear/golems.json';
import { tagFrames } from '@/lib/pixelBear/anim';
import {
  BOSSES,
  HOVER,
  lessonTitle,
  MAP_H,
  MAP_PIECES,
  MAP_W,
  type NodeStatus,
  type PathLayout,
  type PathUnit,
  statusOf,
  tileFor,
  trailIndex,
  walkPoints,
} from '@/lib/pixelBear/path';

const STEP_MS = 260;
/** Дарах талбай (dp): 16 зангилаатай бүлэгт хөршүүд хэвтээгээр 84 dp зайтай (mapgen_world.py DESIGN); хичээл олон бол ойртоно */
const HIT = 56;
/** Boss-ын арал дээр баавгай boss-ын зүүн талд, арлын гадна зогсоно (давхцахгүй) */
const CHALLENGER_DX = -62;
const CHALLENGER_DY = 6;
/** Замын цэг: алхам, хэмжээ, зангилааны төвөөс хэр холоос эхлэх */
const DOT_GAP = 10;
const DOT = 4;

const isBoss = (layout: PathLayout, i: number) => layout.nodes[i].kind === 'boss';

/** Баавгайн зогсох цэг: энгийн зангилаан дээр, boss-ынх бол арлын хажууд. */
const standAt = (layout: PathLayout, i: number) => {
  const n = layout.nodes[i];
  return isBoss(layout, i) ? { x: n.x + CHALLENGER_DX, y: n.y + CHALLENGER_DY } : n;
};

/** Зангилаа хоорондын нарийн цэгэн зам (дууссан хэсэг нь ногоон): хэсэг бүр SVG шугам, зангилааны чулуу, арлын доор нуугдах хэсгийг тайрна. */
function segments(layout: PathLayout) {
  const { trail } = layout;
  return trail.slice(1).flatMap((b, k) => {
    const a = trail[k];
    const rA = a.i === undefined ? 0 : isBoss(layout, a.i) ? 40 : 26;
    const rB = b.i === undefined ? 0 : isBoss(layout, b.i) ? 40 : 26;
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    if (len <= rA + rB) return [];
    const at = (d: number) => `${(a.x + ((b.x - a.x) * d) / len).toFixed(1)},${(a.y + 4 + ((b.y - a.y) * d) / len).toFixed(1)}`;
    return [{ seg: k + 1, d: `M${at(rA + DOT_GAP / 2 - DOT / 2)}L${at(len - rB)}` }];
  });
}

/**
 * Адал явдлын газрын зураг (DESIGN.md §8-04-ийг дээш 3 бүлэг болгосон). Давхарга: дэвсгэр → үүл → цэгэн зам → алхмын
 * чулуу ба boss-ын арал → тэмдэг, boss → баавгай ("Чи энд") → эрвээхэй.
 * `from` өгвөл баавгай тэр зангилаанаас `current` хүртэл замаар алхана; `null` бол баавгайг хараахан харуулахгүй.
 */
export function PathMap({
  layout,
  current,
  from,
  beaten,
  subject,
  lessons,
  onNodePress,
}: {
  /** хичээлийн тооноос хамаарсан зам (pathLayout) */
  layout: PathLayout;
  current: number;
  from: number | null;
  /** давсан тулааны хаалганы тоо (boss, 2-р бүлгийн зүүн/баруун гар) */
  beaten: number;
  subject: Subject;
  /** сурах бичгийн хичээлүүд (хоосон бол хуучин сэдвүүд) */
  lessons: readonly BookLesson[];
  onNodePress: (i: number, status: NodeStatus) => void;
}) {
  const curTrail = trailIndex(layout, current);
  const segs = useMemo(() => segments(layout), [layout]);
  const trail = useMemo(
    () => ({
      done: segs.filter((s) => s.seg <= curTrail).map((s) => s.d).join('') || 'M0,0',
      todo: segs.filter((s) => s.seg > curTrail).map((s) => s.d).join('') || 'M0,0',
    }),
    [segs, curTrail],
  );
  // 390 dp-ээс өргөн дэлгэцэд хажуугийн зай: ижил дэвсгэрийг хэвтээгээр сунгаж ард нь тавина (хурц газрын зураг голд)
  const width = Math.max(MAP_W, useWindowDimensions().width);

  return (
    <View style={{ width, height: MAP_H }}>
      {width > MAP_W ? (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {MAP_PIECES.map((id) => (
            <Sprite key={id} id={id} style={{ width }} />
          ))}
        </View>
      ) : null}
      <View style={[styles.map, { marginLeft: (width - MAP_W) / 2 }]} accessibilityLabel={S.path.mapLabel}>
        {MAP_PIECES.map((id) => (
          <Sprite key={id} id={id} />
        ))}

        {layout.units.map((u, k) => (
          <View key={k} style={[styles.abs, { left: 0, top: u.top }]} pointerEvents="none">
            <Motion preset="driftA" style={[styles.abs, { left: 0, top: 150, opacity: 0.6 }]}>
              <Sprite id="map_cloud_a_64x22" />
            </Motion>
            <Motion preset="driftB" style={[styles.abs, { left: 0, top: 300, opacity: 0.55 }]}>
              <Sprite id="map_cloud_b_48x22" />
            </Motion>
          </View>
        ))}

        <Svg width={MAP_W} height={MAP_H} style={StyleSheet.absoluteFill} pointerEvents="none">
          <Path d={trail.todo} stroke="rgba(255,255,255,0.55)" strokeWidth={DOT} strokeDasharray={`${DOT} ${DOT_GAP - DOT}`} fill="none" />
          <Path d={trail.done} stroke="#9CF06A" strokeWidth={DOT} strokeDasharray={`${DOT} ${DOT_GAP - DOT}`} fill="none" />
        </Svg>

        {/* Алхмууд: дээд талынх нь ард (эхэлж зурна) */}
        {layout.nodes.map((n) => {
          const status = statusOf(n.i, current);
          const boss = n.kind === 'boss';
          const tile = tileFor(n, status);
          return (
            <Pressable
              key={n.i}
              accessibilityRole="button"
              accessibilityLabel={`${n.i + 1}. ${lessonTitle(subject, n.i, lessons)}, ${
                status === 'done' ? S.path.done : status === 'current' ? S.path.youAreHere : S.path.locked
              }`}
              accessibilityState={{ disabled: status === 'lock' }}
              onPress={() => onNodePress(n.i, status)}
              style={[
                styles.abs,
                boss ? styles.islandHit : styles.hit,
                {
                  left: n.x - (boss ? 36 : HIT / 2),
                  top: boss ? n.y - 20 : n.y + 4 - HIT / 2,
                },
              ]}
            >
              {boss && status === 'current' ? (
                <Motion preset="ring" style={[styles.abs, { left: -8, top: 8 }]}>
                  <Sprite id="map_ring_88x44" />
                </Motion>
              ) : null}
              <Sprite id={tile} style={boss ? null : { marginTop: status === 'current' ? 6 : 10 }} />
            </Pressable>
          );
        }).reverse()}

        {layout.units.map((u, k) => (
          <UnitProps key={k} k={k} unit={u} layout={layout} current={current} />
        ))}
        {layout.gates.map((_, g) => (
          <GateFigure key={g} g={g} layout={layout} beaten={g < beaten} />
        ))}

        {from === null ? null : (
          <WalkingBear
            key={`${from}-${current}`}
            layout={layout}
            from={from}
            to={current}
            label={`${S.path.youAreHere}: ${lessonTitle(subject, current, lessons)}`}
            onPress={() => onNodePress(current, 'current')}
          />
        )}

        {layout.units.map((u, k) => (
          <View key={k} style={[styles.abs, { left: 0, top: u.top }]} pointerEvents="none">
            <Motion preset="flyA" style={[styles.abs, { left: 34, top: 600 }]}>
              <Butterfly />
            </Motion>
            <Motion preset="flyB" style={[styles.abs, { left: 330, top: 440 }]}>
              <Butterfly />
            </Motion>
          </View>
        ))}
      </View>
    </View>
  );
}

/** Бүлгийн тэмдэг: нахиа, бэлэг, хэцүү сорил зангилааны хажууд. */
function UnitProps({ k, unit, layout, current }: { k: number; unit: PathUnit; layout: PathLayout; current: number }) {
  const { nodes } = layout;
  const sapling = nodes[unit.sapling];
  const gift = nodes[unit.gift];
  const myst = nodes[unit.myst];
  const start = nodes[unit.start];

  return (
    <>
      {k > 0 ? (
        <View style={[styles.pill, { right: 44, top: start.y - 14 }]} pointerEvents="none">
          <Text style={styles.pillMuted}>{S.path.nextChapter(k + 1)}</Text>
        </View>
      ) : null}

      {current < myst.i ? (
        <Motion preset="blockBob" style={[styles.abs, { left: myst.x + 24, top: myst.y - 22 }]}>
          <Sprite id="map_qblock_19x19" label={S.path.hardTitle} />
        </Motion>
      ) : null}
      {current < gift.i ? (
        <Motion preset="wiggle" originBottom style={[styles.abs, { left: gift.x + 24, top: gift.y - 22 }]}>
          <Sprite id="map_gift_20x19" label={S.path.gift} />
        </Motion>
      ) : null}
      {current > sapling.i ? (
        <Motion preset="saplingSway" originBottom style={[styles.abs, { left: sapling.x + 24, top: sapling.y - 26 }]}>
          <Sprite id="map_sapling_18x22" label={S.path.sapling} />
        </Motion>
      ) : null}

    </>
  );
}

/**
 * Тулааны хаалга: boss арал дээрээ (ялсан бол туг), түүний зүүн/баруун гар зангилааныхаа хажууд (замаас гадна,
 * давхцахгүй) зогсоно; давсан гар алга болно.
 */
function GateFigure({ g, layout, beaten }: { g: number; layout: PathLayout; beaten: boolean }) {
  const n = layout.nodes[layout.gates[g]];
  const b = BOSSES[g];
  const boss = n.kind === 'boss';
  const golem = b.anim ? golems[b.anim] : null;
  const bs = frameSize(b.map, b.frames, b.cols);
  // тулаанд дайснууд баруун тийш (баавгай руу) хардаг; газрын зураг дээр баруун гар замын баруун талд тул зам руу
  // (зүүн тийш) харуулахаар толин тусгална
  const flip = b.role === 'right';
  // биеийн гол: PixelLab дайсны frame-д довтолгооны эффект нэг тал руу сунадаг
  const cx = golem ? (flip ? bs.width - golem.cx : golem.cx) : bs.width / 2;
  // зүүн гар зангилааныхаа зүүн талд, баруун гар баруун талд (хөрш зангилаа, тэдгээрийн 56 dp дарах талбайгаас гадна;
  // 320 dp дэлгэцэд ч харагдахаар захаас зайтай)
  const x = boss ? n.x : b.role === 'left' ? n.x - 84 : n.x + 44;
  const half = (golem ? golem.bw : bs.width) / 2;
  // шошго: boss-ынх голд, гарынх биеийн гадна зах руу тэгшилнэ (дэлгэцийн захаас гарахгүй)
  const tagBox =
    boss || !b.role
      ? { left: cx - 60, right: bs.width - cx - 60 }
      : b.role === 'left'
        ? { left: cx - half, right: bs.width - cx - 120, alignItems: 'flex-start' as const }
        : { left: cx - 120, right: bs.width - cx - half, alignItems: 'flex-end' as const };
  const feet = boss ? n.y + 4 : n.y + 10;
  // хөвдөг boss арлаас бага зэрэг дээгүүр
  const top = feet - (golem ? golem.feet + 1 : bs.height) - (b.floats ? 6 : 0);
  if (beaten && !boss) return null;
  if (beaten)
    return (
      <View style={[styles.abs, { left: n.x - 16, top: n.y - 52 }]} pointerEvents="none">
        <Motion preset="saplingSway" originBottom>
          <Sprite id="map_flag_32x56" label={`${b.name}: ${S.path.bossWon}`} />
        </Motion>
        <View style={[styles.tagWrap, { top: -22 }]}>
          <View style={[styles.bossTag, { backgroundColor: colors.ink }]}>
            <Text style={[styles.bossTagText, { color: colors.lime }]}>{S.path.bossWon}</Text>
          </View>
        </View>
      </View>
    );
  return (
    <View style={[styles.abs, { left: x - cx, top }]} pointerEvents="none">
      {golem ? (
        <View style={flip ? styles.mirror : null}>
          <SheetLoop id={b.map} frames={b.frames} cols={b.cols} loop={tagFrames(golem, 'idle')} ms={260} label={b.name} />
        </View>
      ) : b.frames > 1 ? (
        <SheetLoop id={b.map} frames={b.frames} loop={HOVER} ms={420} label={b.name} />
      ) : (
        <Motion preset="breathe" originBottom>
          <Sprite id={b.map} label={b.name} />
        </Motion>
      )}
      <View style={[styles.tagWrap, { top: (golem ? golem.head : 0) - 22 }, tagBox]}>
        <View style={[styles.bossTag, boss ? null : styles.guardTag]}>
          <Text style={styles.bossTagText}>{boss ? S.path.bossTag : S.path.guardTag(b.role === 'left')}</Text>
        </View>
      </View>
    </View>
  );
}

/** Баавгай `from`-оос `to` хүртэл зангилаа бүрээр богино, зөөлөн алхана; зогсохдоо үл ялиг амьсгална. */
function WalkingBear({
  layout,
  from,
  to,
  label,
  onPress,
}: {
  layout: PathLayout;
  from: number;
  to: number;
  label: string;
  onPress: () => void;
}) {
  const reduce = useReducedMotion();
  const start = standAt(layout, from);
  const x = useSharedValue(start.x);
  const y = useSharedValue(start.y);
  const lift = useSharedValue(0);

  useEffect(() => {
    const end = standAt(layout, to);
    const pts = [...walkPoints(layout, from, to).slice(0, -1), end];
    if (reduce || from === to) {
      x.value = end.x;
      y.value = end.y;
      return;
    }
    const step = (v: number) => withTiming(v, { duration: STEP_MS, easing: Easing.inOut(Easing.quad) });
    x.value = withSequence(...pts.map((p) => step(p.x)));
    y.value = withSequence(...pts.map((p) => step(p.y)));
    lift.value = withRepeat(
      withSequence(
        withTiming(-5, {
          duration: STEP_MS / 2,
          easing: Easing.out(Easing.quad),
        }),
        withTiming(0, {
          duration: STEP_MS / 2,
          easing: Easing.in(Easing.quad),
        }),
      ),
      pts.length,
    );
  }, [layout, from, to, reduce, x, y, lift]);

  // хөл нь чулууны дээд хавтгайн төвд (y + 2)
  const animated = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value - 13 }, { translateY: y.value - 44 + lift.value }],
  }));

  return (
    <Animated.View style={[styles.abs, styles.bear, animated]}>
      <View style={[styles.tagWrap, { top: -24 }]} pointerEvents="none">
        <View style={styles.hereTag}>
          <Text style={styles.hereText}>{S.path.here}</Text>
        </View>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.bearHit}>
        <Motion preset="breathe" originBottom>
          <Sprite id="map_bear_small_26x46" />
          <Motion preset="blink" style={StyleSheet.absoluteFill}>
            <Sprite id="map_bear_small_blink_26x46" />
          </Motion>
        </Motion>
      </Pressable>
    </Animated.View>
  );
}

/** 2 фреймтэй далавч дэвэх эрвээхэй (steps(2) .32s). */
function Butterfly() {
  const reduce = useReducedMotion();
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    if (reduce) return;
    const t = setInterval(() => setFrame((f) => 1 - f), 160);
    return () => clearInterval(t);
  }, [reduce]);
  return (
    <View pointerEvents="none">
      <SheetFrame id="map_butterfly_sheet_28x10" frames={2} frame={frame} />
    </View>
  );
}

export { MAP_H, MAP_W };

const styles = StyleSheet.create({
  map: { width: MAP_W, height: MAP_H, overflow: 'hidden' },
  abs: { position: 'absolute' },
  hit: { width: HIT, height: HIT, alignItems: 'center' },
  islandHit: { width: 72, height: 56 },
  // баавгай 26×46; дарах талбай 56×56 (баавгайн төвд)
  bear: { left: 0, top: 0, width: 26, height: 46 },
  bearHit: {
    position: 'absolute',
    left: -15,
    top: -6,
    width: HIT,
    height: HIT,
    alignItems: 'center',
    paddingTop: 6,
  },
  tagWrap: {
    position: 'absolute',
    left: -40,
    right: -40,
    alignItems: 'center',
  },
  hereTag: {
    height: 18,
    paddingHorizontal: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.lemon,
    borderWidth: 1.5,
    borderColor: colors.ink,
    justifyContent: 'center',
  },
  hereText: { fontFamily: fonts.extrabold, fontSize: 10, color: colors.ink },
  bossTag: {
    height: 18,
    paddingHorizontal: 7,
    borderRadius: 4,
    backgroundColor: '#E5484D',
    borderWidth: 1.5,
    borderColor: colors.ink,
    justifyContent: 'center',
  },
  guardTag: { backgroundColor: '#5B4FD6' },
  mirror: { transform: [{ scaleX: -1 }] },
  bossTagText: {
    fontFamily: fonts.pixel,
    fontSize: 10,
    letterSpacing: 1,
    color: colors.white,
  },
  pill: {
    position: 'absolute',
    height: 28,
    paddingHorizontal: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    justifyContent: 'center',
  },
  pillMuted: { fontFamily: fonts.bold, fontSize: 12, color: colors.muted },
});
