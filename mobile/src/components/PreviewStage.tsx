import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LiveBear } from '@/components/LiveBear';
import { ColorFade } from '@/components/pixel';
import { colors, fonts, halo, radius } from '@/constants/theme';
import { type BgDef, type OutfitDef, outfitItems } from '@/lib/pixelBear/catalog';

/** баавгайн анхны sprite-ийн өргөн (bear_idle_scarf 2×): амьд frame-ууд түүний байранд таарна */
const STAGE_W = 164;

/** Дэлгүүр/Цүнхний урьдчилан харах stage (350×290): дэвсгэр + хувцсаа гайхуулж буй амьд баавгай + нэр + үйлдэл. */
export function PreviewStage({ bg, outfit, name, alt, action }: { bg: BgDef; outfit: OutfitDef; name: string; alt: string; action?: ReactNode }) {
  return (
    <View style={styles.stage}>
      <ColorFade color={bg.hex} style={StyleSheet.absoluteFill} />
      <ColorFade color={bg.dark ? halo.night : halo.light} style={styles.halo} />
      <View style={styles.shadow} />
      <View style={[styles.bear, outfit.item === 'warrior_helmet' && { top: 6 }]}>
        {/* дэлгүүрт орж ирсэн хүнтэй мэндэлж даллана; item солиход баавгай тасралтгүй хөдөлсөөр, зөвхөн item солигдоно */}
        <LiveBear anim="happy" w={STAGE_W} items={outfitItems(outfit)} label={alt} />
      </View>
      <View style={styles.chip}>
        <Text style={styles.chipText}>{name}</Text>
      </View>
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { height: 290, borderRadius: radius.stage, overflow: 'hidden' },
  halo: { position: 'absolute', top: 30, left: '50%', marginLeft: -110, width: 220, height: 220, borderRadius: 110 },
  shadow: {
    position: 'absolute',
    top: 266,
    left: '50%',
    marginLeft: -64,
    width: 128,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.ink,
    opacity: 0.15,
  },
  bear: { position: 'absolute', top: -2, left: 0, right: 0, alignItems: 'center' },
  chip: {
    position: 'absolute',
    left: 14,
    top: 14,
    height: 32,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    justifyContent: 'center',
  },
  chipText: { fontFamily: fonts.bold, fontSize: 13, color: colors.ink },
  action: { position: 'absolute', right: 14, bottom: 14 },
});
