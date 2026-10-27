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
  { id: 'outfit_scarf', kind: 'outfit', key: 'scarf', price: 0 },
  { id: 'outfit_gradcap', kind: 'outfit', key: 'gradcap', price: 300 },
  { id: 'outfit_warrior_helmet', kind: 'outfit', key: 'warrior_helmet', price: 600 },
  { id: 'outfit_pirate_hat', kind: 'outfit', key: 'pirate_hat', price: 500 },
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
