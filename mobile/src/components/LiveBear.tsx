import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import { SheetFrame, Sprite } from '@/components/pixel';
import { useTagPlayer } from '@/hooks/useTagPlayer';
import costumes from '@/lib/pixelBear/bear-costumes.json';
import home from '@/lib/pixelBear/bear-home.json';
import items from '@/lib/pixelBear/bear-items.json';
import type { SpriteKey } from '@/sprites';

/** нүүрний баавгайн төлөв бүрийн (BearState) хөдөлгөөн */
export type BearAnim = keyof typeof home;
/** PixelLab costumes with motions of their own (scripts/costume-motions.ts): worn, their frames replace the bear and its items */
type CostumeId = keyof typeof costumes;
/** баавгайн өмсөх item (scripts/home-sprites.ts-ийн ITEMS) эсвэл бүтэн хувцас */
export type ItemId = keyof typeof items | CostumeId;
const COSTUME_SHEETS: Record<CostumeId, Record<BearAnim, SpriteKey>> = {
  witch: {
    thriving: 'costume_witch_thriving_840x280',
    happy: 'costume_witch_happy_840x280',
    tired: 'costume_witch_tired_840x280',
    neglected: 'costume_witch_neglected_840x280',
    sleep: 'costume_witch_sleep_1000x296',
    ouch: 'costume_witch_ouch_840x280',
    welcome: 'costume_witch_welcome_1008x840',
  },
  cyborg: {
    thriving: 'costume_cyborg_thriving_1080x328',
    happy: 'costume_cyborg_happy_864x656',
    tired: 'costume_cyborg_tired_864x656',
    neglected: 'costume_cyborg_neglected_864x656',
    sleep: 'costume_cyborg_sleep_1080x328',
    ouch: 'costume_cyborg_ouch_864x656',
    welcome: 'costume_cyborg_welcome_1620x984',
  },
  mummy: {
    thriving: 'costume_mummy_thriving_1080x328',
    happy: 'costume_mummy_happy_864x656',
    tired: 'costume_mummy_tired_864x656',
    neglected: 'costume_mummy_neglected_864x656',
    sleep: 'costume_mummy_sleep_1080x328',
    ouch: 'costume_mummy_ouch_864x656',
    welcome: 'costume_mummy_welcome_1620x984',
  },
  liquid_cop: {
    thriving: 'costume_liquid_cop_thriving_1080x328',
    happy: 'costume_liquid_cop_happy_864x656',
    tired: 'costume_liquid_cop_tired_864x656',
    neglected: 'costume_liquid_cop_neglected_864x656',
    sleep: 'costume_liquid_cop_sleep_1080x328',
    ouch: 'costume_liquid_cop_ouch_864x656',
    welcome: 'costume_liquid_cop_welcome_1620x984',
  },
  robot: {
    thriving: 'costume_robot_thriving_1080x328',
    happy: 'costume_robot_happy_864x656',
    tired: 'costume_robot_tired_864x656',
    neglected: 'costume_robot_neglected_864x656',
    sleep: 'costume_robot_sleep_1080x328',
    ouch: 'costume_robot_ouch_864x656',
    welcome: 'costume_robot_welcome_1620x984',
  },
  wrestler: {
    thriving: 'costume_wrestler_thriving_1200x344',
    happy: 'costume_wrestler_happy_960x688',
    tired: 'costume_wrestler_tired_960x688',
    neglected: 'costume_wrestler_neglected_960x688',
    sleep: 'costume_wrestler_sleep_1200x344',
    ouch: 'costume_wrestler_ouch_960x688',
    welcome: 'costume_wrestler_welcome_1800x1032',
  },
  brown_deel: {
    thriving: 'costume_brown_deel_thriving_1200x344',
    happy: 'costume_brown_deel_happy_960x688',
    tired: 'costume_brown_deel_tired_960x688',
    neglected: 'costume_brown_deel_neglected_960x688',
    sleep: 'costume_brown_deel_sleep_1200x344',
    ouch: 'costume_brown_deel_ouch_960x688',
    welcome: 'costume_brown_deel_welcome_1800x1032',
  },
  khuur: {
    thriving: 'costume_khuur_thriving_1200x344',
    happy: 'costume_khuur_happy_960x688',
    tired: 'costume_khuur_tired_960x688',
    neglected: 'costume_khuur_neglected_960x688',
    sleep: 'costume_khuur_sleep_1200x344',
    ouch: 'costume_khuur_ouch_960x688',
    welcome: 'costume_khuur_welcome_1800x1032',
  },
  archer: {
    thriving: 'costume_archer_thriving_1200x344',
    happy: 'costume_archer_happy_960x688',
    tired: 'costume_archer_tired_960x688',
    neglected: 'costume_archer_neglected_960x688',
    sleep: 'costume_archer_sleep_1200x344',
    ouch: 'costume_archer_ouch_960x688',
    welcome: 'costume_archer_welcome_1800x1032',
  },
};

/** scripts/home-sprites.ts: хөдөлгөөн бүрийн нэг мөр sheet (PixelLab animate_image), 2× */
const SHEETS: Record<BearAnim, SpriteKey> = {
  thriving: 'bear_home_thriving_940x280',
  happy: 'bear_home_happy_1260x260',
  tired: 'bear_home_tired_1092x260',
  neglected: 'bear_home_neglected_1092x260',
  sleep: 'bear_home_sleep_970x260',
  ouch: 'bear_home_ouch_1092x272',
  welcome: 'bear_home_welcome_1320x1260',
};
const ITEM_SPRITES: Record<keyof typeof items, SpriteKey> = {
  glasses: 'item_glasses_98x44',
  doctor_coat: 'item_doctor_coat_164x280',
  officer_coat: 'item_officer_coat_164x280',
  officer_cap: 'item_officer_cap_164x280',
  gradcap: 'item_gradcap_78x44',
  headphones: 'item_headphones_142x70',
  warrior_helmet: 'item_warrior_helmet_164x160',
  batman_suit: 'item_batman_suit_148x148',
  batman_mask: 'item_batman_mask_126x104',
  ny_cap: 'item_ny_cap_112x74',
  hiphop_chain: 'item_hiphop_chain_72x86',
  mickey_mask: 'item_mickey_mask_156x130',
  pirate_hat: 'item_pirate_hat_164x84',
  pirate_shirt: 'item_pirate_shirt_164x280',
  pirate_boots: 'item_pirate_boots_164x280',
  wizard_robe: 'item_wizard_robe_164x280',
  demon_cape: 'item_demon_cape_164x280',
  demon_boots: 'item_demon_boots_164x280',
  demon_horns: 'item_demon_horns_164x88',
  ninja_jacket: 'item_ninja_jacket_164x280',
  ninja_pants: 'item_ninja_pants_164x280',
  ninja_sandals: 'item_ninja_sandals_164x280',
  ninja_headband: 'item_ninja_headband_164x280',
  straw_shirt: 'item_straw_shirt_164x280',
  straw_shorts: 'item_straw_shorts_164x280',
  straw_sandals: 'item_straw_sandals_164x280',
  straw_hat: 'item_straw_hat_164x84',
  cowboy_hat: 'item_cowboy_hat_152x84',
  white_headscarf: 'item_white_headscarf_164x280',
  brown_boots: 'item_brown_boots_164x280',
  hard_hat: 'item_hard_hat_128x100',
  snorkel: 'item_snorkel_96x128',
  ribbon: 'item_ribbon_64x52',
  headband: 'item_headband_164x280',
  mongol_hat: 'item_mongol_hat_98x60',
  puss_hat: 'item_puss_hat_154x86',
  puss_belt: 'item_puss_belt_80x26',
  puss_cape: 'item_puss_cape_164x134',
  mongol_deel: 'item_mongol_deel_164x280',
  mongol_boots: 'item_mongol_boots_164x280',
  sport_hoodie: 'item_sport_hoodie_164x280',
  sport_shorts: 'item_sport_shorts_164x280',
  sport_sneakers: 'item_sport_sneakers_164x280',
  vampire: 'item_vampire_164x280',
  cyborg: 'item_cyborg_164x280',
  staff00: 'item_staff00_64x192',
  staff03: 'item_staff03_64x192',
  staff04: 'item_staff04_64x192',
  staff05: 'item_staff05_64x192',
  holly_staff: 'item_holly_staff_64x192',
  pestilence_staff: 'item_pestilence_staff_64x192',
  w_staff_256: 'item_w_staff_256_64x192',
  black_sword: 'item_black_sword_48x128',
  bronze_shield: 'item_bronze_shield_72x76',
  wizard_wand: 'item_wizard_wand_48x128',
  pirate_sword: 'item_pirate_sword_48x128',
};
const HELMET_BASES: Record<BearAnim, SpriteKey> = {
  thriving: 'bear_helmet_base_thriving_940x280',
  happy: 'bear_helmet_base_happy_1260x260',
  tired: 'bear_helmet_base_tired_1092x260',
  neglected: 'bear_helmet_base_neglected_1092x260',
  sleep: 'bear_helmet_base_sleep_970x260',
  ouch: 'bear_helmet_base_ouch_1092x272',
  welcome: 'bear_helmet_base_welcome_1320x1260',
};
/** Batman хувцас биед (гар, хөл) frame бүрт өмсөгдсөн sheet (scripts/home-sprites.ts batmanBase) */
const BATMAN_BASES: Record<BearAnim, SpriteKey> = {
  thriving: 'bear_batman_base_thriving_940x280',
  happy: 'bear_batman_base_happy_1260x260',
  tired: 'bear_batman_base_tired_1092x260',
  neglected: 'bear_batman_base_neglected_1092x260',
  sleep: 'bear_batman_base_sleep_970x260',
  ouch: 'bear_batman_base_ouch_1092x272',
  welcome: 'bear_batman_base_welcome_1320x1260',
};
/** Mongolian deel worn on the body per frame (scripts/home-sprites.ts deelBase) */
const DEEL_BASES: Record<BearAnim, SpriteKey> = {
  thriving: 'bear_deel_base_thriving_940x280',
  happy: 'bear_deel_base_happy_1260x260',
  tired: 'bear_deel_base_tired_1092x260',
  neglected: 'bear_deel_base_neglected_1092x260',
  sleep: 'bear_deel_base_sleep_970x260',
  ouch: 'bear_deel_base_ouch_1092x272',
  welcome: 'bear_deel_base_welcome_1320x1260',
};
const PROFESSIONAL_BASES: Record<BearAnim, SpriteKey> = {
  thriving: 'bear_professional_base_thriving_940x280',
  happy: 'bear_professional_base_happy_1260x260',
  tired: 'bear_professional_base_tired_1092x260',
  neglected: 'bear_professional_base_neglected_1092x260',
  sleep: 'bear_professional_base_sleep_970x260',
  ouch: 'bear_professional_base_ouch_1092x272',
  welcome: 'bear_professional_base_welcome_1320x1260',
};
const HEADSCARF_BASES: Record<BearAnim, SpriteKey> = {
  thriving: 'bear_headscarf_base_thriving_940x280',
  happy: 'bear_headscarf_base_happy_1260x260',
  tired: 'bear_headscarf_base_tired_1092x260',
  neglected: 'bear_headscarf_base_neglected_1092x260',
  sleep: 'bear_headscarf_base_sleep_970x260',
  ouch: 'bear_headscarf_base_ouch_1092x272',
  welcome: 'bear_headscarf_base_welcome_1320x1260',
};
const BOOT_BASES: Record<BearAnim, SpriteKey> = {
  thriving: 'bear_boot_base_thriving_940x280',
  happy: 'bear_boot_base_happy_1260x260',
  tired: 'bear_boot_base_tired_1092x260',
  neglected: 'bear_boot_base_neglected_1092x260',
  sleep: 'bear_boot_base_sleep_970x260',
  ouch: 'bear_boot_base_ouch_1092x272',
  welcome: 'bear_boot_base_welcome_1320x1260',
};

/**
 * PixelLab-ийн frame-уудаар амьд хөдөлдөг баавгай: `in` нэг удаа (жишээ нь гомдож гараа зөрүүлэх), дараа нь `loop`
 * (хөлөө дэвсэх, хөнжилдөө нойрмоглох) давтагдана. Frame нь анхны sprite-аас (`w` dp өргөн) `offset`-оор шилжсэн
 * тул анхны sprite-ийн байранд яг таарна. `items`-ийг frame бүрийн толгойд тааруулж өмсгөнө: малгай, чихэвч шиг
 * `loose` item толгойг хагас алхам хоцорч (жинтэй юм шиг) дагана. «Motion бууруулах» үед хөдөлгөөнгүй.
 */
export function LiveBear({
  anim,
  w,
  items: worn = [],
  label,
  px = 2,
}: {
  anim: BearAnim;
  w: number;
  items?: ItemId[];
  label?: string;
  /** sheet-ийн pixel → dp (sprite-ийн томруулалт, build-sprites.ts); shortcut: item-үүд 2×-д л бүртгэлтэй */
  px?: number;
}) {
  const costume = worn.find((id): id is CostumeId => id in costumes);
  const meta = costume ? costumes[costume][anim] : home[anim];
  const frame = useTagPlayer(meta, ['in'], 'loop');
  const head = home[anim].frames[frame].head; // a costume has no more frames than the bear
  const prev = useRef(head);
  useEffect(() => {
    prev.current = head;
  }, [head]);
  const shift = meta.offset[0] * px + (meta.frameSize.w * px) / 2 - w / 2; // frame-ийн төв анхны sprite-ийн төвөөс
  if (costume)
    return (
      <View style={{ marginTop: meta.offset[1] * px, transform: [{ translateX: shift }] }}>
        <SheetFrame id={COSTUME_SHEETS[costume][anim]} frames={meta.frames.length} cols={meta.columns} frame={frame} label={label} />
      </View>
    );
  const layers = worn.filter((id): id is keyof typeof items => id in items);
  const sheet = layers.includes('doctor_coat') || layers.includes('officer_coat')
    ? PROFESSIONAL_BASES[anim]
    : layers.includes('warrior_helmet')
    ? HELMET_BASES[anim]
    : layers.includes('batman_suit')
      ? BATMAN_BASES[anim]
        : layers.includes('mongol_deel')
          ? DEEL_BASES[anim]
          : layers.includes('white_headscarf')
            ? HEADSCARF_BASES[anim]
            : layers.includes('brown_boots')
              ? BOOT_BASES[anim]
              : SHEETS[anim];
  /** an item pinned to the head (loose ones follow it with a frame of lag) */
  const pinned = (id: keyof typeof items) => {
    const it = items[id];
    const [x, y] = it.loose ? [0, 1].map((k) => Math.round((head[k] + prev.current[k]) / 2)) : head;
    return (
      <View key={id} pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0 }}>
        <Sprite id={ITEM_SPRITES[id]} style={{ position: 'absolute', left: (x + it.at[0]) * px, top: (y + it.at[1]) * px }} />
      </View>
    );
  };
  return (
    <View style={{ marginTop: meta.offset[1] * px, transform: [{ translateX: shift }] }}>
      {/* a cape hangs behind the bear */}
      {layers.filter((id) => 'behind' in items[id]).map(pinned)}
      <SheetFrame id={sheet} frames={meta.frames.length} cols={meta.columns} frame={frame} label={label} />
      {layers.filter((id) => id !== 'batman_suit' && id !== 'mongol_deel' && !('behind' in items[id])).map((id) => {
        const it = items[id];
        if ('fitted' in it) {
          // boots worn under the deel show only below its hem
          const sheets = layers.includes('mongol_deel') && 'deel' in it.fitted ? it.fitted.deel : it.fitted.sheets;
          return (
            <View key={id} pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0 }}>
              <SheetFrame id={sheets[anim] as SpriteKey} frames={meta.frames.length} cols={meta.columns} frame={frame} />
            </View>
          );
        }
        if ('held' in it) {
          const [x, y] = id === 'bronze_shield' ? home[anim].frames[frame].shieldHand : home[anim].frames[frame].hand;
          // Fingers and staff are baked into one frame at this exact hand pivot.
          return (
            <View key={id} pointerEvents="none" style={{ position: 'absolute', left: (x + it.held.at[0]) * px, top: (y + it.held.at[1]) * px }}>
              <SheetFrame id={it.held.sheets[anim] as SpriteKey} frames={meta.frames.length} cols={meta.columns} frame={frame} />
            </View>
          );
        }
        return pinned(id);
      })}
    </View>
  );
}
