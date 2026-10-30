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
  leaf_ninja: {
    thriving: 'costume_leaf_ninja_thriving_1200x344',
    happy: 'costume_leaf_ninja_happy_960x688',
    tired: 'costume_leaf_ninja_tired_960x688',
    neglected: 'costume_leaf_ninja_neglected_960x688',
    sleep: 'costume_leaf_ninja_sleep_1200x344',
    ouch: 'costume_leaf_ninja_ouch_960x688',
    welcome: 'costume_leaf_ninja_welcome_1800x1032',
  },
  shadow_ninja: {
    thriving: 'costume_shadow_ninja_thriving_1200x344',
    happy: 'costume_shadow_ninja_happy_960x688',
    tired: 'costume_shadow_ninja_tired_960x688',
    neglected: 'costume_shadow_ninja_neglected_960x688',
    sleep: 'costume_shadow_ninja_sleep_1200x344',
    ouch: 'costume_shadow_ninja_ouch_960x688',
    welcome: 'costume_shadow_ninja_welcome_1800x1032',
  },
  blossom_ninja: {
    thriving: 'costume_blossom_ninja_thriving_1200x344',
    happy: 'costume_blossom_ninja_happy_960x688',
    tired: 'costume_blossom_ninja_tired_960x688',
    neglected: 'costume_blossom_ninja_neglected_960x688',
    sleep: 'costume_blossom_ninja_sleep_1200x344',
    ouch: 'costume_blossom_ninja_ouch_960x688',
    welcome: 'costume_blossom_ninja_welcome_1800x1032',
  },
  police: {
    thriving: 'costume_police_thriving_1200x344',
    happy: 'costume_police_happy_960x688',
    tired: 'costume_police_tired_960x688',
    neglected: 'costume_police_neglected_960x688',
    sleep: 'costume_police_sleep_1200x344',
    ouch: 'costume_police_ouch_960x688',
    welcome: 'costume_police_welcome_1800x1032',
  },
  doctor: {
    thriving: 'costume_doctor_thriving_1200x344',
    happy: 'costume_doctor_happy_960x688',
    tired: 'costume_doctor_tired_960x688',
    neglected: 'costume_doctor_neglected_960x688',
    sleep: 'costume_doctor_sleep_1200x344',
    ouch: 'costume_doctor_ouch_960x688',
    welcome: 'costume_doctor_welcome_1800x1032',
  },
  glasses_wizard: {
    thriving: 'costume_glasses_wizard_thriving_1200x344',
    happy: 'costume_glasses_wizard_happy_960x688',
    tired: 'costume_glasses_wizard_tired_960x688',
    neglected: 'costume_glasses_wizard_neglected_960x688',
    sleep: 'costume_glasses_wizard_sleep_1200x344',
    ouch: 'costume_glasses_wizard_ouch_960x688',
    welcome: 'costume_glasses_wizard_welcome_1800x1032',
  },
  book_wizard: {
    thriving: 'costume_book_wizard_thriving_1200x344',
    happy: 'costume_book_wizard_happy_960x688',
    tired: 'costume_book_wizard_tired_960x688',
    neglected: 'costume_book_wizard_neglected_960x688',
    sleep: 'costume_book_wizard_sleep_1200x344',
    ouch: 'costume_book_wizard_ouch_960x688',
    welcome: 'costume_book_wizard_welcome_1800x1032',
  },
  ginger_wizard: {
    thriving: 'costume_ginger_wizard_thriving_1200x344',
    happy: 'costume_ginger_wizard_happy_960x688',
    tired: 'costume_ginger_wizard_tired_960x688',
    neglected: 'costume_ginger_wizard_neglected_960x688',
    sleep: 'costume_ginger_wizard_sleep_1200x344',
    ouch: 'costume_ginger_wizard_ouch_960x688',
    welcome: 'costume_ginger_wizard_welcome_1800x1032',
  },
  footballer_7: {
    thriving: 'costume_footballer_7_thriving_1200x344',
    happy: 'costume_footballer_7_happy_960x688',
    tired: 'costume_footballer_7_tired_960x688',
    neglected: 'costume_footballer_7_neglected_960x688',
    sleep: 'costume_footballer_7_sleep_1200x344',
    ouch: 'costume_footballer_7_ouch_960x688',
    welcome: 'costume_footballer_7_welcome_1800x1032',
  },
  footballer_10: {
    thriving: 'costume_footballer_10_thriving_1200x344',
    happy: 'costume_footballer_10_happy_960x688',
    tired: 'costume_footballer_10_tired_960x688',
    neglected: 'costume_footballer_10_neglected_960x688',
    sleep: 'costume_footballer_10_sleep_1200x344',
    ouch: 'costume_footballer_10_ouch_960x688',
    welcome: 'costume_footballer_10_welcome_1800x1032',
  },
  pirate_captain: {
    thriving: 'costume_pirate_captain_thriving_1200x344',
    happy: 'costume_pirate_captain_happy_960x688',
    tired: 'costume_pirate_captain_tired_960x688',
    neglected: 'costume_pirate_captain_neglected_960x688',
    sleep: 'costume_pirate_captain_sleep_1200x344',
    ouch: 'costume_pirate_captain_ouch_960x688',
    welcome: 'costume_pirate_captain_welcome_1800x1032',
  },
  hoop_23: {
    thriving: 'costume_hoop_23_thriving_1200x344',
    happy: 'costume_hoop_23_happy_960x688',
    tired: 'costume_hoop_23_tired_960x688',
    neglected: 'costume_hoop_23_neglected_960x688',
    sleep: 'costume_hoop_23_sleep_1200x344',
    ouch: 'costume_hoop_23_ouch_960x688',
    welcome: 'costume_hoop_23_welcome_1800x1032',
  },
  hoop_24: {
    thriving: 'costume_hoop_24_thriving_1200x344',
    happy: 'costume_hoop_24_happy_960x688',
    tired: 'costume_hoop_24_tired_960x688',
    neglected: 'costume_hoop_24_neglected_960x688',
    sleep: 'costume_hoop_24_sleep_1200x344',
    ouch: 'costume_hoop_24_ouch_960x688',
    welcome: 'costume_hoop_24_welcome_1800x1032',
  },
  iron_armor: {
    thriving: 'costume_iron_armor_thriving_1200x344',
    happy: 'costume_iron_armor_happy_960x688',
    tired: 'costume_iron_armor_tired_960x688',
    neglected: 'costume_iron_armor_neglected_960x688',
    sleep: 'costume_iron_armor_sleep_1200x344',
    ouch: 'costume_iron_armor_ouch_960x688',
    welcome: 'costume_iron_armor_welcome_1800x1032',
  },
  spy_agent: {
    thriving: 'costume_spy_agent_thriving_1200x344',
    happy: 'costume_spy_agent_happy_960x688',
    tired: 'costume_spy_agent_tired_960x688',
    neglected: 'costume_spy_agent_neglected_960x688',
    sleep: 'costume_spy_agent_sleep_1200x344',
    ouch: 'costume_spy_agent_ouch_960x688',
    welcome: 'costume_spy_agent_welcome_1800x1032',
  },
  thunder_god: {
    thriving: 'costume_thunder_god_thriving_1200x344',
    happy: 'costume_thunder_god_happy_960x688',
    tired: 'costume_thunder_god_tired_960x688',
    neglected: 'costume_thunder_god_neglected_960x688',
    sleep: 'costume_thunder_god_sleep_1200x344',
    ouch: 'costume_thunder_god_ouch_960x688',
    welcome: 'costume_thunder_god_welcome_1800x1032',
  },
  green_giant: {
    thriving: 'costume_green_giant_thriving_1200x344',
    happy: 'costume_green_giant_happy_960x688',
    tired: 'costume_green_giant_tired_960x688',
    neglected: 'costume_green_giant_neglected_960x688',
    sleep: 'costume_green_giant_sleep_1200x344',
    ouch: 'costume_green_giant_ouch_960x688',
    welcome: 'costume_green_giant_welcome_1800x1032',
  },
  shield_hero: {
    thriving: 'costume_shield_hero_thriving_1200x344',
    happy: 'costume_shield_hero_happy_960x688',
    tired: 'costume_shield_hero_tired_960x688',
    neglected: 'costume_shield_hero_neglected_960x688',
    sleep: 'costume_shield_hero_sleep_1200x344',
    ouch: 'costume_shield_hero_ouch_960x688',
    welcome: 'costume_shield_hero_welcome_1800x1032',
  },
  violet_archer: {
    thriving: 'costume_violet_archer_thriving_1200x344',
    happy: 'costume_violet_archer_happy_960x688',
    tired: 'costume_violet_archer_tired_960x688',
    neglected: 'costume_violet_archer_neglected_960x688',
    sleep: 'costume_violet_archer_sleep_1200x344',
    ouch: 'costume_violet_archer_ouch_960x688',
    welcome: 'costume_violet_archer_welcome_1800x1032',
  },
  night_hero: {
    thriving: 'costume_night_hero_thriving_1200x344',
    happy: 'costume_night_hero_happy_960x688',
    tired: 'costume_night_hero_tired_960x688',
    neglected: 'costume_night_hero_neglected_960x688',
    sleep: 'costume_night_hero_sleep_1200x344',
    ouch: 'costume_night_hero_ouch_960x688',
    welcome: 'costume_night_hero_welcome_1800x1032',
  },
  sky_hero: {
    thriving: 'costume_sky_hero_thriving_1200x344',
    happy: 'costume_sky_hero_happy_960x688',
    tired: 'costume_sky_hero_tired_960x688',
    neglected: 'costume_sky_hero_neglected_960x688',
    sleep: 'costume_sky_hero_sleep_1200x344',
    ouch: 'costume_sky_hero_ouch_960x688',
    welcome: 'costume_sky_hero_welcome_1800x1032',
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
  still,
}: {
  anim: BearAnim;
  w: number;
  items?: ItemId[];
  label?: string;
  /** хөдөлгөөнгүй нэг frame (олон жижиг карт) */
  still?: boolean;
  /** sheet-ийн pixel → dp (sprite-ийн томруулалт, build-sprites.ts); shortcut: item-үүд 2×-д л бүртгэлтэй */
  px?: number;
}) {
  const costume = worn.find((id): id is CostumeId => id in costumes);
  const meta = costume ? costumes[costume][anim] : home[anim];
  const frame = useTagPlayer(meta, ['in'], 'loop', still);
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
