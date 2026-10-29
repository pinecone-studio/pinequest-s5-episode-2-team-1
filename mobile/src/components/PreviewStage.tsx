import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BgArt } from '@/components/BgArt';
import { LiveBear } from '@/components/LiveBear';
import { ColorFade } from '@/components/pixel';
import { colors, fonts, halo, radius } from '@/constants/theme';
import type { ItemId } from '@/components/LiveBear';
import type { BgDef } from '@/lib/pixelBear/catalog';

/** баавгайн анхны sprite-ийн өргөн (bear_idle_scarf 2×): амьд frame-ууд түүний байранд таарна */
const STAGE_W = 164;

/** Дэлгүүр/Цүнхний урьдчилан харах stage (350×290): дэвсгэр + хувцсаа гайхуулж буй амьд баавгай + нэр + үйлдэл. */
/** `items`: өмсгөх item-ууд (өмссөн бүх хувцас, эсвэл үзэж буй хувцсыг өмссөнтэйгөө хамт). */
export function PreviewStage({ bg, items, name, alt, action }: { bg: BgDef; items: ItemId[]; name: string; alt: string; action?: ReactNode }) {
  return (
    <View style={[styles.stage, { backgroundColor: bg.hex }]} >
      <View style={styles.scene}>
      <ColorFade color={bg.hex} style={StyleSheet.absoluteFill} />
      <BgArt bg={bg} />
      {/* зураг, сансрын дугуй дээр гэрэл хэрэггүй; Код дээр баавгайг тоонуудаас ялгана */}
      {bg.image || bg.scene === 'space' ? null : <ColorFade color={bg.halo ?? (bg.dark ? halo.night : halo.light)} style={styles.halo} />}
      <View style={styles.shadow} />
      <View style={[styles.bear, items.includes('warrior_helmet') && { top: 6 }]}>
        {/* дэлгүүрт орж ирсэн хүнтэй мэндэлж даллана; item солиход баавгай тасралтгүй хөдөлсөөр, зөвхөн item солигдоно */}
        <LiveBear anim="happy" w={STAGE_W} items={items} label={alt} />
      </View>
      </View>
      <View style={styles.footer}>
        <Text style={styles.chipText}>{name}</Text>
        {action ? <View style={styles.action}>{action}</View> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { borderRadius: radius.stage, overflow: 'hidden' },
  scene: { height: 290, overflow: 'hidden' },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: 14, backgroundColor: colors.white },
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
  chipText: { fontFamily: fonts.bold, fontSize: 13, color: colors.ink, flex: 1 },
  action: { flexShrink: 0 },
});
