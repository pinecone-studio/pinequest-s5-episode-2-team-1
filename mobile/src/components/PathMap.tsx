import type { Subject } from '@shared/types';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { Motion, Sprite } from '@/components/pixel';
import { colors, fonts, radius } from '@/constants/theme';
import { S } from '@/i18n/strings';
import { isPedestal, lessonTitle, MAP_H, MAP_W, NODES, type NodeStatus, statusOf, tileFor } from '@/lib/pixelBear/path';

/**
 * Сурах замын pixel ойн газрын зураг (DESIGN.md §8-04). Давхарга: суурь (мод, уул) → үүл → зангилаа
 * (ар талаас урагш) → props → одоогийн зангилааны цагираг/сум/баавгай → эрвээхэй.
 * Бүх sprite 2× бүхэл масштабаар (390×760 dp).
 */
export function PathMap({
  current,
  subject,
  onNodePress,
}: {
  current: number;
  subject: Subject;
  onNodePress: (i: number, status: NodeStatus) => void;
}) {
  const cur = NODES[current];
  const sapling = NODES[3];
  const gift = NODES[9];
  const myst = NODES[12];

  return (
    <View style={styles.map} accessibilityLabel={S.path.mapLabel}>
      <Sprite id="map_base_390x760" style={StyleSheet.absoluteFill} />

      <Motion preset="driftA" style={[styles.abs, { left: 0, top: 150, opacity: 0.92 }]}>
        <Sprite id="map_cloud_a_64x22" />
      </Motion>
      <Motion preset="driftB" style={[styles.abs, { left: 0, top: 300, opacity: 0.85 }]}>
        <Sprite id="map_cloud_b_48x22" />
      </Motion>

      {/* Зангилаа: дээд талынх нь ард (эхэлж зурна) */}
      {[...NODES].reverse().map((n) => {
        const status = statusOf(n.i, current);
        const ped = isPedestal(n);
        return (
          <Pressable
            key={n.i}
            accessibilityRole="button"
            accessibilityLabel={`${n.i + 1}. ${lessonTitle(subject, n.i)}, ${
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
      })}

      {/* "2-р бүлэг" (дараагийн бүлэг) */}
      <View style={[styles.pill, { left: 312, top: 170 }]}>
        <Text style={styles.pillMuted}>{S.path.nextChapter(2)}</Text>
      </View>

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

      {/* Нахиа: эхний бүлгийн тэмдэглэл давсны дараа ургана */}
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

      {/* Одоогийн зангилаа: цагираг, сум, үсэрч буй баавгай */}
      <Motion preset="ring" style={[styles.abs, { left: cur.x - 44, top: cur.y - 22 }]}>
        <Sprite id="map_ring_88x44" />
      </Motion>
      <Motion preset="arrow" style={[styles.abs, { left: cur.x - 11, top: cur.y - 150 }]}>
        <Sprite id="map_arrow_22x20" />
      </Motion>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${S.path.youAreHere}: ${lessonTitle(subject, current)}`}
        onPress={() => onNodePress(current, 'current')}
        style={[styles.abs, { left: cur.x - 34, top: cur.y - 118, width: 68, height: 122 }]}
      >
        <Motion preset="hop" originBottom>
          <Sprite id="map_bear_68x122" />
          <Motion preset="blink" style={StyleSheet.absoluteFill}>
            <Sprite id="map_bear_blink_68x122" />
          </Motion>
        </Motion>
      </Pressable>

      <Motion preset="flyA" style={[styles.abs, { left: 34, top: 600 }]}>
        <Butterfly />
      </Motion>
      <Motion preset="flyB" style={[styles.abs, { left: 330, top: 440 }]}>
        <Butterfly />
      </Motion>
    </View>
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
    <View style={styles.bfly} pointerEvents="none">
      <Sprite id="map_butterfly_sheet_28x10" style={{ marginLeft: frame * -14 }} />
    </View>
  );
}

export { MAP_H, MAP_W };

const styles = StyleSheet.create({
  map: { width: MAP_W, height: MAP_H, overflow: 'hidden' },
  abs: { position: 'absolute' },
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
  bfly: { width: 14, height: 10, overflow: 'hidden' },
});
