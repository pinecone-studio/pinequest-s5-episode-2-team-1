import { PLUS_OUTFITS } from '@shared/plan';
import { S } from '@/i18n/strings';
import { OUTFITS, type OutfitId } from './catalog';

/**
 * Дэлгүүрийн хувцасны хэсгүүд (дээрээс доош). Онцлох / Эрэлттэй / Улирлын нь гараар сонгосон жагсаалт — борлуулалтын
 * өгөгдөл одоогоор байхгүй тул шинэ хувцас нэмэхэд энд гараар нэмнэ. Сүүлийн хэсэг бүх хувцсыг харуулдаг тул юу ч алга
 * болохгүй.
 */
export const OUTFIT_SECTIONS: { title: string; ids: OutfitId[] }[] = [
  // KUMA Plus-ын онцгой хувцас (shared/plan.ts PLUS_OUTFITS): зөвхөн Plus хэрэглэгч авна
  { title: S.shop.sectionPlus, ids: [...PLUS_OUTFITS] },
  { title: S.shop.sectionTrending, ids: ['footballer_10', 'hoop_23', 'police', 'doctor', 'wrestler', 'archer'] },
  // 10-р сар: Хэллоуин
  { title: S.shop.sectionSeasonal, ids: ['vampire', 'witch', 'mummy'] },
  { title: S.shop.sectionAll, ids: OUTFITS.map((o) => o.id) },
];
