import { isPlusOutfit } from '@shared/plan';
import type { ImageSourcePropType } from 'react-native';
import type { OutfitId } from './catalog';

/**
 * Дэлгүүрийн эвент: шинэ хувцас нэмэгдэхэд энд эвент нэмбэл дэлгүүрийн дээд banner-т гарч, дарвал эвентийн хуудас нээгдэнэ.
 * Plus хувцас нь "нээх" эгнээнд (KUMA Plus-аар), бусад нь эвентийн дэлгүүрт (боргоцойгоор). Үнэ, эзэмшил серверээс хэвээр.
 */
export interface ShopEvent {
  id: string;
  title: string;
  tagline: string;
  /** banner, hero-ийн өнгө; `deep` нь chip, шал; `ink` нь өнгөн дээрх бичиг */
  color: string;
  deep: string;
  ink: string;
  /** Улаанбаатарын цагаар; дуусмагц banner-аас алга болно */
  starts: string;
  ends: string;
  ids: OutfitId[];
  /** scripts/poster-sprites.ts-ийн poster: banner (зүүн тал нь өнгөөр уусна) ба эвентийн hero; эхний 5 хувцас дээр нь зогсоно */
  banner: ImageSourcePropType;
  hero: ImageSourcePropType;
}

export const SHOP_EVENTS: ShopEvent[] = [
  {
    id: 'agents',
    title: 'Нууц ажиллагаа',
    tagline: 'Нинжа, агентуудын шинэ хувцас ирлээ!',
    color: '#6B4EE6',
    deep: '#22106E',
    ink: '#FFFFFF',
    starts: '2026-11-01T00:00:00+08:00',
    ends: '2026-11-30T00:00:00+08:00',
    ids: ['shadow_ninja', 'spy_agent', 'liquid_cop', 'leaf_ninja', 'blossom_ninja', 'police'],
    banner: require('../../../assets/images/posters/agents-banner.png'),
    hero: require('../../../assets/images/posters/agents-hero.png'),
  },
  {
    id: 'heroes',
    title: 'Баатруудын долоо хоног',
    tagline: 'Тэнгэр, газрын баатрууд нэг дор',
    color: '#F7A97E',
    deep: '#6B2A12',
    ink: '#19152E',
    starts: '2026-11-05T00:00:00+08:00',
    ends: '2026-11-24T00:00:00+08:00',
    ids: ['thunder_god', 'sky_hero', 'night_hero', 'wrestler', 'archer', 'brown_deel'],
    banner: require('../../../assets/images/posters/heroes-banner.png'),
    hero: require('../../../assets/images/posters/heroes-hero.png'),
  },
  {
    id: 'wizards',
    title: 'Шидтэний академи',
    tagline: 'Номоо нээ, шидээ уншаарай',
    color: '#D4F55E',
    deep: '#2F4A12',
    ink: '#19152E',
    starts: '2026-11-01T00:00:00+08:00',
    ends: '2026-12-15T00:00:00+08:00',
    ids: ['book_wizard', 'glasses_wizard', 'ginger_wizard'],
    banner: require('../../../assets/images/posters/wizards-banner.png'),
    hero: require('../../../assets/images/posters/wizards-hero.png'),
  },
];

const DAY = 86_400_000;
export const activeEvents = (now = Date.now()) => SHOP_EVENTS.filter((e) => Date.parse(e.starts) <= now && now < Date.parse(e.ends));
export const eventById = (id: string) => SHOP_EVENTS.find((e) => e.id === id);
/** үлдсэн хоног (сүүлийн өдөр 1) */
export const daysLeft = (e: ShopEvent, now = Date.now()) => Math.max(1, Math.ceil((Date.parse(e.ends) - now) / DAY));
/** Plus-аар нээгдэх эгнээ ба боргоцойгоор авах эгнээ */
export const eventRows = (e: ShopEvent) => ({ quest: e.ids.filter(isPlusOutfit), shop: e.ids.filter((id) => !isPlusOutfit(id)) });
