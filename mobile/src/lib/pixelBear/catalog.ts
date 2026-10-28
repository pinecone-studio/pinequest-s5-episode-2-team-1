import type { ItemId } from '@/components/LiveBear';
import type { SpriteKey } from '@/sprites';

// DESIGN.md §3 (дэвсгэр өнгө) ба §8-07 (хувцас). Зөвхөн харагдац: үнэ, эзэмшил серверээс
// (api/src/config/cosmetics.ts, нүдний шил ба чихэвч нь items хүснэгтэд).

export interface BgDef {
  id: string;
  name: string;
  hex: string;
  dark?: boolean;
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
  | 'batman_suit'
  | 'batman'
  | 'ny_cap'
  | 'hiphop_chain'
  | 'mickey_mask'
  | 'pirate_hat'
  | 'pirate_shirt'
  | 'pirate_boots'
  | 'pirate_sword'
  | 'pirate'
  | 'wizard_wand'
  | 'wizard_robe'
  | 'wizard'
  | 'hero'
  | 'demon_horns'
  | 'demon_cape'
  | 'demon_boots'
  | 'demon'
  | 'ninja_headband'
  | 'ninja_jacket'
  | 'ninja_pants'
  | 'ninja_sandals'
  | 'ninja'
  | 'straw_hat'
  | 'straw_shirt'
  | 'straw_shorts'
  | 'straw_sandals'
  | 'strawhat'
  | 'cowboy_hat'
  | 'white_headscarf'
  | 'brown_boots'
  | 'hard_hat'
  | 'snorkel'
  | 'ribbon'
  | 'headband'
  | 'mongol_hat'
  | 'mongol_deel'
  | 'mongol'
  | 'mongol_boots'
  | 'puss_hat'
  | 'puss_belt'
  | 'puss_cape'
  | 'puss'
  | 'sport_hoodie'
  | 'sport_shorts'
  | 'sport_sneakers'
  | 'sport'
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
  { id: 'doctor_coat', name: 'Эмчийн хувцас', tile: '#C8E8F4', imgTop: -40, card: 'outfit_doctor_coat_82x140', item: 'doctor_coat' },
  { id: 'officer', name: 'Офицерын бүтэн өмсгөл', tile: '#BCC8DE', imgTop: -26, card: 'outfit_officer_82x140', items: ['officer_coat', 'officer_cap'] },
  { id: 'officer_coat', name: 'Офицерын дүрэмт хувцас', tile: '#BCC8DE', imgTop: -40, card: 'outfit_officer_coat_82x140', item: 'officer_coat' },
  { id: 'officer_cap', name: 'Офицерын малгай', tile: '#BCC8DE', imgTop: 0, card: 'outfit_officer_cap_82x140', item: 'officer_cap' },
  { id: 'scarf', name: 'Монгол ороолт', tile: '#D4F55E', imgTop: -26, card: 'outfit_scarf_82x140' },
  { id: 'warrior_helmet', name: 'Баатрын дуулга', tile: '#EBCF9B', imgTop: 0, card: 'outfit_warrior_helmet_82x140', item: 'warrior_helmet' },
  { id: 'hero', name: 'Баатар', tile: '#EBCF9B', imgTop: 0, card: 'outfit_hero_82x140', items: ['warrior_helmet', 'black_sword'] },
  { id: 'pirate_hat', name: 'Далайн дээрэмчний малгай', tile: '#EBCF9B', imgTop: 0, card: 'outfit_pirate_hat_82x140', item: 'pirate_hat' },
  { id: 'pirate_shirt', name: 'Далайн дээрэмчний хувцас', tile: '#EBCF9B', imgTop: -40, card: 'outfit_pirate_shirt_82x140', item: 'pirate_shirt' },
  { id: 'pirate_boots', name: 'Далайн дээрэмчний гутал', tile: '#DDBB8E', imgTop: -52, card: 'outfit_pirate_boots_82x140', item: 'pirate_boots' },
  { id: 'pirate_sword', name: 'Далайн дээрэмчний сэлэм', tile: '#B9C8E0', imgTop: -52, card: 'outfit_pirate_sword_82x140', item: 'pirate_sword' },
  { id: 'wizard_robe', name: 'Шидтэний нөмрөг', tile: '#C9B8E8', imgTop: -40, card: 'outfit_wizard_robe_82x140', item: 'wizard_robe' },
  { id: 'wizard_wand', name: 'Шидэт саваа', tile: '#D9D2F2', imgTop: -52, card: 'outfit_wizard_wand_82x140', item: 'wizard_wand' },
  { id: 'wizard', name: 'Шидтэн', tile: '#F9D97A', imgTop: -26, card: 'outfit_wizard_82x140', items: ['wizard_robe', 'glasses', 'wizard_wand'] },
  { id: 'demon_horns', name: 'Чөтгөрийн эвэр', tile: '#E8A0A0', imgTop: 0, card: 'outfit_demon_horns_82x140', item: 'demon_horns' },
  { id: 'demon_cape', name: 'Өдөн нөмрөг', tile: '#B8B0C8', imgTop: -40, card: 'outfit_demon_cape_82x140', item: 'demon_cape' },
  { id: 'demon_boots', name: 'Галт гутал', tile: '#9FD8CF', imgTop: -52, card: 'outfit_demon_boots_82x140', item: 'demon_boots' },
  { id: 'demon', name: 'Чөтгөр', tile: '#F2A65A', imgTop: -26, card: 'outfit_demon_82x140', items: ['demon_cape', 'demon_boots', 'demon_horns'] },
  { id: 'ninja_headband', name: 'Нинжагийн духны боолт', tile: '#AEB8D8', imgTop: 0, card: 'outfit_ninja_headband_82x140', item: 'ninja_headband' },
  { id: 'ninja_jacket', name: 'Нинжагийн куртка', tile: '#F7B77A', imgTop: -40, card: 'outfit_ninja_jacket_82x140', item: 'ninja_jacket' },
  { id: 'ninja_pants', name: 'Нинжагийн өмд', tile: '#F7B77A', imgTop: -52, card: 'outfit_ninja_pants_82x140', item: 'ninja_pants' },
  { id: 'ninja_sandals', name: 'Нинжагийн шаахай', tile: '#C8CCD6', imgTop: -52, card: 'outfit_ninja_sandals_82x140', item: 'ninja_sandals' },
  { id: 'ninja', name: 'Нинжа', tile: '#F2A65A', imgTop: -26, card: 'outfit_ninja_82x140', items: ['ninja_sandals', 'ninja_pants', 'ninja_jacket', 'ninja_headband'] },
  { id: 'straw_hat', name: 'Сүрэл малгай', tile: '#F2DC9B', imgTop: 0, card: 'outfit_straw_hat_82x140', item: 'straw_hat' },
  { id: 'straw_shirt', name: 'Улаан задгай цамц', tile: '#F2A0A0', imgTop: -40, card: 'outfit_straw_shirt_82x140', item: 'straw_shirt' },
  { id: 'straw_shorts', name: 'Цэнхэр шорт', tile: '#A8C4F0', imgTop: -52, card: 'outfit_straw_shorts_82x140', item: 'straw_shorts' },
  { id: 'straw_sandals', name: 'Сүрэл шаахай', tile: '#E3C79A', imgTop: -52, card: 'outfit_straw_sandals_82x140', item: 'straw_sandals' },
  { id: 'strawhat', name: 'Сүрэл малгайт далайчин', tile: '#F9D97A', imgTop: -26, card: 'outfit_strawhat_82x140', items: ['straw_sandals', 'straw_shorts', 'straw_shirt', 'straw_hat'] },
  { id: 'pirate', name: 'Далайн дээрэмчин', tile: '#C9B8E8', imgTop: -26, card: 'outfit_pirate_82x140', items: ['pirate_shirt', 'pirate_boots', 'pirate_hat', 'pirate_sword'] },
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
  { id: 'hiphop_chain', name: 'Hip Hop гинж', tile: '#F7A97E', imgTop: -40, card: 'outfit_hiphop_chain_82x140', item: 'hiphop_chain' },
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
  { id: 'batman_suit', name: 'Batman хувцас', tile: '#9FD0F2', imgTop: -40, card: 'outfit_batman_suit_82x140', item: 'batman_suit' },
  { id: 'mongol_hat', name: 'Монгол малгай', tile: '#D4F55E', imgTop: 0, card: 'outfit_mongol_hat_82x140', item: 'mongol_hat' },
  { id: 'mongol_deel', name: 'Монгол дээл', tile: '#D4F55E', imgTop: -40, card: 'outfit_mongol_deel_82x140', item: 'mongol_deel' },
  { id: 'mongol_boots', name: 'Монгол гутал', tile: '#F9D97A', imgTop: -52, card: 'outfit_mongol_boots_82x140', item: 'mongol_boots' },
  { id: 'mongol', name: 'Монгол хувцас', tile: '#9FD0F2', imgTop: -26, card: 'outfit_mongol_82x140', items: ['mongol_deel', 'mongol_boots', 'mongol_hat'] },
  { id: 'puss_hat', name: 'Муурын малгай', tile: '#F9D97A', imgTop: 0, card: 'outfit_puss_hat_82x140', item: 'puss_hat' },
  { id: 'puss_belt', name: 'Муурын бүс', tile: '#DDBB8E', imgTop: -52, card: 'outfit_puss_belt_82x140', item: 'puss_belt' },
  { id: 'puss_cape', name: 'Нөмрөг', tile: '#C9B8E8', imgTop: -40, card: 'outfit_puss_cape_82x140', item: 'puss_cape' },
  { id: 'puss', name: 'Гуталтай муур', tile: '#F9D97A', imgTop: -26, card: 'outfit_puss_82x140', items: ['puss_cape', 'brown_boots', 'puss_belt', 'puss_hat'] },
  { id: 'sport_hoodie', name: 'Спорт hoodie', tile: '#B8E6D2', imgTop: -40, card: 'outfit_sport_hoodie_82x140', item: 'sport_hoodie' },
  { id: 'sport_shorts', name: 'Спорт шорт', tile: '#C9B8E8', imgTop: -52, card: 'outfit_sport_shorts_82x140', item: 'sport_shorts' },
  { id: 'sport_sneakers', name: 'Пүүз', tile: '#F2B8D8', imgTop: -52, card: 'outfit_sport_sneakers_82x140', item: 'sport_sneakers' },
  { id: 'sport', name: 'Спорт хувцас', tile: '#B8E6D2', imgTop: -26, card: 'outfit_sport_82x140', items: ['sport_sneakers', 'sport_shorts', 'sport_hoodie'] },
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
  demon_cape: 'body', ninja_jacket: 'body', straw_shirt: 'body',
  puss_cape: 'back', puss_belt: 'waist', sport_shorts: 'legs', ninja_pants: 'legs', straw_shorts: 'legs',
  brown_boots: 'feet', pirate_boots: 'feet', mongol_boots: 'feet', sport_sneakers: 'feet',
  demon_boots: 'feet', ninja_sandals: 'feet', straw_sandals: 'feet',
  staff00: 'hand', staff03: 'hand', staff04: 'hand', staff05: 'hand', holly_staff: 'hand', pestilence_staff: 'hand',
  w_staff_256: 'hand', black_sword: 'hand', wizard_wand: 'hand', pirate_sword: 'hand',
  bronze_shield: 'offhand',
};
/** Баавгайн суурь зургийг бүхэлд нь солидог item-ууд (LiveBear): нэг дор зөвхөн нэг нь. */
const BASE_ITEMS: readonly ItemId[] = ['warrior_helmet', 'batman_suit', 'mongol_deel', 'white_headscarf', 'brown_boots'];

/** Нэг item-тэй хувцасны байрлал (дэлгүүрийн ангилалд); иж бүрдэл, анхдагч ороолтод null. */
export function outfitSlot(id: OutfitId): Slot | null {
  const items = outfitItems(outfitById(id));
  return items.length === 1 ? ITEM_SLOT[items[0]] : null;
}

const slotsOf = (id: OutfitId): string[] =>
  outfitItems(outfitById(id)).flatMap((it) => [ITEM_SLOT[it], ...(['doctor_coat', 'officer_coat'].includes(it) ? ['feet'] : []), ...(['doctor_coat', 'officer_coat'].includes(it) ? ['legs'] : []), ...(BASE_ITEMS.includes(it) ? ['base'] : [])]);

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
