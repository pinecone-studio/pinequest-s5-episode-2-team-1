import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useState } from 'react';
import { formatNumber } from '@/components/StatPill';
import { colors } from '@/constants/theme';
import { S } from '@/i18n/strings';
import { usePixelBear } from '@/lib/mock/pixelBear';
import { useOnline } from '@/lib/online';
import { bgById, DEFAULT_OUTFIT_ID, isWorn, outfitById, toggleWorn, wornItems } from '@/lib/pixelBear/catalog';
import { categoryLabel, statusOf, usePlusLocked } from '@/lib/pixelBear/shopStatus';
import type { useOutfits } from '@/lib/pixelBear/useOutfits';

/** дэлгүүрт дарсан зүйл: дэвсгэр эсвэл хувцас */
export type BuyTarget = { kind: 'bg' | 'outfit'; id: string };
export type Outfits = ReturnType<typeof useOutfits>;

/** Худалдан авах sheet-ийн логик: харж буй зүйл, товчны төлөв, авах/өмсөх/тайлах үйлдэл. */
export function useBuy(target: BuyTarget, outfits: Outfits, close: () => void) {
  const bear = usePixelBear();
  const online = useOnline();
  const plusLockedOf = usePlusLocked();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const isBg = target.kind === 'bg';
  const bgDef = bgById(isBg ? target.id : bear.bgId);
  const outfitView = outfits.views.find((v) => v.def.id === (isBg ? bear.outfitIds.at(-1) ?? DEFAULT_OUTFIT_ID : target.id)) ?? outfits.views[0];
  const outfitDef = outfitById(outfitView.def.id);
  const selWorn = isWorn(bear.outfitIds, outfitDef.id);
  // Дэвсгэр дээр өмссөнөөрөө; хувцас дээр сонгосноо өмссөнтэйгөө хамт (ижил байрлалтайг тайлаад) харуулна
  const previewItems = wornItems(isBg || selWorn ? bear.outfitIds : toggleWorn(bear.outfitIds, outfitDef.id));

  const cur = isBg
    ? { name: bgDef.name, equipped: bgDef.id === bear.bgId, owned: bear.ownedBgs.includes(bgDef.id), price: bear.priceOf('bg', bgDef.id), lockedLevel: null }
    : { name: outfitDef.name, equipped: selWorn, owned: outfitView.owned, price: outfitView.price, lockedLevel: outfitView.lockedLevel };
  const plusLocked = !isBg && plusLockedOf(outfitDef.id, cur.owned);
  const status = statusOf({ ...cur, honey: bear.honey, plusLocked });
  const kind = isBg ? S.shop.tabBg : categoryLabel(outfitDef.id);
  const action = !outfits.loaded
    ? { title: '…', bg: colors.stoneAlt, fg: colors.muted, disabled: true }
    : cur.equipped
      ? // өмссөн хувцсаа тайлж болно (анхдагч ороолт, дэвсгэрээс бусад)
        !isBg && outfitDef.id !== DEFAULT_OUTFIT_ID
        ? { title: S.shop.unequip, bg: colors.white, fg: colors.ink, disabled: false }
        : { title: S.shop.equipped, bg: colors.white, fg: colors.okText, disabled: true }
      : cur.owned
        ? { title: S.shop.equip, bg: colors.indigo, fg: colors.white, disabled: false }
        : !online
          ? { title: S.offline.needsInternet, bg: colors.stoneAlt, fg: colors.muted, disabled: true }
          : plusLocked
            ? { title: S.shop.plusOnly, bg: colors.lime, fg: colors.ink, disabled: false }
            : cur.lockedLevel
              ? { title: S.shop.levelNeeded(cur.lockedLevel), bg: colors.stoneAlt, fg: colors.muted, disabled: true }
              : cur.price > bear.honey
                ? { title: S.shop.noHoney, bg: colors.stoneAlt, fg: colors.muted, disabled: true }
                : { title: S.shop.buyFor(formatNumber(cur.price)), bg: colors.indigo, fg: colors.white, disabled: false };
  const buying = !cur.owned && !action.disabled && !plusLocked;

  function reset() {
    setMessage('');
    setError('');
  }

  async function onAction() {
    if (busy || action.disabled) return;
    // Plus-ын онцгой хувцас: багцын дэлгэц рүү
    if (plusLocked) {
      close();
      router.push('/plans');
      return;
    }
    reset();
    if (cur.owned) {
      if (isBg) bear.equipBg(bgDef.id);
      else bear.equipOutfit(outfitDef.id);
      void Haptics.selectionAsync();
      return;
    }
    // sheet өөрөө баталгаажуулах асуулт тул дахин confirm асуухгүй
    setBusy(true);
    const err = isBg ? await bear.buyBg(bgDef.id) : await outfits.buy(outfitView);
    setBusy(false);
    if (err) {
      setError(err);
      return;
    }
    setMessage(S.shop.bought(cur.name));
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  return { isBg, bgDef, outfitDef, previewItems, cur, status, kind, action, buying, busy, message, error, reset, onAction };
}
