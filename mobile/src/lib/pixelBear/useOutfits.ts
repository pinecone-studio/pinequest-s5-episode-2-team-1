import type { ShopItem, ShopResponse } from '@shared/types';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { api, errorText } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { S } from '@/i18n/strings';
import { usePixelBear } from '@/lib/mock/pixelBear';
import { OUTFITS, type OutfitDef } from './catalog';

export interface OutfitView {
  def: OutfitDef;
  price: number;
  owned: boolean;
  /** серверийн шатны хязгаар (шат хүрэхгүй бол) */
  lockedLevel: number | null;
  /** худалдан авалт сервер дээр хийгдэнэ */
  server: boolean;
}

/**
 * Баавгайн хувцас: нүдний шил, чихэвч нь /shop-ийн эд зүйл (acc_glasses, acc_headphones, шатны хязгаартай);
 * ороолт, төгсөгчийн малгай нь /cosmetics-оос. Үнэ, эзэмшил, худалдан авалт бүгд серверт.
 */
export function useOutfits() {
  const { setMe } = useAuth();
  const bear = usePixelBear();
  const { reloadCosmetics } = bear;
  const [items, setItems] = useState<ShopItem[] | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const [r] = await Promise.all([api<ShopResponse>('/shop'), reloadCosmetics()]);
      setItems(r.items);
      setMe(r.me);
      setError('');
    } catch (e) {
      setError(errorText(e));
    }
  }, [setMe, reloadCosmetics]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const views: OutfitView[] = OUTFITS.map((def) => {
    const si = def.serverItemId ? items?.find((i) => i.id === def.serverItemId) : undefined;
    if (si) {
      return { def, price: si.price, owned: si.owned, lockedLevel: si.locked && !si.owned ? si.minLevel : null, server: true };
    }
    return { def, price: bear.priceOf('outfit', def.id), owned: bear.ownedOutfits.includes(def.id), lockedLevel: null, server: false };
  });

  /** Худалдаж аваад өмсгөнө. Алдаа гарвал мессежийг буцаана. */
  async function buy(v: OutfitView): Promise<string | null> {
    if (v.price > bear.coins) return S.shop.noCoins;
    if (v.server && v.def.serverItemId) {
      try {
        const r = await api<ShopResponse>(`/shop/${v.def.serverItemId}/buy`, { method: 'POST' });
        setItems(r.items);
        setMe(r.me);
        bear.equipOutfit(v.def.id);
        return null;
      } catch (e) {
        return errorText(e);
      }
    }
    return bear.buyOutfit(v.def.id);
  }

  return { views, loaded: (items !== null && bear.cosmeticsLoaded) || !!error, error, buy };
}
