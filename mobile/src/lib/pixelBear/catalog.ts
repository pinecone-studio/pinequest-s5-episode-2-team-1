import type { ImageSourcePropType } from 'react-native';
import type { ItemId } from '@/components/LiveBear';
import type { SpriteKey } from '@/sprites';

// DESIGN.md §3 (дэвсгэр өнгө) ба §8-07 (хувцас). Зөвхөн харагдац: үнэ, эзэмшил серверээс
// (api/src/config/cosmetics.ts, нүдний шил ба чихэвч нь items хүснэгтэд).

export interface BgDef {
  id: string;
  name: string;
  hex: string;
  dark?: boolean;
  /** баавгайн ард харагдах зураг; hex нь зураг ачаалахаас өмнөх/swatch-ийн өнгө */
  image?: ImageSourcePropType;
  /** зураг биш, апп дотор pixel-ээр зурагдах үзэгдэл (components/BgArt) */
  scene?: 'space' | 'binary';
  /** баавгайн ард тусах гэрлийн өнгө (анхдагч нь theme-ийн halo) */
  halo?: string;
}

export const BACKGROUNDS: BgDef[] = [
  { id: 'nimbeg', name: 'Нимбэг', hex: '#F3F66C' },
  { id: 'tal', name: 'Тал', hex: '#A9D18E' },
  { id: 'yagaan', name: 'Ягаан', hex: '#F2CDE0' },
  { id: 'khukh', name: 'Хөх тэнгэр', hex: '#9FD0F2' },
  { id: 'lavanda', name: 'Лаванда', hex: '#D9D2F2' },
  { id: 'govi', name: 'Говь', hex: '#EBCF9B' },
  { id: 'ulbar', name: 'Улбар', hex: '#F7A97E' },
  { id: 'shunu', name: 'Шөнө', hex: '#22106E', dark: true },
  { id: 'zun_tal', name: 'Зуны тал', hex: '#8CC4EE', image: require('../../../assets/images/backgrounds/steppe-summer.webp') },
  { id: 'namar_oi', name: 'Намрын ой', hex: '#E29A45', image: require('../../../assets/images/backgrounds/autumn-forest.webp') },
  { id: 'od_shunu', name: 'Одтой шөнө', hex: '#1C1F4D', dark: true, image: require('../../../assets/images/backgrounds/steppe-night.webp') },
  { id: 'sakura', name: 'Интоорын хөндий', hex: '#F2B8D0', image: require('../../../assets/images/backgrounds/sakura-valley.webp') },
  { id: 'mogoi_shunu', name: 'Могойн шөнө', hex: '#2A2560', dark: true, image: require('../../../assets/images/backgrounds/serpent-night.webp') },
  { id: 'unegen_jarga', name: 'Үнэгний жаргал', hex: '#E8753A', image: require('../../../assets/images/backgrounds/fox-sunset.webp') },
  { id: 'sansar', name: 'Сансар', hex: '#FAFAF7', scene: 'space' },
  { id: 'kod', name: 'Код', hex: '#FAFAF7', scene: 'binary', halo: 'rgba(250,250,247,0.88)' },
];

export const DEFAULT_BG_ID = 'nimbeg';

export type OutfitId =
  | 'doctor_coat' | 'officer_coat' | 'officer_cap' | 'officer'
  | 'scarf'
  | 'vampire'
  | 'witch'
  | 'cyborg'
  | 'mummy'
  | 'liquid_cop'
  | 'robot'
  | 'wrestler'
  | 'brown_deel'
  | 'khuur'
  | 'archer'
  | 'leaf_ninja'
  | 'shadow_ninja'
  | 'blossom_ninja'
  | 'police'
  | 'doctor'
  | 'glasses_wizard'
  | 'book_wizard'
  | 'ginger_wizard'
  | 'footballer_7'
  | 'footballer_10'
  | 'pirate_captain'
  | 'hoop_23'
  | 'hoop_24'
  | 'iron_armor'
  | 'spy_agent'
  | 'thunder_god'
  | 'green_giant'
  | 'shield_hero'
  | 'violet_archer'
  | 'night_hero'
  | 'sky_hero';

export interface OutfitDef {
  id: OutfitId;
  name: string;
  tile: string;
  /** картын дээд хэсэгт баавгайн толгойг харуулах босоо шилжилт */
  imgTop: number;
  card: SpriteKey;
  /** амьд баавгайн толгойд өмсгөх давхарга (scripts/home-sprites.ts); ороолт нь баавгайн хөдөлгөөнд шингэсэн */
  item?: ItemId;
  /** хэд хэдэн item-ийг хамт өмсөх бол (доороос дээш дарааллаар); `item`-ийн оронд */
  items?: ItemId[];
  /** backend-д бодитоор байдаг эд зүйл (items хүснэгт): худалдан авалт сервер дээр хийгдэнэ */
  serverItemId?: string;
}

export const OUTFITS: OutfitDef[] = [
  { id: 'officer_cap', name: 'Офицерын малгай', tile: '#BCC8DE', imgTop: 0, card: 'outfit_officer_cap_82x140', item: 'officer_cap' },
  { id: 'scarf', name: 'Монгол ороолт', tile: '#D4F55E', imgTop: -26, card: 'outfit_scarf_82x140' },
  // PixelLab costumes first, so the newest outfits are the first the shop shows
  { id: 'vampire', name: 'Цус сорогч', tile: '#C9B8E8', imgTop: -26, card: 'outfit_vampire_82x140', item: 'vampire' },
  { id: 'witch', name: 'Шулам', tile: '#C9B8E8', imgTop: -26, card: 'outfit_witch_82x140', item: 'witch' },
  { id: 'shadow_ninja', name: 'Сүүдрийн нинжа', tile: '#BCC8DE', imgTop: -26, card: 'outfit_shadow_ninja_82x140', item: 'shadow_ninja' },
  { id: 'pirate_captain', name: 'Далайн дээрэмчин ахмад', tile: '#EBCF9B', imgTop: -26, card: 'outfit_pirate_captain_82x140', item: 'pirate_captain' },
  { id: 'hoop_23', name: 'Сагсчин №23', tile: '#F7A97E', imgTop: -26, card: 'outfit_hoop_23_82x140', item: 'hoop_23' },
  { id: 'hoop_24', name: 'Сагсчин №24', tile: '#D9D2F2', imgTop: -26, card: 'outfit_hoop_24_82x140', item: 'hoop_24' },
  { id: 'iron_armor', name: 'Төмөр хуяг', tile: '#F7A97E', imgTop: -26, card: 'outfit_iron_armor_82x140', item: 'iron_armor' },
  { id: 'spy_agent', name: 'Нууц агент', tile: '#B9B6C8', imgTop: -26, card: 'outfit_spy_agent_82x140', item: 'spy_agent' },
  { id: 'thunder_god', name: 'Аянгын бурхан', tile: '#BCC8DE', imgTop: -26, card: 'outfit_thunder_god_82x140', item: 'thunder_god' },
  { id: 'green_giant', name: 'Ногоон аварга', tile: '#A9D18E', imgTop: -26, card: 'outfit_green_giant_82x140', item: 'green_giant' },
  { id: 'night_hero', name: 'Шөнийн баатар', tile: '#B9B6C8', imgTop: -26, card: 'outfit_night_hero_82x140', item: 'night_hero' },
  { id: 'sky_hero', name: 'Тэнгэрийн баатар', tile: '#9FD0F2', imgTop: -26, card: 'outfit_sky_hero_82x140', item: 'sky_hero' },
  { id: 'violet_archer', name: 'Ягаан харваач', tile: '#D9D2F2', imgTop: -26, card: 'outfit_violet_archer_82x140', item: 'violet_archer' },
  { id: 'shield_hero', name: 'Бамбайт баатар', tile: '#9FD0F2', imgTop: -26, card: 'outfit_shield_hero_82x140', item: 'shield_hero' },
  { id: 'footballer_7', name: 'Хөлбөмбөгчин №7', tile: '#A9D18E', imgTop: -26, card: 'outfit_footballer_7_82x140', item: 'footballer_7' },
  { id: 'footballer_10', name: 'Хөлбөмбөгчин №10', tile: '#9FD0F2', imgTop: -26, card: 'outfit_footballer_10_82x140', item: 'footballer_10' },
  { id: 'glasses_wizard', name: 'Нүдний шилтэй шидтэн', tile: '#C9B8E8', imgTop: -26, card: 'outfit_glasses_wizard_82x140', item: 'glasses_wizard' },
  { id: 'book_wizard', name: 'Номтой шидтэн', tile: '#C9B8E8', imgTop: -26, card: 'outfit_book_wizard_82x140', item: 'book_wizard' },
  { id: 'ginger_wizard', name: 'Улаан үст шидтэн', tile: '#C9B8E8', imgTop: -26, card: 'outfit_ginger_wizard_82x140', item: 'ginger_wizard' },
  { id: 'police', name: 'Цагдаа', tile: '#BCC8DE', imgTop: -26, card: 'outfit_police_82x140', item: 'police' },
  { id: 'doctor', name: 'Эмч', tile: '#C8E8F4', imgTop: -26, card: 'outfit_doctor_82x140', item: 'doctor' },
  { id: 'blossom_ninja', name: 'Цэцгийн нинжа', tile: '#F2CDE0', imgTop: -26, card: 'outfit_blossom_ninja_82x140', item: 'blossom_ninja' },
  { id: 'leaf_ninja', name: 'Навчны нинжа', tile: '#F7A97E', imgTop: -26, card: 'outfit_leaf_ninja_82x140', item: 'leaf_ninja' },
  { id: 'wrestler', name: 'Бөх', tile: '#BCC8DE', imgTop: -26, card: 'outfit_wrestler_82x140', item: 'wrestler' },
  { id: 'brown_deel', name: 'Хүрэн дээл', tile: '#DDBB8E', imgTop: -26, card: 'outfit_brown_deel_82x140', item: 'brown_deel' },
  { id: 'khuur', name: 'Морин хуурч', tile: '#D4F55E', imgTop: -26, card: 'outfit_khuur_82x140', item: 'khuur' },
  { id: 'archer', name: 'Харваач', tile: '#EBCF9B', imgTop: -26, card: 'outfit_archer_82x140', item: 'archer' },
  { id: 'mummy', name: 'Мумми', tile: '#EBDCC0', imgTop: -26, card: 'outfit_mummy_82x140', item: 'mummy' },
  { id: 'liquid_cop', name: 'Шингэн төмөр цагдаа', tile: '#BCC8DE', imgTop: -26, card: 'outfit_liquid_cop_82x140', item: 'liquid_cop' },
  { id: 'robot', name: 'Робот', tile: '#B9B6C8', imgTop: -26, card: 'outfit_robot_82x140', item: 'robot' },
  { id: 'cyborg', name: 'Терминатор', tile: '#B9B6C8', imgTop: -26, card: 'outfit_cyborg_82x140', item: 'cyborg' },
];

export const DEFAULT_OUTFIT_ID: OutfitId = 'scarf';

export const bgById = (id: string): BgDef => BACKGROUNDS.find((b) => b.id === id) ?? BACKGROUNDS[0];
export const outfitById = (id: string): OutfitDef => OUTFITS.find((o) => o.id === id) ?? OUTFITS[0];
/** амьд баавгайд өмсгөх item-үүд */
export const outfitItems = (o: OutfitDef): ItemId[] => o.items ?? (o.item ? [o.item] : []);

/**
 * Хувцсыг хослуулж өмсөх: item бүр биеийн нэг байрлалтай. Шинэ хувцас өмсөхөд ижил байрлалтай (жишээ нь хоёр малгай)
 * хувцас тайлагдана, бусад нь үлдэнэ: малгай + нүдний шил + таяг зэрэг өмсөгдөнө.
 */
export type Slot = 'head' | 'face' | 'neck' | 'body' | 'back' | 'waist' | 'legs' | 'feet' | 'hand' | 'offhand';
const ITEM_SLOT: Record<ItemId, Slot> = {
  doctor_coat: 'body', officer_coat: 'body', officer_cap: 'head',
  gradcap: 'head', warrior_helmet: 'head', ny_cap: 'head', pirate_hat: 'head', cowboy_hat: 'head', white_headscarf: 'head',
  hard_hat: 'head', ribbon: 'head', mongol_hat: 'head', puss_hat: 'head', headphones: 'head',
  headband: 'head', demon_horns: 'head', ninja_headband: 'head', straw_hat: 'head',
  // бүтэн нүүр, толгойг бүрхдэг маск толгойн байрлал эзэлнэ
  batman_mask: 'head', mickey_mask: 'head',
  glasses: 'face', snorkel: 'face',
  hiphop_chain: 'neck',
  batman_suit: 'body', mongol_deel: 'body', sport_hoodie: 'body', pirate_shirt: 'body', wizard_robe: 'body',
  demon_cape: 'body', ninja_jacket: 'body', straw_shirt: 'body', vampire: 'body', witch: 'body', cyborg: 'body',
  mummy: 'body', liquid_cop: 'body', robot: 'body', wrestler: 'body', brown_deel: 'body', khuur: 'body', archer: 'body', leaf_ninja: 'body', shadow_ninja: 'body', blossom_ninja: 'body', police: 'body', doctor: 'body', glasses_wizard: 'body', book_wizard: 'body', ginger_wizard: 'body', footballer_7: 'body', footballer_10: 'body', pirate_captain: 'body', hoop_23: 'body', hoop_24: 'body', iron_armor: 'body', spy_agent: 'body', thunder_god: 'body', green_giant: 'body', shield_hero: 'body', violet_archer: 'body', night_hero: 'body', sky_hero: 'body',
  puss_cape: 'back', puss_belt: 'waist', sport_shorts: 'legs', ninja_pants: 'legs', straw_shorts: 'legs',
  brown_boots: 'feet', pirate_boots: 'feet', mongol_boots: 'feet', sport_sneakers: 'feet',
  demon_boots: 'feet', ninja_sandals: 'feet', straw_sandals: 'feet',
  staff00: 'hand', staff03: 'hand', staff04: 'hand', staff05: 'hand', holly_staff: 'hand', pestilence_staff: 'hand',
  w_staff_256: 'hand', black_sword: 'hand', wizard_wand: 'hand', pirate_sword: 'hand',
  bronze_shield: 'offhand',
};
/** Баавгайн суурь зургийг бүхэлд нь солидог item-ууд (LiveBear): нэг дор зөвхөн нэг нь. */
const BASE_ITEMS: readonly ItemId[] = ['warrior_helmet', 'batman_suit', 'mongol_deel', 'white_headscarf', 'brown_boots', 'doctor_coat', 'officer_coat'];
/** Урт хормойтой хувцас өмд, гутлын байрлалыг ч эзэлнэ. */
const ALSO_COVERS: Partial<Record<ItemId, readonly Slot[]>> = { doctor_coat: ['legs', 'feet'], officer_coat: ['legs', 'feet'] };

/** Нэг item-тэй хувцасны байрлал (дэлгүүрийн ангилалд); иж бүрдэл, анхдагч ороолтод null. */
export function outfitSlot(id: OutfitId): Slot | null {
  const items = outfitItems(outfitById(id));
  return items.length === 1 ? ITEM_SLOT[items[0]] : null;
}

/** a costume with its own motions (LiveBear) is the whole bear: it takes every place, so nothing is worn with it */
const WHOLE_ITEMS: readonly ItemId[] = ['witch', 'cyborg', 'mummy', 'liquid_cop', 'robot', 'wrestler', 'brown_deel', 'khuur', 'archer', 'leaf_ninja', 'shadow_ninja', 'blossom_ninja', 'police', 'doctor', 'glasses_wizard', 'book_wizard', 'ginger_wizard', 'footballer_7', 'footballer_10', 'pirate_captain', 'hoop_23', 'hoop_24', 'iron_armor', 'spy_agent', 'thunder_god', 'green_giant', 'shield_hero', 'violet_archer', 'night_hero', 'sky_hero'];
const ALL_SLOTS = [...new Set(Object.values(ITEM_SLOT)), 'base'];
const slotsOf = (id: OutfitId): string[] =>
  outfitItems(outfitById(id)).flatMap((it) => (WHOLE_ITEMS.includes(it) ? ALL_SLOTS : [ITEM_SLOT[it], ...(ALSO_COVERS[it] ?? []), ...(BASE_ITEMS.includes(it) ? ['base'] : [])]));

/** Өмссөн хувцсуудын хадгалах хэлбэр ('pirate_hat+glasses+staff00'); хоосон бол анхдагч ороолт. */
export const joinWorn = (ids: readonly OutfitId[]): string => (ids.length ? ids.join('+') : DEFAULT_OUTFIT_ID);
export function parseWorn(value: string | null | undefined): OutfitId[] {
  const ids = (value ?? '').split('+').filter((id): id is OutfitId => id !== DEFAULT_OUTFIT_ID && OUTFITS.some((o) => o.id === id));
  return [...new Set(ids)];
}

/** `id`-г өмсөнө (ижил байрлалтайг тайлна) эсвэл өмссөн бол тайлна. Анхдагч ороолт бүгдийг тайлна. */
export function toggleWorn(worn: readonly OutfitId[], id: OutfitId): OutfitId[] {
  if (id === DEFAULT_OUTFIT_ID) return [];
  if (worn.includes(id)) return worn.filter((w) => w !== id);
  const slots = slotsOf(id);
  return [...worn.filter((w) => !slotsOf(w).some((s) => slots.includes(s))), id];
}

export const isWorn = (worn: readonly OutfitId[], id: OutfitId) => (id === DEFAULT_OUTFIT_ID ? worn.length === 0 : worn.includes(id));

/** Өмссөн бүх хувцасны item-ууд (амьд баавгайд). */
export const wornItems = (worn: readonly OutfitId[]): ItemId[] => [...new Set(worn.flatMap((id) => outfitItems(outfitById(id))))];
