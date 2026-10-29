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
const STAGE_H = 290;

/** Дэлгүүр/Цүнхний урьдчилан харах stage (350×290): дэвсгэр + хувцсаа гайхуулж буй амьд баавгай + нэр + үйлдэл. */
/** `items`: өмсгөх item-ууд (өмссөн бүх хувцас, эсвэл үзэж буй хувцсыг өмссөнтэйгөө хамт). */
/** `height`: намхан дэлгэцэнд багасгасан өндөр, баавгай хамт жижгэрнэ. */
export function PreviewStage({
  bg,
  items,
  name,
  alt,
  action,
  height = STAGE_H,
}: {
  bg: BgDef;
  items: ItemId[];
  name: string;
  alt: string;
  action?: ReactNode;
  height?: number;
}) {
  const s = height / STAGE_H;
  return (
    <View style={[styles.stage, { height }]}>
      <ColorFade color={bg.hex} style={StyleSheet.absoluteFill} />
      <BgArt bg={bg} />
      {/* зураг, сансрын дугуй дээр гэрэл хэрэггүй; Код дээр баавгайг тоонуудаас ялгана */}
      {bg.image || bg.scene === 'space' ? null : <ColorFade color={bg.halo ?? (bg.dark ? halo.night : halo.light)} style={[styles.halo, { top: 30 * s, transform: [{ scale: s }] }]} />}
      <View style={[styles.shadow, { top: 266 * s }]} />
      <View style={[styles.bear, { top: (items.includes('warrior_helmet') ? 6 : -2) * s, transform: [{ scale: s }] }]}>
        {/* дэлгүүрт орж ирсэн хүнтэй мэндэлж даллана; item солиход баавгай тасралтгүй хөдөлсөөр, зөвхөн item солигдоно */}
        <LiveBear anim="happy" w={STAGE_W} items={items} label={alt} />
      </View>
      <View style={styles.chip}>
        <Text style={styles.chipText}>{name}</Text>
      </View>
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { borderRadius: radius.stage, overflow: 'hidden' },
  halo: { position: 'absolute', left: '50%', marginLeft: -110, width: 220, height: 220, borderRadius: 110, transformOrigin: 'center top' },
  shadow: {
    position: 'absolute',
    left: '50%',
    marginLeft: -64,
    width: 128,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.ink,
    opacity: 0.15,
  },
  bear: { position: 'absolute', left: 0, right: 0, alignItems: 'center', transformOrigin: 'center top' },
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
