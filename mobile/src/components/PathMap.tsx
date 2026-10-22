import type { BookLesson, Subject } from '@shared/types';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { frameSize, Motion, SheetFrame, SheetLoop, Sprite } from '@/components/pixel';
import { colors, fonts, radius } from '@/constants/theme';
import { S } from '@/i18n/strings';
import {
  BOSSES,
  HOVER,
  isPedestal,
  lessonTitle,
  MAP_H,
  MAP_PIECES,
  MAP_W,
  NODES,
  type NodeStatus,
  statusOf,
  TRAIL,
  tileFor,
  trailIndex,
  UNIT_COUNT,
  UNIT_SIZE,
  walkPoints,
} from '@/lib/pixelBear/path';

const UNITS = Array.from({ length: UNIT_COUNT }, (_, k) => k);
/** Boss зангилааны баруун талд зогсоно (mapgen_world.py мод тарихгүй орхидог) */
const BOSS_DX = 48;
const STEP_MS = 320;

/** 0-р бүлгийн хуучин 390×760 газрын зурагтай харьцуулсан бүлгийн шилжилт: декорын байрлал бүлэг бүрт адил. */
const unitTop = (k: number) => NODES[k * UNIT_SIZE].y - NODES[0].y;

/**
 * Адал явдлын газрын зураг (DESIGN.md §8-04-ийг дээш 3 бүлэг болгосон). Давхарга: дэвсгэр → үүл → зангилаа ба гүүр
 * (ар талаас урагш) → props, boss → одоогийн зангилааны цагираг/сум → алхаж буй баавгай → эрвээхэй.
 * `from` өгвөл баавгай тэр зангилаанаас `current` хүртэл замаар алхана; `null` бол баавгайг хараахан харуулахгүй.
 */
export function PathMap({
  current,
  from,
  beaten,
  subject,
  lessons,
  onNodePress,
}: {
  current: number;
  from: number | null;
  /** ялсан boss-ын тоо: ялсан бүлэгт туг, бусдад boss */
  beaten: number;
  subject: Subject;
  /** сурах бичгийн хичээлүүд (хоосон бол хуучин сэдвүүд) */
  lessons: readonly BookLesson[];
  onNodePress: (i: number, status: NodeStatus) => void;
}) {
  const cur = NODES[current];
  const curTrail = trailIndex(current);

  return (
    <View style={styles.map} accessibilityLabel={S.path.mapLabel}>
      {MAP_PIECES.map((id) => (
        <Sprite key={id} id={id} />
      ))}

      {UNITS.map((k) => (
        <View key={k} style={[styles.abs, { left: 0, top: unitTop(k) }]} pointerEvents="none">
          <Motion preset="driftA" style={[styles.abs, { left: 0, top: 150, opacity: 0.92 }]}>
            <Sprite id="map_cloud_a_64x22" />
          </Motion>
          <Motion preset="driftB" style={[styles.abs, { left: 0, top: 300, opacity: 0.85 }]}>
            <Sprite id="map_cloud_b_48x22" />
          </Motion>
        </View>
      ))}

      {/* Зангилаа ба гүүр чулуу: дээд талынх нь ард (эхэлж зурна) */}
      {TRAIL.map((t, ti) => {
        if (t.i === undefined) {
          return (
            <View key={`b${ti}`} style={[styles.abs, { left: t.x - 24, top: t.y - 14 }]} pointerEvents="none">
              <Sprite id={ti < curTrail ? 'tile_stone_done_48x36' : 'tile_stone_lock_48x36'} />
            </View>
          );
        }
        const n = NODES[t.i];
        const status = statusOf(n.i, current);
        const ped = isPedestal(n);
        return (
          <Pressable
            key={n.i}
            accessibilityRole="button"
            accessibilityLabel={`${n.i + 1}. ${lessonTitle(subject, n.i, lessons)}, ${
              status === 'done' ? S.path.done : status === 'current' ? S.path.youAreHere : S.path.locked
            }`}
            accessibilityState={{ disabled: status === 'lock' }}
            onPress={() => onNodePress(n.i, status)}
            hitSlop={6}
            style={[styles.abs, ped ? { left: n.x - 36, top: n.y - 20 } : { left: n.x - 24, top: n.y - 14 }]}
          >
            <Sprite id={tileFor(n, status)} />
          </Pressable>
        );
      }).reverse()}

      {UNITS.map((k) => (
        <UnitProps key={k} k={k} current={current} beaten={k < beaten} />
      ))}

      {/* Одоогийн зангилаа: цагираг, сум */}
      <Motion preset="ring" style={[styles.abs, { left: cur.x - 44, top: cur.y - 22 }]}>
        <Sprite id="map_ring_88x44" />
      </Motion>
      <Motion preset="arrow" style={[styles.abs, { left: cur.x - 11, top: cur.y - 150 }]}>
        <Sprite id="map_arrow_22x20" />
      </Motion>
      {from === null ? null : (
        <WalkingBear
          key={`${from}-${current}`}
          from={from}
          to={current}
          label={`${S.path.youAreHere}: ${lessonTitle(subject, current, lessons)}`}
          onPress={() => onNodePress(current, 'current')}
        />
      )}

      {UNITS.map((k) => (
        <View key={k} style={[styles.abs, { left: 0, top: unitTop(k) }]} pointerEvents="none">
          <Motion preset="flyA" style={[styles.abs, { left: 34, top: 600 }]}>
            <Butterfly />
          </Motion>
          <Motion preset="flyB" style={[styles.abs, { left: 330, top: 440 }]}>
            <Butterfly />
          </Motion>
        </View>
      ))}
    </View>
  );
}

/** Бүлгийн props: нахиа (3), бэлэг (9), хэцүү сорил (12), boss эсвэл ялалтын туг (15), бүлгийн нэр. */
function UnitProps({ k, current, beaten }: { k: number; current: number; beaten: boolean }) {
  const base = k * UNIT_SIZE;
  const sapling = NODES[base + 3];
  const gift = NODES[base + 9];
  const myst = NODES[base + 12];
  const boss = NODES[base + UNIT_SIZE - 1];
  const start = NODES[base];
  const b = BOSSES[k];
  const bs = frameSize(b.map, b.frames);
  const bossTop = boss.y + 12 - bs.height;

  return (
    <>
      {k > 0 ? (
        <View style={[styles.pill, { left: 20, top: start.y - 14 }]}>
          <Text style={styles.pillMuted}>{S.path.nextChapter(k + 1)}</Text>
        </View>
      ) : null}

      {/* Хэцүү сорил: асуултын хайрцаг */}
      {current < myst.i ? (
        <>
          <Motion preset="blockBob" style={[styles.abs, { left: myst.x - 18, top: myst.y - 38 }]}>
            <Sprite id="map_qblock_38x38" label="Хэцүү сорил: асуултын тэмдэгтэй алтан хайрцаг" />
          </Motion>
          <Motion preset="twinkle" style={[styles.abs, { left: myst.x + 22, top: myst.y - 48 }]}>
            <Sprite id="icon_star_24x24" />
          </Motion>
          <View style={[styles.tooltip, { left: 8, top: myst.y - 42 }]}>
            <Text style={styles.tipText}>
              {S.path.hardTitle}
              {'\n'}
              <Text style={{ color: colors.lemon }}>{S.path.hardSub}</Text>
            </Text>
          </View>
        </>
      ) : null}

      {/* Бэлэг */}
      {current < gift.i ? (
        <>
          <Motion preset="wiggle" originBottom style={[styles.abs, { left: gift.x - 18, top: gift.y - 34 }]}>
            <Sprite id="map_gift_40x38" label="Бэлгийн хайрцаг" />
          </Motion>
          <Motion preset="twinkle" delay={800} style={[styles.abs, { left: gift.x + 16, top: gift.y - 46 }]}>
            <Sprite id="icon_star_12x12" />
          </Motion>
          <View style={[styles.pill, styles.coinPill, { left: gift.x + 30, top: gift.y - 20 }]}>
            <Sprite id="icon_coin_12x12" />
            <Text style={styles.coinText}>+50</Text>
          </View>
        </>
      ) : null}

      {/* Нахиа: бүлгийн эхний тэмдэглэл давсны дараа ургана */}
      {current > sapling.i ? (
        <>
          <Motion preset="saplingSway" originBottom style={[styles.abs, { left: sapling.x - 16, top: sapling.y - 40 }]}>
            <Sprite id="map_sapling_36x44" label="Ургаж буй нарсны нахиа" />
          </Motion>
          <View style={[styles.pill, { left: sapling.x + 26, top: sapling.y - 28, backgroundColor: colors.ink }]}>
            <Text style={[styles.pillMuted, { color: colors.lime }]}>{S.path.sapling}</Text>
          </View>
        </>
      ) : null}

      {/* Boss: ялагдах хүртлээ зангилааны хажууд, дараа нь туг */}
      {!beaten ? (
        <>
          <View style={[styles.abs, { left: boss.x + BOSS_DX - bs.width / 2, top: bossTop }]}>
            {b.frames > 1 ? (
              <SheetLoop id={b.map} frames={b.frames} loop={HOVER} ms={320} label={b.name} />
            ) : (
              <Motion preset="breathe" originBottom>
                <Sprite id={b.map} label={b.name} />
              </Motion>
            )}
          </View>
          {/* Баавгай boss дээр ирэхэд тайлбарыг халхална; нэр нь доод картад харагдана */}
          {current < boss.i ? (
            <View style={[styles.tooltip, { left: boss.x + BOSS_DX - 46, top: bossTop - 46 }]}>
              <Text style={styles.tipText}>
                {S.path.bossTip}
                {'\n'}
                <Text style={{ color: colors.lemon }}>{b.name}</Text>
              </Text>
            </View>
          ) : null}
        </>
      ) : (
        <>
          <Motion preset="saplingSway" originBottom style={[styles.abs, { left: boss.x - 8, top: boss.y - 52 }]}>
            <Sprite id="map_flag_32x56" label={`${b.name}: ${S.path.bossWon}`} />
          </Motion>
          <View style={[styles.pill, { left: boss.x + 26, top: boss.y - 40, backgroundColor: colors.ink }]}>
            <Text style={[styles.pillMuted, { color: colors.lime }]}>{S.path.bossWon}</Text>
          </View>
        </>
      )}
    </>
  );
}

/** Баавгай `from`-оос `to` хүртэл зангилаа (ба гүүр) бүрээр үсэрч алхана, дараа нь байрандаа hop хийнэ. */
function WalkingBear({ from, to, label, onPress }: { from: number; to: number; label: string; onPress: () => void }) {
  const reduce = useReducedMotion();
  const x = useSharedValue(NODES[from].x);
  const y = useSharedValue(NODES[from].y);
  const lift = useSharedValue(0);

  useEffect(() => {
    const pts = walkPoints(from, to);
    if (reduce || pts.length === 0) {
      x.value = NODES[to].x;
      y.value = NODES[to].y;
      return;
    }
    const step = (v: number) => withTiming(v, { duration: STEP_MS, easing: Easing.linear });
    x.value = withSequence(step(pts[0].x), ...pts.slice(1).map((p) => step(p.x)));
    y.value = withSequence(step(pts[0].y), ...pts.slice(1).map((p) => step(p.y)));
    lift.value = withRepeat(
      withSequence(
        withTiming(-14, { duration: STEP_MS / 2, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: STEP_MS / 2, easing: Easing.in(Easing.quad) }),
      ),
      pts.length,
    );
  }, [from, to, reduce, x, y, lift]);

  const animated = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value - 34 }, { translateY: y.value - 118 + lift.value }],
  }));

  return (
    <Animated.View style={[styles.abs, styles.bear, animated]}>
      <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={StyleSheet.absoluteFill}>
        <Motion preset="hop" originBottom>
          <Sprite id="map_bear_68x122" />
          <Motion preset="blink" style={StyleSheet.absoluteFill}>
            <Sprite id="map_bear_blink_68x122" />
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
  bear: { left: 0, top: 0, width: 68, height: 122 },
  pill: {
    position: 'absolute',
    height: 28,
    paddingHorizontal: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    justifyContent: 'center',
  },
  pillMuted: { fontFamily: fonts.bold, fontSize: 12, color: colors.muted },
  coinPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingLeft: 6, paddingRight: 9 },
  coinText: { fontFamily: fonts.pixel, fontSize: 13, color: colors.ink },
  tooltip: { position: 'absolute', width: 92, paddingVertical: 7, paddingHorizontal: 9, borderRadius: 12, backgroundColor: colors.ink },
  tipText: { fontFamily: fonts.bold, fontSize: 12, lineHeight: 15, color: colors.white },
});
