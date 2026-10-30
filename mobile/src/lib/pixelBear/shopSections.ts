import { S } from '@/i18n/strings';
import { OUTFITS, type OutfitId } from './catalog';

/**
 * Дэлгүүрийн хувцасны хэсгүүд (дээрээс доош). Онцлох / Эрэлттэй / Улирлын нь гараар сонгосон жагсаалт — борлуулалтын
 * өгөгдөл одоогоор байхгүй тул шинэ хувцас нэмэхэд энд гараар нэмнэ. Сүүлийн хэсэг бүх хувцсыг харуулдаг тул юу ч алга
 * болохгүй.
 */
export const OUTFIT_SECTIONS: { title: string; ids: OutfitId[] }[] = [
  { title: S.shop.sectionHot, ids: ['thunder_god', 'shadow_ninja', 'pirate_captain', 'cyborg', 'night_hero', 'wizard'] },
  { title: S.shop.sectionTrending, ids: ['footballer_10', 'hoop_23', 'spy_agent', 'police', 'doctor', 'wrestler'] },
  // 10-р сар: Хэллоуин
  { title: S.shop.sectionSeasonal, ids: ['vampire', 'witch', 'mummy', 'demon', 'demon_horns', 'demon_boots'] },
  { title: S.shop.sectionAll, ids: OUTFITS.map((o) => o.id) },
];
