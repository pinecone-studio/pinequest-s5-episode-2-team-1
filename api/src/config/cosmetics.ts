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
];

export const cosmeticById = (id: string): Cosmetic | undefined => COSMETICS.find((c) => c.id === id);

/** Хувцас болж өмсөгддөг дэлгүүрийн эд зүйл (mobile catalog-ийн serverItemId): хувцасны key → items.id */
export const OUTFIT_ITEMS: Readonly<Record<string, string>> = { glasses: 'acc_glasses', headphones: 'acc_headphones' };

/** Профайлын баавгайн үс, царай (mobile/scripts/avatar-sprites.ts-ийн FURS, FACES) */
export const BEAR_FURS = ['brown', 'black', 'white'] as const satisfies readonly BearLook['fur'][];
export const BEAR_FACES = ['calm', 'happy', 'sleepy', 'smile', 'wink', 'surprised', 'laugh', 'smug'] as const satisfies readonly BearLook['face'][];

/** Сонголт хадгалаагүй хэрэглэгчийн баавгай (mobile catalog-ийн DEFAULT_BG_ID, DEFAULT_OUTFIT_ID). */
export const DEFAULT_LOOK: BearLook = { bg: 'nimbeg', outfit: 'scarf', fur: 'brown', face: 'calm', chest: true };
