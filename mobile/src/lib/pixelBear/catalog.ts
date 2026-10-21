import type { SpriteKey } from '@/sprites';

// DESIGN.md §3 (дэвсгэр өнгө, үнэ) ба §8-07 (хувцас).

export interface BgDef {
  id: string;
  name: string;
  hex: string;
  price: number;
  /** анхнаасаа өмчлөлд байдаг */
  free?: boolean;
  dark?: boolean;
}

export const BACKGROUNDS: BgDef[] = [
  { id: 'nimbeg', name: 'Нимбэг', hex: '#F3F66C', price: 0, free: true },
  { id: 'tal', name: 'Тал', hex: '#A9D18E', price: 0, free: true },
  { id: 'yagaan', name: 'Ягаан', hex: '#F2CDE0', price: 60 },
  { id: 'khukh', name: 'Хөх тэнгэр', hex: '#9FD0F2', price: 60 },
  { id: 'lavanda', name: 'Лаванда', hex: '#D9D2F2', price: 90 },
  { id: 'govi', name: 'Говь', hex: '#EBCF9B', price: 90 },
  { id: 'ulbar', name: 'Улбар', hex: '#F7A97E', price: 120 },
  { id: 'shunu', name: 'Шөнө', hex: '#22106E', price: 1000, dark: true },
];

export const DEFAULT_BG_ID = 'nimbeg';

export type OutfitId = 'scarf' | 'glasses' | 'gradcap' | 'headphones';

export interface OutfitDef {
  id: OutfitId;
  name: string;
  /** Mock үнэ (серверийн эд зүйлгүй хувцсанд). Серверийн эд зүйлийн үнийг дэлгүүр өөрөө авна. */
  price: number;
  free?: boolean;
  tile: string;
  /** картын дээд хэсэгт баавгайн толгойг харуулах босоо шилжилт */
  imgTop: number;
  stage: SpriteKey;
  card: SpriteKey;
  /** backend-д бодитоор байдаг эд зүйл (items хүснэгт): худалдан авалт сервер дээр хийгдэнэ */
  serverItemId?: string;
}

export const OUTFITS: OutfitDef[] = [
  { id: 'scarf', name: 'Монгол ороолт', price: 0, free: true, tile: '#D4F55E', imgTop: -26, stage: 'outfit_scarf_164x280', card: 'outfit_scarf_82x140' },
  {
    id: 'glasses',
    name: 'Нүдний шил',
    price: 150,
    tile: '#AEDDF3',
    imgTop: -12,
    stage: 'outfit_glasses_164x280',
    card: 'outfit_glasses_82x140',
    serverItemId: 'acc_glasses',
  },
  { id: 'gradcap', name: 'Төгсөгчийн малгай', price: 300, tile: '#F3F66C', imgTop: 0, stage: 'outfit_gradcap_164x280', card: 'outfit_gradcap_82x140' },
  {
    id: 'headphones',
    name: 'Чихэвч',
    price: 1200,
    tile: '#D9D2F2',
    imgTop: -4,
    stage: 'outfit_headphones_164x280',
    card: 'outfit_headphones_82x140',
    serverItemId: 'acc_headphones',
  },
];

export const DEFAULT_OUTFIT_ID: OutfitId = 'scarf';

export const bgById = (id: string): BgDef => BACKGROUNDS.find((b) => b.id === id) ?? BACKGROUNDS[0];
export const outfitById = (id: string): OutfitDef => OUTFITS.find((o) => o.id === id) ?? OUTFITS[0];
