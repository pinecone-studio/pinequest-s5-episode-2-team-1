import type { BearLook } from '@shared/types';
import { StyleSheet, View } from 'react-native';
import Svg, { Line, Polygon, Rect } from 'react-native-svg';
import { avatarSprite } from '@/components/Avatar';
import { Sprite } from '@/components/pixel';
import { colors } from '@/constants/theme';

const W = 320;
const H = 180;
const BASE = 168;
const PEAK = { x: 170, y: 38 };
const LEFT = 36;
const RIGHT = 304;
const STEP = 10;
const SNOW = 78;

/** Шатлаж өгсөх (pixel) налуу: (x0, base) → оргил → (x1, base). */
function stepped(x0: number, x1: number, base: number, peak: { x: number; y: number }): string {
  const n = Math.max(1, Math.round((base - peak.y) / STEP));
  const pts: string[] = [`${x0},${base}`];
  for (let i = 1; i <= n; i++) {
    const x = x0 + ((peak.x - x0) * i) / n;
    pts.push(`${x},${base - (i - 1) * STEP}`, `${x},${base - i * STEP}`);
  }
  for (let i = n; i >= 1; i--) {
    const x = x1 - ((x1 - peak.x) * i) / n;
    pts.push(`${x},${base - i * STEP}`, `${x},${base - (i - 1) * STEP}`);
  }
  pts.push(`${x1},${base}`);
  return pts.join(' ');
}

// Цасан орой нь үндсэн уулын налуутай ижил: суурь нь SNOW өндөрт.
const snowLeft = PEAK.x - ((PEAK.x - LEFT) * (SNOW - PEAK.y)) / (BASE - PEAK.y);
const snowRight = PEAK.x + ((RIGHT - PEAK.x) * (SNOW - PEAK.y)) / (BASE - PEAK.y);

/** Зүүн налуу дээрх цэг (t = 0 бэл, 1 оргил), хувиар. */
function onSlope(t: number) {
  return { left: `${((LEFT + (PEAK.x - LEFT) * t) / W) * 100}%` as const, top: `${((BASE - (BASE - PEAK.y) * t) / H) * 100}%` as const };
}

/**
 * Уулын зураг: pixel шатлаат уул, цасан орой, оргил дээр туг. `climbers` = зүүн налуугаар авирч буй баавгайнууд
 * (эхнийх нь оргилд хамгийн ойр: энэ 7 хоногт хамгийн их өндөрсгөсөн).
 */
export function ClanMountain({ climbers = [], label }: { climbers?: BearLook[]; label?: string }) {
  const shown = climbers.slice(0, 5);
  return (
    <View accessible={!!label} accessibilityRole={label ? 'image' : undefined} accessibilityLabel={label} style={styles.frame}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`}>
        <Rect x={0} y={0} width={W} height={H} fill={colors.sky} />
        <Polygon points={stepped(-20, 150, BASE, { x: 60, y: 92 })} fill={colors.lavender} />
        <Polygon points={stepped(200, 340, BASE, { x: 270, y: 84 })} fill={colors.lavender} />
        <Polygon points={stepped(LEFT, RIGHT, BASE, PEAK)} fill={colors.violet} />
        <Polygon points={stepped(snowLeft, snowRight, SNOW, PEAK)} fill={colors.white} />
        <Line x1={PEAK.x} y1={PEAK.y} x2={PEAK.x} y2={PEAK.y - 26} stroke={colors.ink} strokeWidth={3} />
        <Rect x={PEAK.x + 1.5} y={PEAK.y - 26} width={22} height={13} fill={colors.lemon} stroke={colors.ink} strokeWidth={2} />
        <Rect x={0} y={BASE} width={W} height={H - BASE} fill={colors.lime} />
      </Svg>
      {shown.map((look, i) => {
        // эхнийх оргилд ойр (0.78), бусад нь доошоо
        const pos = onSlope(0.78 - (i * 0.62) / Math.max(1, shown.length - 1));
        return (
          <View key={i} pointerEvents="none" style={[styles.climber, pos]}>
            <Sprite id={avatarSprite(look, 48)} style={styles.head} />
          </View>
        );
      })}
    </View>
  );
}

const HEAD = 30;

const styles = StyleSheet.create({
  frame: { width: '100%', aspectRatio: W / H, borderRadius: 20, overflow: 'hidden', backgroundColor: colors.sky },
  // налуу дээр зогсож буй мэт: толгойн доод хэсэг уулын шатан дээр
  climber: { position: 'absolute', marginLeft: -HEAD / 2 + 6, marginTop: -HEAD + 8 },
  head: { width: HEAD, height: HEAD },
});
