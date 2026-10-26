import { STAGES, stageDone } from '@shared/path';
import type { BookLesson, Subject } from '@shared/types';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { frameSize, Motion, SheetFrame, SheetLoop, Sprite } from '@/components/pixel';
import { THEMES } from '@/constants/chapterTheme';
import { colors, fonts } from '@/constants/theme';
import { S, subjectNames } from '@/i18n/strings';
import golems from '@/lib/pixelBear/golems.json';
import { tagFrames } from '@/lib/pixelBear/anim';
import { sprites } from '@/sprites';
import {
  BOSSES,
  CHAPTER_TOPS,
  chapterHeight,
  HOVER,
  lessonAt,
  lessonTitle,
  MAP_CHAPTERS,
  MAP_H,
  MAP_W,
  type NodeStatus,
  type PathLayout,
  type PathUnit,
  statusOf,
  tileFor,
  trailIndex,
} from '@/lib/pixelBear/path';

/** Зангилааны одны шар, хэмжээ (dp): 3 од нь алхмын чулууны (48 dp) өргөнөөс хэтрэхгүй */
const STAR_GOLD = '#FFC93C';
const STAR = 12;
const STARS_W = STAR * 3 + 2;
/** Дарах талбай (dp): 16 зангилаатай бүлэгт хөршүүд хэвтээгээр 84 dp зайтай (mapgen_world.py DESIGN); хичээл олон бол ойртоно */
const HIT = 56;
/** Газрын зураг дээрх boss-ын томрол: бусад дайснаас илүү сүрлэг; баруун гар (бараан) харанхуй голын дэргэд тод харагдахаар */
const BOSS_SCALE = 1.4;
const GUARD_SCALE = { left: 1, right: 1.25 } as const;
/** Хамгаалагчдын биеийн төв газрын зургийн захаас: зангилаа (голдоо ойр), шошгыг халхлахгүй */
const GUARD_EDGE = 62;
/** Одоогийн зангилааны 3 хэсэгтэй цагираг (зууван: чулуу өргөн, нам) */
const RING = { rx: 40, ry: 31, w: 5, gap: 18 };
/** Замын цэг: алхам, хэмжээ, зангилааны төвөөс хэр холоос эхлэх */
const DOT_GAP = 10;
const DOT = 4;
/** бүлэг хоорондын баннерын өндөр */
const BAND_H = 60;

const isBoss = (layout: PathLayout, i: number) => layout.nodes[i].kind === 'boss';

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
 * Газрын зургийг дэлгэцийн өргөнд жигд томруулж/жижигрүүлнэ: хажуу тийш сунгасан зурвас гарахгүй, зангилаа ч хамт.
 * Газрын зургийн цэг (x, y) дэлгэц дээр (x, y) × scale.
 */
export const useMapScale = () => useWindowDimensions().width / MAP_W;

/**
 * Адал явдлын газрын зураг (DESIGN.md §8-04-ийг 3 бүлэг болгосон, дээрээс доош). Давхарга: дэвсгэр → үүл → цэгэн зам →
 * алхмын чулуу ба boss-ын арал (одоогийнх нь 3 хэсэгтэй цагирагтай) → тэмдэг, boss → эрвээхэй.
 */
export function PathMap({
  layout,
  current,
  stages,
  ring,
  beaten,
  subject,
  lessons,
  selected,
  onNodePress,
}: {
  /** хичээлийн тооноос хамаарсан зам (pathLayout) */
  layout: PathLayout;
  current: number;
  /** зангилаа → давсан шат (SubjectPath.stages): од болж харагдана */
  stages: Readonly<Record<number, number>>;
  /** одоогийн зангилааны цагирагийн дүүрсэн хэсэг = давсан шат (0–3) */
  ring: number;
  /** давсан тулааны хаалганы тоо (boss, 2-р бүлгийн зүүн/баруун гар) */
  beaten: number;
  subject: Subject;
  /** сурах бичгийн хичээлүүд (хоосон бол хуучин сэдвүүд) */
  lessons: readonly BookLesson[];
  /** сонгосон зангилаа (түр карт нээлттэй үед) */
  selected: number | null;
  onNodePress: (i: number, status: NodeStatus) => void;
}) {
  const curTrail = trailIndex(layout, current);
  /** Хичээлийн зангилааны од = давсан шат (хаалга, түгжээтэй зангилаанд байхгүй) */
  const starsAt = (i: number) => (i > current || layout.gates.includes(i) ? 0 : stageDone(stages, i, current));
  const segs = useMemo(() => segments(layout), [layout]);
  const trail = useMemo(
    () => ({
      done: segs.filter((s) => s.seg <= curTrail).map((s) => s.d).join('') || 'M0,0',
      todo: segs.filter((s) => s.seg > curTrail).map((s) => s.d).join('') || 'M0,0',
    }),
    [segs, curTrail],
  );
  const scale = useMapScale();

  return (
    <View style={{ width: MAP_W * scale, height: MAP_H * scale, overflow: 'hidden' }}>
      <View style={[styles.map, { transform: [{ scale }], transformOrigin: 'top left' }]} accessibilityLabel={S.path.mapLabel}>
        <MapBackground />

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
        {[...layout.nodes].sort((a, b) => a.y - b.y).map((n) => {
          const status = statusOf(n.i, current);
          const boss = n.kind === 'boss';
          const tile = tileFor(n, status);
          const stars = starsAt(n.i);
          return (
            <Pressable
              key={n.i}
              accessibilityRole="button"
              accessibilityLabel={`${n.i + 1}. ${lessonTitle(subject, n.i, lessons)}, ${
                status === 'done' ? S.path.done : status === 'current' ? S.path.youAreHere : S.path.locked
              }${stars ? `, ${S.path.stars(stars, STAGES)}` : ''}`}
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
              {boss && status !== 'done' ? (
                // давж амжаагүй boss-ын арлын эргэн тойронд улаан анивчих цагираг (одоогийнх бол шар)
                <Motion preset="ring" style={[styles.abs, { left: -8, top: 8 }]}>
                  <Sprite id="map_ring_88x44" style={status === 'current' ? null : styles.dangerRing} />
                </Motion>
              ) : null}
              {selected === n.i && !(status === 'current' && !boss) ? (
                <View style={[styles.selected, boss ? styles.selectedBoss : null]} pointerEvents="none" />
              ) : null}
              <Sprite id={tile} style={boss ? null : { marginTop: status === 'current' ? 6 : 10 }} />
              {status === 'current' && !boss ? <ProgressRing filled={ring} /> : null}
            </Pressable>
          );
        })}

        {/* Од бүх алхмын дээр: доорх зангилааны ард орохгүй */}
        {layout.nodes.map((n) => {
          const stars = starsAt(n.i);
          return stars ? (
            <View key={`s${n.i}`} style={[styles.stars, { left: n.x - STARS_W / 2, top: n.y + 20 }]} pointerEvents="none">
              {Array.from({ length: STAGES }, (_, k) => (
                <Star key={k} on={k < stars} />
              ))}
            </View>
          ) : null;
        })}

        {layout.units.map((u, k) => (
          <UnitProps key={k} unit={u} layout={layout} current={current} />
        ))}
        {layout.gates.map((_, g) => (
          <GateFigure key={g} g={g} layout={layout} beaten={g < beaten} />
        ))}

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

      {/* Бүлэг хоорондын баннер (Duolingo шиг): дэвсгэрийн заагийг халхална, өргөн дэлгэцэд бүтэн өргөнөөр */}
      {layout.units.slice(1).map((u, j) => {
        const theme = THEMES[MAP_CHAPTERS[j + 1].themeId];
        return (
          <View key={j} style={[styles.band, { top: CHAPTER_TOPS[j + 1] * scale - BAND_H / 2, backgroundColor: theme.panel }]} accessibilityRole="header">
            <Text style={[styles.bandOver, { color: theme.muted }]}>{S.path.chapterOver(j + 2)}</Text>
            <Text style={[styles.bandTitle, { color: theme.text }]} numberOfLines={1}>
              {lessonAt(lessons, u.start)?.chapter ?? subjectNames[subject]}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

/** Бүлгүүдийн дэвсгэр дээрээс доош; `cropTop` мөрийг тайрч, богино дэвсгэрийг (`extend`) доод хэсгийг нь давтаж уртасгана. */
/** Захын хоёр давхаргын байрлал ба зургийн шилжилт: зүүн захад [e, 2e) багана, баруун захад [W − 2e, W − e) багана */
const edgeFixes = (e?: number) =>
  e === undefined
    ? []
    : [
        { left: 0, shift: -e },
        { left: MAP_W - e, shift: -(MAP_W - 2 * e) },
      ];

function MapBackground() {
  const width = MAP_W;
  return (
    <View pointerEvents="none">
      {MAP_CHAPTERS.map((c) => (
        <View key={c.bg} style={{ width, height: chapterHeight(c), overflow: 'hidden' }}>
          <Sprite id={c.bg} style={{ width, marginTop: -(c.cropTop ?? 0) }} />
          {/* захын гажигтай `edgeFix` баганын оронд хажуугийн ижил өргөнтэй баганыг давхарлана */}
          {edgeFixes(c.edgeFix).map(({ left, shift }) => (
            <View key={left} style={[styles.abs, { left, top: 0, width: c.edgeFix, height: chapterHeight(c), overflow: 'hidden' }]}>
              <Sprite id={c.bg} style={{ width, marginTop: -(c.cropTop ?? 0), marginLeft: shift }} />
            </View>
          ))}
          {c.extend === undefined ? null : (
            // `extend` мөрөөс доошхи хэсгийг л харуулна
            <View style={{ height: sprites[c.bg].height - c.extend, overflow: 'hidden' }}>
              <Sprite id={c.bg} style={{ width, marginTop: -c.extend }} />
            </View>
          )}
        </View>
      ))}
    </View>
  );
}

/** Бүлгийн тэмдэг: нахиа, бэлэг, хэцүү сорил зангилааны хажууд. */
function UnitProps({ unit, layout, current }: { unit: PathUnit; layout: PathLayout; current: number }) {
  const { nodes } = layout;
  const sapling = nodes[unit.sapling];
  const gift = nodes[unit.gift];
  const myst = nodes[unit.myst];

  return (
    <>
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
  // зүүн гар газрын зургийн зүүн захад, баруун гар баруун захад; тэдний зангилаа голдоо ойр тул давхцахгүй
  const x = boss || !b.role ? n.x : b.role === 'left' ? GUARD_EDGE : MAP_W - GUARD_EDGE;
  const scale = boss ? BOSS_SCALE : b.role ? GUARD_SCALE[b.role] : 1;
  const half = ((golem ? golem.bw : bs.width) / 2) * scale;
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
  // boss томорсон тул шошго нь толгойн дээр биш арлын доор (өмнөх зангилааг халхлахгүй); арал 72×54, n.y − 20-оос.
  // Гарынх толгойн дээр: томорвол толгойн шинэ өндөр = H − (H − толгой) × томрол
  const head = golem ? golem.head : 0;
  const tagTop = boss ? n.y + 38 - top : bs.height - (bs.height - head) * scale - 22;
  return (
    <View style={[styles.abs, { left: x - cx, top }]} pointerEvents="none">
      {b.role ? (
        // хамгаалагчийн хөл доор ягаан анивчих цагираг: харанхуй дэвсгэр дээр ялгарна
        <Motion preset="ring" style={[styles.abs, { left: cx - 44, top: bs.height - 30 }]}>
          <Sprite id="map_ring_88x44" style={styles.guardRing} />
        </Motion>
      ) : null}
      {/* хөлөөрөө тулж томорно */}
      <View style={scale !== 1 ? { transform: [{ scale }], transformOrigin: `${cx}px 100%` } : null}>
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
      </View>
      <View style={[styles.tagWrap, { top: tagTop }, tagBox]}>
        {boss ? (
          <View style={[styles.bossTag, styles.bossTagBig]}>
            <Sprite id="hud_skull_34x30" style={styles.skull} />
            <Text style={[styles.bossTagText, styles.bossTagTextBig]}>{S.path.bossTag}</Text>
          </View>
        ) : (
          <View style={[styles.bossTag, styles.guardTag]}>
            <Text style={styles.bossTagText}>{S.path.guardTag(b.role === 'left')}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

/**
 * Duolingo маягийн цагираг: одоогийн чулууны эргэн тойронд 3 хэсэг (Суурь, Дунд, Ахисан шат), давсан нь лайм.
 * Дээрээс цагийн зүүний дагуу.
 */
function ProgressRing({ filled }: { filled: number }) {
  const { rx, ry, w, gap } = RING;
  const W = (rx + w) * 2;
  const H = (ry + w) * 2;
  const at = (deg: number) => {
    const r = (deg * Math.PI) / 180;
    return `${(W / 2 + rx * Math.cos(r)).toFixed(1)},${(H / 2 + ry * Math.sin(r)).toFixed(1)}`;
  };
  const arc = (k: number) => {
    const a = -90 + k * 120 + gap / 2;
    return `M${at(a)}A${rx},${ry} 0 0 1 ${at(a + 120 - gap)}`;
  };
  // чулууны төв нь дарах талбайн (56) хэвтээ төв, 28 dp-ээс доош (tile_step_cur 56×44, marginTop 6)
  return (
    <Svg width={W} height={H} style={[styles.abs, { left: HIT / 2 - W / 2, top: 28 - H / 2 }]} pointerEvents="none">
      {[0, 1, 2].map((k) => (
        <Path key={k} d={arc(k)} stroke={k < filled ? colors.lime : 'rgba(10,8,24,0.55)'} strokeWidth={w} strokeLinecap="round" fill="none" />
      ))}
    </Svg>
  );
}

/** Шатны од: давсан бол шар, үгүй бол бүдэг. */
function Star({ on }: { on: boolean }) {
  return (
    <Svg width={STAR} height={STAR} viewBox="0 0 12 12" style={on ? null : styles.starOff}>
      <Path
        d="M6 0.8l1.6 3.4 3.7.4-2.8 2.5.8 3.7L6 9 2.7 10.8l.8-3.7L.7 4.6l3.7-.4z"
        fill={on ? STAR_GOLD : colors.white}
        stroke={colors.ink}
        strokeWidth={0.9}
        strokeLinejoin="round"
      />
    </Svg>
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
  // зангилааны доор 3 од: давсан шат тод, үлдсэн нь бүдэг
  stars: { position: 'absolute', width: STARS_W, flexDirection: 'row', justifyContent: 'center', gap: 1 },
  starOff: { opacity: 0.45 },
  map: { width: MAP_W, height: MAP_H, overflow: 'hidden' },
  abs: { position: 'absolute' },
  hit: { width: HIT, height: HIT, alignItems: 'center' },
  islandHit: { width: 72, height: 56 },
  tagWrap: {
    position: 'absolute',
    left: -40,
    right: -40,
    alignItems: 'center',
  },
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
  bossTagBig: { height: 26, paddingLeft: 4, paddingRight: 9, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#B3122B' },
  bossTagTextBig: { fontSize: 13, letterSpacing: 1.5 },
  // hud_skull 34×30-ийн яг хагас (pixel тэгш)
  skull: { width: 17, height: 15 },
  dangerRing: { tintColor: '#FF3B4A' },
  guardRing: { tintColor: '#B9A8FF' },
  selected: { position: 'absolute', left: 2, right: 2, top: 4, height: 46, borderRadius: 16, borderWidth: 2.5, borderColor: colors.lime },
  selectedBoss: { left: -2, right: -2, top: -2, height: 58 },
  mirror: { transform: [{ scaleX: -1 }] },
  bossTagText: {
    fontFamily: fonts.pixel,
    fontSize: 10,
    letterSpacing: 1,
    color: colors.white,
  },
  band: { position: 'absolute', left: 0, right: 0, height: BAND_H, paddingHorizontal: 20, justifyContent: 'center', alignItems: 'center', gap: 2 },
  bandOver: { fontFamily: fonts.extrabold, fontSize: 11, letterSpacing: 1.2 },
  bandTitle: { fontFamily: fonts.bold, fontSize: 16 },
});
