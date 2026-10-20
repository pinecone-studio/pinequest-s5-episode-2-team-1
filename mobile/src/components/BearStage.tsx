import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { AnimatedBar, ColorFade, Motion, Pop, Sprite } from '@/components/pixel';
import { colors, fonts, halo as haloColors, radius } from '@/constants/theme';
import { BEAR_CONFIG, type BearView } from '@/lib/pixelBear/bear';
import { bgById, outfitById, type OutfitId } from '@/lib/pixelBear/catalog';

const NIGHT_MOON = '#F3F66C';

/** Нүүрний баавгайн stage (DESIGN.md §7 BearStage, §8-03). Төлөв = sprite + chip + energy + чимэглэл. */
export function BearStage({
  view,
  bgId,
  outfitId,
  onLongPress,
}: {
  view: BearView;
  bgId: string;
  outfitId: OutfitId;
  onLongPress?: () => void;
}) {
  const bg = bgById(bgId);
  const cfg = BEAR_CONFIG[view.state];
  const ink = bg.dark ? colors.white : colors.ink;
  // Happy төлөв = зогсож буй (idle) поз тул сонгосон хувцастай нь харуулна
  const sprite = view.state === 'happy' && outfitId !== 'scarf' ? outfitById(outfitId).stage : cfg.sprite;

  return (
    <Pressable
      onLongPress={onLongPress}
      delayLongPress={600}
      accessible
      accessibilityLabel={`${cfg.alt}. ${cfg.chip}, энерги ${view.energy}%`}
      style={styles.stage}
    >
      <ColorFade color={bg.hex} style={StyleSheet.absoluteFill} />
      <ColorFade color={bg.dark ? haloColors.night : haloColors.light} style={styles.halo} />
      <Decor state={view.state} ink={ink} dark={!!bg.dark} />

      {cfg.floatShadow ? (
        <Motion preset="shadow" style={styles.shadow} />
      ) : (
        <View style={[styles.shadow, { opacity: 0.18 }]} />
      )}
      <View style={[styles.bearWrap, { top: cfg.top }]}>
        <Pop trigger={sprite} from={0.6}>
          <Motion preset={cfg.anim} originBottom={cfg.anim === 'breathe' || cfg.anim === 'sway'}>
            <Sprite id={sprite} />
          </Motion>
        </Pop>
      </View>

      <View style={styles.chip}>
        <View style={[styles.chipDot, { backgroundColor: cfg.dot }]} />
        <Text style={styles.chipText}>{cfg.chip}</Text>
      </View>
      <View style={styles.energy} accessible accessibilityLabel={`Энерги ${view.energy}%`}>
        <Sprite id="icon_heart_24x24" />
        <View style={styles.energyTrack}>
          <AnimatedBar value={view.energy / 100} color={cfg.dot} height={6} />
        </View>
        <Text style={styles.energyNum}>{view.energy}%</Text>
      </View>
    </Pressable>
  );
}

function Twinkle({ delay = 0, children, style }: { delay?: number; children: React.ReactNode; style: object }) {
  return (
    <Motion preset="twinkle" delay={delay} style={[styles.abs, style]}>
      {children}
    </Motion>
  );
}

function Decor({ state, ink, dark }: { state: BearView['state']; ink: string; dark: boolean }) {
  switch (state) {
    case 'thriving':
      return (
        <>
          <Twinkle style={{ left: 40, top: 90 }}>
            <Sprite id="icon_star_36x36" />
          </Twinkle>
          <Twinkle delay={700} style={{ right: 36, top: 72 }}>
            <Sprite id="icon_star_24x24" />
          </Twinkle>
          <Twinkle delay={700} style={{ left: 60, top: 210 }}>
            <Sprite id="icon_heart_36x36" />
          </Twinkle>
          <Twinkle style={{ right: 50, top: 196 }}>
            <Sprite id="icon_coin_36x36" />
          </Twinkle>
        </>
      );
    case 'happy':
      return (
        <>
          <Twinkle style={{ left: 62, top: 96 }}>
            <Sprite id="icon_heart_36x36" />
          </Twinkle>
          <Twinkle delay={700} style={{ right: 60, top: 120 }}>
            <Sprite id="icon_heart_24x24" />
          </Twinkle>
        </>
      );
    case 'tired':
      return (
        <>
          <Motion preset="drop" style={[styles.abs, { right: 96, top: 92 }]}>
            <Svg width={18} height={24} viewBox="0 0 6 8">
              <Rect x={2} y={0} width={2} height={2} fill="#7FC6EF" />
              <Rect x={1} y={2} width={4} height={4} fill="#7FC6EF" />
              <Rect x={2} y={6} width={2} height={1} fill="#7FC6EF" />
              <Rect x={2} y={3} width={1} height={2} fill="#FFFFFF" />
            </Svg>
          </Motion>
          <Text style={[styles.abs, styles.zz, { right: 64, top: 64, color: ink }]}>
            z<Text style={{ fontSize: 15 }}>z</Text>
          </Text>
        </>
      );
    case 'neglected':
      return (
        <>
          <View style={[styles.abs, { right: 38, top: 30 }]}>
            <Svg width={96} height={72} viewBox="0 0 24 18">
              <Rect x={6} y={2} width={8} height={2} fill="#8A8C94" />
              <Rect x={4} y={4} width={14} height={2} fill="#8A8C94" />
              <Rect x={2} y={6} width={20} height={4} fill="#8A8C94" />
              <Rect x={4} y={10} width={16} height={2} fill="#73757D" />
              <Rect x={6} y={13} width={1} height={2} fill="#7FC6EF" />
              <Rect x={11} y={14} width={1} height={2} fill="#7FC6EF" />
              <Rect x={16} y={13} width={1} height={2} fill="#7FC6EF" />
              <Rect x={8} y={16} width={1} height={2} fill="#7FC6EF" />
              <Rect x={14} y={16} width={1} height={2} fill="#7FC6EF" />
            </Svg>
          </View>
          <View style={[styles.abs, { left: 70, top: 86 }]}>
            <Svg width={24} height={18} viewBox="0 0 8 6">
              <Rect x={0} y={0} width={3} height={2} fill="#FFFFFF" opacity={0.8} />
              <Rect x={5} y={0} width={3} height={2} fill="#FFFFFF" opacity={0.8} />
              <Rect x={2} y={2} width={4} height={3} fill="#19152E" />
            </Svg>
          </View>
        </>
      );
    case 'sleep': {
      const moon = dark ? NIGHT_MOON : '#FFFFFF';
      return (
        <>
          <View style={[styles.abs, { right: 34, top: 66 }]}>
            <Svg width={44} height={44} viewBox="0 0 11 11">
              <Rect x={3} y={0} width={4} height={1} fill={moon} />
              <Rect x={1} y={1} width={4} height={2} fill={moon} />
              <Rect x={0} y={3} width={4} height={4} fill={moon} />
              <Rect x={1} y={7} width={5} height={2} fill={moon} />
              <Rect x={3} y={9} width={6} height={1} fill={moon} />
              <Rect x={7} y={8} width={3} height={1} fill={moon} />
            </Svg>
          </View>
          <Twinkle style={{ left: 44, top: 80 }}>
            <Sprite id="icon_star_24x24" />
          </Twinkle>
          <Twinkle delay={700} style={{ left: 92, top: 150 }}>
            <Sprite id="icon_star_12x12" />
          </Twinkle>
          <Text style={[styles.abs, styles.zz, { right: 74, top: 128, color: ink, fontSize: 26 }]}>
            Z<Text style={{ fontSize: 18 }}>z</Text>
          </Text>
        </>
      );
    }
  }
}

const styles = StyleSheet.create({
  stage: { height: 330, borderRadius: radius.stage, overflow: 'hidden' },
  abs: { position: 'absolute' },
  halo: { position: 'absolute', top: 34, left: '50%', marginLeft: -120, width: 240, height: 240, borderRadius: 120 },
  shadow: {
    position: 'absolute',
    top: 292,
    left: '50%',
    marginLeft: -64,
    width: 128,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.ink,
  },
  bearWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  chip: {
    position: 'absolute',
    left: 14,
    top: 14,
    height: 34,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  chipDot: { width: 9, height: 9, borderRadius: 5 },
  chipText: { fontFamily: fonts.bold, fontSize: 13, color: colors.ink },
  energy: {
    position: 'absolute',
    right: 14,
    top: 14,
    height: 34,
    paddingLeft: 9,
    paddingRight: 12,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  energyTrack: { width: 52, height: 6, borderRadius: 3, backgroundColor: colors.trackAlt, overflow: 'hidden' },
  energyNum: { fontFamily: fonts.pixel, fontSize: 15, color: colors.ink },
  zz: { fontFamily: fonts.pixel, fontSize: 22 },
});
