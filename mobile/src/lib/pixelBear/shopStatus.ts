import { isPaidPlan, isPlusOutfit } from '@shared/plan';
import { useAuth } from '@/auth/AuthContext';
import type { SwatchStatus } from '@/components/BgSwatch';
import { formatNumber } from '@/components/StatPill';
import { colors } from '@/constants/theme';
import { S } from '@/i18n/strings';
import { usePixelBear } from '@/lib/mock/pixelBear';
import { isWorn, type OutfitId, outfitSlot } from './catalog';
import type { OutfitView } from './useOutfits';

export function statusOf(opts: { equipped: boolean; owned: boolean; price: number; honey: number; lockedLevel?: number | null; plusLocked?: boolean }): SwatchStatus {
  const { equipped, owned, price, honey, lockedLevel, plusLocked } = opts;
  if (equipped) return { text: S.shop.equipped, color: colors.okText, showHoney: false, locked: false };
  if (owned) return { text: S.shop.owned, color: colors.okText, showHoney: false, locked: false };
  // KUMA Plus-ын онцгой хувцас: Үнэгүй хэрэглэгчид үнийн оронд PLUS гэж харагдана
  if (plusLocked) return { text: S.shop.plusTag, a11y: S.shop.plusOnlyA11y, color: colors.violet, showHoney: false, locked: true };
  if (lockedLevel) return { text: S.shop.levelNeeded(lockedLevel), color: colors.dangerText, showHoney: false, locked: true };
  if (price > honey) return { text: formatNumber(price), a11y: S.shop.shortBy(formatNumber(price)), color: colors.dangerText, showHoney: true, locked: true };
  return { text: formatNumber(price), color: colors.ink, showHoney: true, locked: false };
}

/** Үнэгүй хэрэглэгчид Plus хувцас түгжээтэй (өмнө нь авсан бол үгүй) */
export function usePlusLocked() {
  const { me } = useAuth();
  const paid = isPaidPlan(me?.plan ?? 'free');
  return (id: string, owned: boolean) => !paid && !owned && isPlusOutfit(id);
}

/** хувцасны картын төлөв (дэлгүүр, эвентийн хуудас) */
export function useOutfitStatus() {
  const bear = usePixelBear();
  const plusLocked = usePlusLocked();
  return (v: OutfitView) =>
    statusOf({
      equipped: isWorn(bear.outfitIds, v.def.id),
      owned: v.owned,
      price: v.price,
      honey: bear.honey,
      lockedLevel: v.lockedLevel,
      plusLocked: plusLocked(v.def.id, v.owned),
    });
}

/** худалдан авах sheet-д харуулах зүйлийн төрөл */
export function categoryLabel(id: OutfitId): string {
  const slot = outfitSlot(id);
  // бүтэн нүүрний маск толгойн байрлал эзэлдэг ч Маск ангилалд харагдана
  if (slot === 'face' || id.endsWith('_mask')) return 'Маск';
  if (slot === 'head') return 'Малгай';
  if (slot === 'feet') return 'Гутал';
  if (slot === 'hand' || slot === 'offhand') return 'Зэвсэг';
  return 'Хувцас';
}
