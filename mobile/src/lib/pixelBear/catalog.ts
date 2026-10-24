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

export type OutfitId = 'scarf' | 'glasses' | 'gradcap' | 'headphones';

export interface OutfitDef {
  id: OutfitId;
  name: string;
  tile: string;
  /** картын дээд хэсэгт баавгайн толгойг харуулах босоо шилжилт */
  imgTop: number;
  card: SpriteKey;
  /** амьд баавгайн толгойд өмсгөх давхарга (scripts/home-sprites.ts); ороолт нь баавгайн хөдөлгөөнд шингэсэн */
  item?: ItemId;
  /** backend-д бодитоор байдаг эд зүйл (items хүснэгт): худалдан авалт сервер дээр хийгдэнэ */
  serverItemId?: string;
}

export const OUTFITS: OutfitDef[] = [
  { id: 'scarf', name: 'Монгол ороолт', tile: '#D4F55E', imgTop: -26, card: 'outfit_scarf_82x140' },
  {
    id: 'glasses',
    name: 'Нүдний шил',
    tile: '#AEDDF3',
    imgTop: -12,
    item: 'glasses',
    card: 'outfit_glasses_82x140',
    serverItemId: 'acc_glasses',
  },
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
];

export const DEFAULT_OUTFIT_ID: OutfitId = 'scarf';

export const bgById = (id: string): BgDef => BACKGROUNDS.find((b) => b.id === id) ?? BACKGROUNDS[0];
export const outfitById = (id: string): OutfitDef => OUTFITS.find((o) => o.id === id) ?? OUTFITS[0];
