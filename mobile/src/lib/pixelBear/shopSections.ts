import { PLUS_OUTFITS } from '@shared/plan';
import { SH } from '@/i18n/shop';
import { S } from '@/i18n/strings';
import type { SpriteKey } from '@/sprites';
import { OUTFITS, type OutfitId } from './catalog';

/**
 * Дэлгүүрийн хувцасны хэсгүүд (дээрээс доош). Онцлох / Эрэлттэй / Улирлын нь гараар сонгосон жагсаалт — борлуулалтын
 * өгөгдөл одоогоор байхгүй тул шинэ хувцас нэмэхэд энд гараар нэмнэ. Сүүлийн хэсэг бүх хувцсыг харуулдаг тул юу ч алга
 * болохгүй.
 */
/** `grid`: 3 баганат тор; бусад нь хажуу тийш гүйлгэх тавиур (том карт). `icon`, `accent`, `note` нь гарчгийнх (SectionHead). */
export const OUTFIT_SECTIONS: { title: string; note: string; icon: SpriteKey; accent: string; ids: OutfitId[]; grid?: boolean }[] = [
  // KUMA Plus-ын онцгой хувцас (shared/plan.ts PLUS_OUTFITS): зөвхөн Plus хэрэглэгч авна
  { title: S.shop.sectionPlus, note: SH.notePlus, icon: 'icon_star_24x24', accent: '#D9D2F2', ids: [...PLUS_OUTFITS] },
  { title: S.shop.sectionTrending, note: SH.noteTrending, icon: 'icon_flame_24x24', accent: '#F7A97E', ids: ['footballer_10', 'hoop_23', 'police', 'doctor', 'wrestler', 'archer'] },
  // 10-р сар: Хэллоуин
  { title: S.shop.sectionSeasonal, note: SH.noteSeasonal, icon: 'map_gift_20x19', accent: '#F2CDE0', ids: ['vampire', 'witch', 'mummy'] },
  { title: S.shop.sectionAll, note: SH.noteAll, icon: 'icon_heart_24x24', accent: '#F3F66C', ids: OUTFITS.map((o) => o.id), grid: true },
];
