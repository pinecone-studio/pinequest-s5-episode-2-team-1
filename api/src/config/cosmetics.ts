// Баавгайн дэвсгэр өнгө, хувцас (Pixel Bear UI). Харагдац нь mobile/src/lib/pixelBear/catalog.ts-д,
// үнэ, эзэмшил, худалдан авалт энд (серверт). price = 0 бол бүх хүнд анхнаасаа байгаа.
// Нүдний шил, чихэвч нь items хүснэгтийн бодит эд зүйл (acc_glasses, acc_headphones) тул энд байхгүй.
import type { BearLook, CosmeticKind } from '../../../shared/types';

export interface Cosmetic {
  id: string;
  kind: CosmeticKind;
  /** mobile catalog дахь id */
  key: string;
  price: number;
}

export const COSMETICS: readonly Cosmetic[] = [
  { id: 'bg_nimbeg', kind: 'bg', key: 'nimbeg', price: 0 },
  { id: 'bg_tal', kind: 'bg', key: 'tal', price: 0 },
  { id: 'bg_yagaan', kind: 'bg', key: 'yagaan', price: 60 },
  { id: 'bg_khukh', kind: 'bg', key: 'khukh', price: 60 },
  { id: 'bg_lavanda', kind: 'bg', key: 'lavanda', price: 90 },
  { id: 'bg_govi', kind: 'bg', key: 'govi', price: 90 },
  { id: 'bg_ulbar', kind: 'bg', key: 'ulbar', price: 120 },
  { id: 'bg_shunu', kind: 'bg', key: 'shunu', price: 1000 },
  { id: 'bg_zun_tal', kind: 'bg', key: 'zun_tal', price: 600 },
  { id: 'bg_namar_oi', kind: 'bg', key: 'namar_oi', price: 800 },
  { id: 'bg_od_shunu', kind: 'bg', key: 'od_shunu', price: 1200 },
  { id: 'bg_sansar', kind: 'bg', key: 'sansar', price: 900 },
  { id: 'bg_kod', kind: 'bg', key: 'kod', price: 700 },
  { id: 'outfit_scarf', kind: 'outfit', key: 'scarf', price: 0 },
  { id: 'outfit_gradcap', kind: 'outfit', key: 'gradcap', price: 300 },
  { id: 'outfit_warrior_helmet', kind: 'outfit', key: 'warrior_helmet', price: 600 },
  { id: 'outfit_ny_cap', kind: 'outfit', key: 'ny_cap', price: 350 },
  { id: 'outfit_hiphop_chain', kind: 'outfit', key: 'hiphop_chain', price: 450 },
  { id: 'outfit_mickey_mask', kind: 'outfit', key: 'mickey_mask', price: 600 },
  { id: 'outfit_hard_hat', kind: 'outfit', key: 'hard_hat', price: 350 },
  { id: 'outfit_snorkel', kind: 'outfit', key: 'snorkel', price: 400 },
  { id: 'outfit_ribbon', kind: 'outfit', key: 'ribbon', price: 250 },
  { id: 'outfit_headband', kind: 'outfit', key: 'headband', price: 350 },
  { id: 'outfit_batman_mask', kind: 'outfit', key: 'batman_mask', price: 500 },
  { id: 'outfit_batman_suit', kind: 'outfit', key: 'batman_suit', price: 800 },
  { id: 'outfit_batman', kind: 'outfit', key: 'batman', price: 1200 },
  { id: 'outfit_mongol_hat', kind: 'outfit', key: 'mongol_hat', price: 400 },
  { id: 'outfit_mongol_deel', kind: 'outfit', key: 'mongol_deel', price: 800 },
  { id: 'outfit_mongol_boots', kind: 'outfit', key: 'mongol_boots', price: 500 },
  { id: 'outfit_mongol', kind: 'outfit', key: 'mongol', price: 1100 },
  { id: 'outfit_puss_hat', kind: 'outfit', key: 'puss_hat', price: 450 },
  { id: 'outfit_puss_belt', kind: 'outfit', key: 'puss_belt', price: 300 },
  { id: 'outfit_puss_cape', kind: 'outfit', key: 'puss_cape', price: 500 },
  { id: 'outfit_puss', kind: 'outfit', key: 'puss', price: 1500 },
  { id: 'outfit_sport_hoodie', kind: 'outfit', key: 'sport_hoodie', price: 600 },
  { id: 'outfit_sport_shorts', kind: 'outfit', key: 'sport_shorts', price: 300 },
  { id: 'outfit_sport_sneakers', kind: 'outfit', key: 'sport_sneakers', price: 450 },
  { id: 'outfit_sport', kind: 'outfit', key: 'sport', price: 1300 },
  { id: 'outfit_pirate_hat', kind: 'outfit', key: 'pirate_hat', price: 500 },
  { id: 'outfit_pirate_shirt', kind: 'outfit', key: 'pirate_shirt', price: 700 },
  { id: 'outfit_pirate_boots', kind: 'outfit', key: 'pirate_boots', price: 500 },
  { id: 'outfit_pirate_sword', kind: 'outfit', key: 'pirate_sword', price: 600 },
  { id: 'outfit_pirate', kind: 'outfit', key: 'pirate', price: 1900 },
  { id: 'outfit_wizard_robe', kind: 'outfit', key: 'wizard_robe', price: 800 },
  { id: 'outfit_wizard_wand', kind: 'outfit', key: 'wizard_wand', price: 600 },
  { id: 'outfit_wizard', kind: 'outfit', key: 'wizard', price: 1500 },
  { id: 'outfit_hero', kind: 'outfit', key: 'hero', price: 1400 },
  { id: 'outfit_demon_horns', kind: 'outfit', key: 'demon_horns', price: 600 },
  { id: 'outfit_demon_cape', kind: 'outfit', key: 'demon_cape', price: 900 },
  { id: 'outfit_demon_boots', kind: 'outfit', key: 'demon_boots', price: 500 },
  { id: 'outfit_demon', kind: 'outfit', key: 'demon', price: 1700 },
  { id: 'outfit_ninja_headband', kind: 'outfit', key: 'ninja_headband', price: 400 },
  { id: 'outfit_ninja_jacket', kind: 'outfit', key: 'ninja_jacket', price: 700 },
  { id: 'outfit_ninja_pants', kind: 'outfit', key: 'ninja_pants', price: 400 },
  { id: 'outfit_ninja_sandals', kind: 'outfit', key: 'ninja_sandals', price: 300 },
  { id: 'outfit_ninja', kind: 'outfit', key: 'ninja', price: 1500 },
  { id: 'outfit_doctor_coat', kind: 'outfit', key: 'doctor_coat', price: 1000 },
  { id: 'outfit_officer_coat', kind: 'outfit', key: 'officer_coat', price: 900 },
  { id: 'outfit_officer_cap', kind: 'outfit', key: 'officer_cap', price: 400 },
  { id: 'outfit_officer', kind: 'outfit', key: 'officer', price: 1200 },
  { id: 'outfit_straw_hat', kind: 'outfit', key: 'straw_hat', price: 500 },
  { id: 'outfit_straw_shirt', kind: 'outfit', key: 'straw_shirt', price: 500 },
  { id: 'outfit_straw_shorts', kind: 'outfit', key: 'straw_shorts', price: 350 },
  { id: 'outfit_straw_sandals', kind: 'outfit', key: 'straw_sandals', price: 250 },
  { id: 'outfit_strawhat', kind: 'outfit', key: 'strawhat', price: 1400 },
  { id: 'outfit_vampire', kind: 'outfit', key: 'vampire', price: 1500 },
  { id: 'outfit_witch', kind: 'outfit', key: 'witch', price: 1500 },
  { id: 'outfit_cyborg', kind: 'outfit', key: 'cyborg', price: 1500 },
  { id: 'outfit_mummy', kind: 'outfit', key: 'mummy', price: 1500 },
  { id: 'outfit_liquid_cop', kind: 'outfit', key: 'liquid_cop', price: 1500 },
  { id: 'outfit_robot', kind: 'outfit', key: 'robot', price: 1500 },
  { id: 'outfit_cowboy_hat', kind: 'outfit', key: 'cowboy_hat', price: 500 },
  { id: 'outfit_white_headscarf', kind: 'outfit', key: 'white_headscarf', price: 500 },
  { id: 'outfit_brown_boots', kind: 'outfit', key: 'brown_boots', price: 600 },
  { id: 'outfit_staff00', kind: 'outfit', key: 'staff00', price: 400 },
  { id: 'outfit_staff03', kind: 'outfit', key: 'staff03', price: 500 },
  { id: 'outfit_staff04', kind: 'outfit', key: 'staff04', price: 600 },
  { id: 'outfit_staff05', kind: 'outfit', key: 'staff05', price: 700 },
  { id: 'outfit_holly_staff', kind: 'outfit', key: 'holly_staff', price: 800 },
  { id: 'outfit_pestilence_staff', kind: 'outfit', key: 'pestilence_staff', price: 900 },
  { id: 'outfit_w_staff_256', kind: 'outfit', key: 'w_staff_256', price: 1000 },
  { id: 'outfit_black_sword', kind: 'outfit', key: 'black_sword', price: 1000 },
  { id: 'outfit_bronze_shield', kind: 'outfit', key: 'bronze_shield', price: 1000 },
];

export const cosmeticById = (id: string): Cosmetic | undefined => COSMETICS.find((c) => c.id === id);

/** Хувцас болж өмсөгддөг дэлгүүрийн эд зүйл (mobile catalog-ийн serverItemId): хувцасны key → items.id */
export const OUTFIT_ITEMS: Readonly<Record<string, string>> = { glasses: 'acc_glasses', headphones: 'acc_headphones' };

export { BEAR_FACES, BEAR_FURS } from '../../../shared/bear';

/** Сонголт хадгалаагүй хэрэглэгчийн баавгай (mobile catalog-ийн DEFAULT_BG_ID, DEFAULT_OUTFIT_ID). */
export const DEFAULT_LOOK: BearLook = { bg: 'nimbeg', outfit: 'scarf', fur: 'brown', face: 'calm', chest: true };
