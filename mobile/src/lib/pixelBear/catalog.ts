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
  { id: 'sansar', name: 'Сансар', hex: '#FAFAF7', scene: 'space' },
  { id: 'kod', name: 'Код', hex: '#FAFAF7', scene: 'binary', halo: 'rgba(250,250,247,0.88)' },
];

export const DEFAULT_BG_ID = 'nimbeg';

const STAFF_OUTFITS = [
  { id: 'staff00', name: 'Модон таяг', tile: '#D9D2F2', imgTop: -52, card: 'outfit_staff00_82x140', item: 'staff00' },
  { id: 'staff03', name: 'Мөнгөн таяг', tile: '#D9D2F2', imgTop: -52, card: 'outfit_staff03_82x140', item: 'staff03' },
  { id: 'staff04', name: 'Галт таяг', tile: '#D9D2F2', imgTop: -52, card: 'outfit_staff04_82x140', item: 'staff04' },
  { id: 'staff05', name: 'Алтан таяг', tile: '#D9D2F2', imgTop: -52, card: 'outfit_staff05_82x140', item: 'staff05' },
  { id: 'holly_staff', name: 'Ариун таяг', tile: '#D9D2F2', imgTop: -52, card: 'outfit_holly_staff_82x140', item: 'holly_staff' },
  { id: 'pestilence_staff', name: 'Хар шидийн таяг', tile: '#D9D2F2', imgTop: -52, card: 'outfit_pestilence_staff_82x140', item: 'pestilence_staff' },
  { id: 'w_staff_256', name: 'Болор таяг', tile: '#D9D2F2', imgTop: -52, card: 'outfit_w_staff_256_82x140', item: 'w_staff_256' },
  { id: 'black_sword', name: 'Баатрын сэлэм', tile: '#B9B6C8', imgTop: -52, card: 'outfit_black_sword_82x140', item: 'black_sword' },
  { id: 'bronze_shield', name: 'Одтой бамбай', tile: '#EBCF9B', imgTop: -52, card: 'outfit_bronze_shield_82x140', item: 'bronze_shield' },
] as const;

export type OutfitId =
  | 'doctor_coat' | 'officer_coat' | 'officer_cap' | 'officer'
  | 'scarf'
  | 'glasses'
  | 'gradcap'
  | 'headphones'
  | 'warrior_helmet'
  | 'batman_mask'
  | 'batman'
  | 'ny_cap'
  | 'mickey_mask'
  | 'pirate_hat'
  | 'pirate_boots'
  | 'pirate_sword'
  | 'wizard_wand'
  | 'wizard'
  | 'hero'
  | 'demon_horns'
  | 'demon_boots'
  | 'demon'
  | 'ninja_headband'
  | 'ninja_sandals'
  | 'straw_hat'
  | 'straw_sandals'
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
  | 'cowboy_hat'
  | 'white_headscarf'
  | 'brown_boots'
  | 'hard_hat'
  | 'snorkel'
  | 'ribbon'
  | 'headband'
  | 'mongol_hat'
  | 'mongol_boots'
  | 'puss_hat'
  | 'puss'
  | 'sport_sneakers'
  | (typeof STAFF_OUTFITS)[number]['id'];

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
  { id: 'warrior_helmet', name: 'Баатрын дуулга', tile: '#EBCF9B', imgTop: 0, card: 'outfit_warrior_helmet_82x140', item: 'warrior_helmet' },
  { id: 'hero', name: 'Баатар', tile: '#EBCF9B', imgTop: 0, card: 'outfit_hero_82x140', items: ['warrior_helmet', 'black_sword'] },
  { id: 'pirate_hat', name: 'Далайн дээрэмчний малгай', tile: '#EBCF9B', imgTop: 0, card: 'outfit_pirate_hat_82x140', item: 'pirate_hat' },
  { id: 'pirate_boots', name: 'Далайн дээрэмчний гутал', tile: '#DDBB8E', imgTop: -52, card: 'outfit_pirate_boots_82x140', item: 'pirate_boots' },
  { id: 'pirate_sword', name: 'Далайн дээрэмчний сэлэм', tile: '#B9C8E0', imgTop: -52, card: 'outfit_pirate_sword_82x140', item: 'pirate_sword' },
  { id: 'wizard_wand', name: 'Шидэт саваа', tile: '#D9D2F2', imgTop: -52, card: 'outfit_wizard_wand_82x140', item: 'wizard_wand' },
  { id: 'wizard', name: 'Шидтэн', tile: '#F9D97A', imgTop: -26, card: 'outfit_wizard_82x140', items: ['wizard_robe', 'glasses', 'wizard_wand'] },
  { id: 'demon_horns', name: 'Чөтгөрийн эвэр', tile: '#E8A0A0', imgTop: 0, card: 'outfit_demon_horns_82x140', item: 'demon_horns' },
  { id: 'demon_boots', name: 'Галт гутал', tile: '#9FD8CF', imgTop: -52, card: 'outfit_demon_boots_82x140', item: 'demon_boots' },
  { id: 'demon', name: 'Чөтгөр', tile: '#F2A65A', imgTop: -26, card: 'outfit_demon_82x140', items: ['demon_cape', 'demon_boots', 'demon_horns'] },
  { id: 'ninja_headband', name: 'Нинжагийн духны боолт', tile: '#AEB8D8', imgTop: 0, card: 'outfit_ninja_headband_82x140', item: 'ninja_headband' },
  { id: 'ninja_sandals', name: 'Нинжагийн шаахай', tile: '#C8CCD6', imgTop: -52, card: 'outfit_ninja_sandals_82x140', item: 'ninja_sandals' },
  { id: 'straw_hat', name: 'Сүрэл малгай', tile: '#F2DC9B', imgTop: 0, card: 'outfit_straw_hat_82x140', item: 'straw_hat' },
  { id: 'straw_sandals', name: 'Сүрэл шаахай', tile: '#E3C79A', imgTop: -52, card: 'outfit_straw_sandals_82x140', item: 'straw_sandals' },
  { id: 'cowboy_hat', name: 'Ковбой малгай', tile: '#EBCF9B', imgTop: 0, card: 'outfit_cowboy_hat_82x140', item: 'cowboy_hat' },
  { id: 'white_headscarf', name: 'Хээтэй алчуур', tile: '#F2F2F7', imgTop: 0, card: 'outfit_white_headscarf_82x140', item: 'white_headscarf' },
  { id: 'brown_boots', name: 'Муурын гутал', tile: '#DDBB8E', imgTop: -52, card: 'outfit_brown_boots_82x140', item: 'brown_boots' },
  {
    id: 'glasses',
    name: 'Нүдний шил',
    tile: '#AEDDF3',
    imgTop: -12,
    item: 'glasses',
    card: 'outfit_glasses_82x140',
    serverItemId: 'acc_glasses',
  },
  { id: 'ny_cap', name: 'NY малгай', tile: '#AEDDF3', imgTop: 0, card: 'outfit_ny_cap_82x140', item: 'ny_cap' },
  { id: 'mickey_mask', name: 'Микки маск', tile: '#F2C6D8', imgTop: 0, card: 'outfit_mickey_mask_82x140', item: 'mickey_mask' },
  { id: 'hard_hat', name: 'Барилгын малгай', tile: '#F9D97A', imgTop: 0, card: 'outfit_hard_hat_82x140', item: 'hard_hat' },
  { id: 'snorkel', name: 'Шумбагчийн маск', tile: '#9FE3D6', imgTop: 0, card: 'outfit_snorkel_82x140', item: 'snorkel' },
  { id: 'ribbon', name: 'Улаан тууз', tile: '#F7B6C2', imgTop: 0, card: 'outfit_ribbon_82x140', item: 'ribbon' },
  { id: 'headband', name: 'Хээтэй толгойн алчуур', tile: '#E8B4A0', imgTop: 0, card: 'outfit_headband_82x140', item: 'headband' },
  { id: 'gradcap', name: 'Төгсөгчийн малгай', tile: '#F3F66C', imgTop: 0, card: 'outfit_gradcap_82x140', item: 'gradcap' },
  {
    id: 'headphones',
    name: 'Чихэвч',
    tile: '#D9D2F2',
    imgTop: -4,
    item: 'headphones',
    card: 'outfit_headphones_82x140',
    serverItemId: 'acc_headphones',
  },
  { id: 'batman_mask', name: 'Batman маск', tile: '#9FD0F2', imgTop: 0, card: 'outfit_batman_mask_82x140', item: 'batman_mask' },
  { id: 'mongol_hat', name: 'Монгол малгай', tile: '#D4F55E', imgTop: 0, card: 'outfit_mongol_hat_82x140', item: 'mongol_hat' },
  { id: 'mongol_boots', name: 'Монгол гутал', tile: '#F9D97A', imgTop: -52, card: 'outfit_mongol_boots_82x140', item: 'mongol_boots' },
  { id: 'puss_hat', name: 'Муурын малгай', tile: '#F9D97A', imgTop: 0, card: 'outfit_puss_hat_82x140', item: 'puss_hat' },
  { id: 'puss', name: 'Гуталтай муур', tile: '#F9D97A', imgTop: -26, card: 'outfit_puss_82x140', items: ['puss_cape', 'brown_boots', 'puss_belt', 'puss_hat'] },
  { id: 'sport_sneakers', name: 'Пүүз', tile: '#F2B8D8', imgTop: -52, card: 'outfit_sport_sneakers_82x140', item: 'sport_sneakers' },
  { id: 'batman', name: 'Batman', tile: '#22106E', imgTop: -26, card: 'outfit_batman_82x140', items: ['batman_suit', 'batman_mask'] },
  ...STAFF_OUTFITS,
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
  mummy: 'body', liquid_cop: 'body', robot: 'body', wrestler: 'body', brown_deel: 'body', khuur: 'body', archer: 'body', leaf_ninja: 'body', shadow_ninja: 'body', blossom_ninja: 'body',
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
const WHOLE_ITEMS: readonly ItemId[] = ['witch', 'cyborg', 'mummy', 'liquid_cop', 'robot', 'wrestler', 'brown_deel', 'khuur', 'archer', 'leaf_ninja', 'shadow_ninja', 'blossom_ninja'];
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
