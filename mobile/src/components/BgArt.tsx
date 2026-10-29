import { useEffect, useMemo, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import type { BgDef } from '@/lib/pixelBear/catalog';

/** Дэвсгэрийн зураг/pixel үзэгдэл (баавгайн ард, swatch дотор). Өнгөн дэвсгэрт юу ч зурахгүй. */
export function BgArt({ bg }: { bg: BgDef }) {
  if (bg.image) return <Image source={bg.image} resizeMode="cover" style={styles.fill} />;
  if (bg.scene === 'space') return <Space />;
  if (bg.scene === 'binary') return <BinaryRain />;
  return null;
}

/** давтагдах санамсаргүй тоо [0, 1): үзэгдэл бүр нээх болгонд адилхан */
const rnd = (n: number) => {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};

/** pixel мөрүүдийг өнгө тус бүрээр нэг Path болгоно; 0.05-ын давхцал нь томруулахад pixel хооронд зураас гаргахгүй */
function toPaths(grid: (string | undefined)[][]): [string, string][] {
  const out = new Map<string, string>();
  grid.forEach((row, y) => {
    for (let x = 0; x < row.length; ) {
      const c = row[x];
      let n = 1;
      while (x + n < row.length && row[x + n] === c) n++;
      if (c) out.set(c, `${out.get(c) ?? ''}M${x} ${y}h${n + 0.05}v1.05h${-n - 0.05}z`);
      x += n;
    }
  });
  return [...out];
}

// ── Сансар: одтой дугуй тэнгэр + 2 сүнс (Charlie-гийн дэвсгэрийн хэмжээ, байрлалаар) ──
const [SW, SH] = [54, 48];
const SKY = ['#9D9EB4', '#7B7D99', '#5A5D80', '#3D4068', '#2A2D53'];
/** 11×14 сүнс: o саарал хүрээ, d бараан хүрээ/ам, e нүд, w гэрэл, l цайвар, m сүүдэр */
const GHOST = ['....oood...', '...owwlld..', '..owwlllld.', '..owlllmmd.', '.owolemmmmd', '.owolemmmmd', '.owdldmmmmd', '.owllmmmmmd', '.ollmmddmd.', 'owdlmdmmmd.', 'oddlmddmmd.', '...dmmmmmmd', '....dddmmmd', '.......dddd'];
const PLUS = ['.w.', 'www', '.w.'];
const DIAMOND = ['.w.', 'w.w', '.w.'];

function spaceGrid() {
  const g: (string | undefined)[][] = Array.from({ length: SH }, () => Array(SW));
  const [cx, cy, R] = [27, 24, 20.6];
  const bands = [R - 2.2, R - 4.4, R - 6.8, R - 9.5];
  for (let y = 0; y < SH; y++)
    for (let x = 0; x < SW; x++) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      if (d > R) continue;
      const b = bands.findIndex((e) => d > e);
      g[y][x] = SKY[b === -1 ? SKY.length - 1 : b];
    }
  const stamp = (x0: number, y0: number, rows: string[], pal: Record<string, string>) =>
    rows.forEach((row, y) =>
      [...row].forEach((ch, x) => {
        const [c, px, py] = [pal[ch], x0 + x, y0 + y];
        if (c && px >= 0 && py >= 0 && px < SW && py < SH) g[py][px] = c;
      }),
    );
  const W = { w: '#FFFFFF' };
  for (const [x, y] of [[30, 7], [42, 24]]) stamp(x - 1, y - 1, PLUS, W);
  stamp(11, 28, DIAMOND, W);
  for (const [x, y] of [[19, 7], [10, 24], [40, 29], [14, 33], [36, 12], [22, 40], [44, 34], [33, 42]]) stamp(x, y, ['w'], W);
  stamp(6, 8, GHOST, { o: '#6B6B70', d: '#22232E', e: '#3B3C48', w: '#FFFFFF', l: '#D2D3DD', m: '#B4B5C3' });
  // баруун сүнс: толин тусгал, илүү цайвар (тэнгэрийн ирмэгээс шагайна)
  stamp(37, 3, GHOST.map((r) => [...r].reverse().join('')), { o: '#6B6B70', d: '#2A2B36', e: '#3B3C48', w: '#FFFFFF', l: '#F2F2F6', m: '#D6D7E0' });
  return g;
}

const SPACE = toPaths(spaceGrid());

function Space() {
  return (
    <Svg width="100%" height="100%" viewBox={`0 0 ${SW} ${SH}`} preserveAspectRatio="xMidYMid meet" style={styles.fill}>
      {SPACE.map(([c, d]) => (
        <Path key={c} d={d} fill={c} />
      ))}
    </Svg>
  );
}

// ── Код: доош урсах жижиг 0/1 ────────────────────────────────────────────────
const DIGIT = { '0': ['###', '#.#', '#.#', '#.#', '###'], '1': ['.#.', '##.', '.#.', '.#.', '###'] };
const [PITCH_X, PITCH_Y] = [4, 7];
const GREEN = { dim: '#C4EEAE', lit: '#9EDF86' };

function BinaryRain() {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const still = useReducedMotion();
  // stage-д ~3pt, swatch-д 2pt pixel
  const u = Math.max(2, Math.round(size.h / 96));
  const rows = Math.ceil(size.h / (PITCH_Y * u)) + 1;
  const cols = Math.ceil(size.w / (PITCH_X * u));
  return (
    <View style={styles.fill} onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      {size.h ? Array.from({ length: cols }, (_, c) => <RainColumn key={`${c}:${rows}:${u}`} col={c} rows={rows} u={u} still={still} />) : null}
    </View>
  );
}

/** нэг багана: `rows` цифрийг 2 давтаж зурна, 1 давталтын өндрөөр доош гулсаад эхэндээ үл мэдэгдэх буцна */
function RainColumn({ col, rows, u, still }: { col: number; rows: number; u: number; still: boolean }) {
  const span = rows * PITCH_Y * u;
  const paths = useMemo(() => {
    const p = { dim: '', lit: '' };
    for (let i = 0; i < rows * 2; i++) {
      const k = i % rows;
      const key = rnd(col * 97 + k) < 0.5 ? '0' : '1';
      const tone = rnd(col * 31 + k * 7 + 0.5) < 0.15 ? 'lit' : 'dim';
      DIGIT[key].forEach((row, y) => [...row].forEach((ch, x) => ch === '#' && (p[tone] += `M${x} ${i * PITCH_Y + y}h1.05v1.05h-1.05z`)));
    }
    return p;
  }, [col, rows]);
  const t = useSharedValue(0);
  useEffect(() => {
    if (still) return;
    // багана бүр өөр хурдтай, секундэд 6–14 pixel: удаан урсана
    const speed = (6 + rnd(col + 0.3) * 8) * u;
    t.value = withRepeat(withTiming(1, { duration: (span / speed) * 1000, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(t);
  }, [col, span, u, still, t]);
  const slide = useAnimatedStyle(() => ({ transform: [{ translateY: (t.value - 1) * span }] }));
  return (
    <Animated.View style={[styles.column, { left: col * PITCH_X * u }, slide]}>
      <Svg width={3 * u} height={2 * span} viewBox={`0 0 3 ${rows * 2 * PITCH_Y}`}>
        <Path d={paths.dim} fill={GREEN.dim} />
        <Path d={paths.lit} fill={GREEN.lit} />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // width/height-гүй бол web дээр Image зургийн жинхэнэ хэмжээгээр тэлнэ
  fill: { ...StyleSheet.absoluteFill, width: '100%', height: '100%', overflow: 'hidden' },
  column: { position: 'absolute', top: 0 },
});
