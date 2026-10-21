import type { Subject } from '@shared/types';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/auth/AuthContext';
import { kvGet, kvSet } from '@/lib/kv';
import { BACKGROUNDS, bgById, DEFAULT_BG_ID, DEFAULT_OUTFIT_ID, OUTFITS, type OutfitId } from '@/lib/pixelBear/catalog';
import { BEAR_STATES, type BearState, type BearView, deriveBear, previewBear } from '@/lib/pixelBear/bear';

/**
 * MOCK: backend-д дэвсгэр өнгө, баавгайн хувцас, сонгосон хичээлийн сонголт одоогоор байхгүй
 * (өгөгдлийн сангийн схемийг өөрчлөөгүй). Тиймээс эдгээрийг төхөөрөмж дээр хэрэглэгч бүрээр хадгална.
 * Дараа нь жинхэнэ endpoint-оор солихдоо зөвхөн энэ файлыг өөрчилнө.
 *
 * - Coin = серверийн оноо − энд зарцуулсан дүн (дэвсгэр / mock хувцас).
 * - Серверийн бодит эд зүйлс (нүдний шил, чихэвч) худалдан авалт нь сервер дээр хийгдэж, оноог шууд хасна.
 */

interface Persisted {
  bgId: string;
  outfitId: OutfitId;
  ownedBgs: string[];
  /** Зөвхөн mock хувцсууд (серверийнх нь /shop-оос ирнэ) */
  ownedOutfits: OutfitId[];
  spent: number;
  subject: Subject | null;
}

const initial = (): Persisted => ({
  bgId: DEFAULT_BG_ID,
  outfitId: DEFAULT_OUTFIT_ID,
  ownedBgs: BACKGROUNDS.filter((b) => b.free).map((b) => b.id),
  ownedOutfits: OUTFITS.filter((o) => o.free).map((o) => o.id),
  spent: 0,
  subject: null,
});

export type SpendResult = { ok: true } | { ok: false; reason: 'owned' | 'coins' };

interface PixelBearValue {
  ready: boolean;
  bgId: string;
  outfitId: OutfitId;
  ownedBgs: string[];
  ownedOutfits: OutfitId[];
  /** Сонгосон хичээл (onboarding); null = сонгоогүй */
  subject: Subject | null;
  /** Харуулах coin (серверийн оноо − mock зарцуулалт) */
  coins: number;
  /** Серверийн профайлаас гарсан баавгай (демо preview-г оролцуулан) */
  bear: BearView | null;
  /** Демо: баавгайн төлөвийг гараар солих (санах ойд л, хадгалагдахгүй) */
  cyclePreview: () => void;
  previewing: boolean;
  setSubject: (s: Subject) => void;
  equipBg: (id: string) => void;
  buyBg: (id: string) => SpendResult;
  equipOutfit: (id: OutfitId) => void;
  buyOutfit: (id: OutfitId) => SpendResult;
}

const Ctx = createContext<PixelBearValue | null>(null);

export function PixelBearProvider({ children }: { children: ReactNode }) {
  const { me } = useAuth();
  const userId = me?.id ?? null;
  const [data, setData] = useState<Persisted>(initial);
  const [ready, setReady] = useState(false);
  const [preview, setPreview] = useState<BearState | null>(null);
  const loadedFor = useRef<number | null>(null);

  // Хэрэглэгч солигдоход (нэвтрэх/гарах) тухайн хэрэглэгчийн хадгалсан төлөвийг уншина.
  useEffect(() => {
    let alive = true;
    setReady(false);
    setPreview(null);
    if (userId === null) {
      loadedFor.current = null;
      setData(initial());
      return;
    }
    kvGet<Partial<Persisted>>(`pq.bear.${userId}`).then((saved) => {
      if (!alive) return;
      const base = initial();
      const merged: Persisted = {
        ...base,
        ...saved,
        ownedBgs: Array.from(new Set([...base.ownedBgs, ...(saved?.ownedBgs ?? [])])),
        ownedOutfits: Array.from(new Set([...base.ownedOutfits, ...(saved?.ownedOutfits ?? [])])),
      };
      setData(merged);
      loadedFor.current = userId;
      setReady(true);
    });
    return () => {
      alive = false;
    };
  }, [userId]);

  const update = useCallback(
    (fn: (d: Persisted) => Persisted) => {
      setData((d) => {
        const next = fn(d);
        if (userId !== null && loadedFor.current === userId) void kvSet(`pq.bear.${userId}`, next);
        return next;
      });
    },
    [userId],
  );

  const coins = Math.max(0, (me?.points ?? 0) - data.spent);

  const value = useMemo<PixelBearValue>(() => {
    const spend = (price: number): boolean => {
      if (coins < price) return false;
      return true;
    };
    return {
      ready,
      bgId: data.bgId,
      outfitId: data.outfitId,
      ownedBgs: data.ownedBgs,
      ownedOutfits: data.ownedOutfits,
      subject: data.subject,
      coins,
      bear: me ? (preview ? previewBear(preview, me) : deriveBear(me)) : null,
      previewing: preview !== null,
      cyclePreview: () => {
        if (!me) return;
        const cur = preview ?? deriveBear(me).state;
        const next = BEAR_STATES[(BEAR_STATES.indexOf(cur) + 1) % BEAR_STATES.length];
        // Бодит төлөв рүү нэг тойрсны дараа preview-г хаана
        setPreview(next === deriveBear(me).state ? null : next);
      },
      setSubject: (subject) => update((d) => ({ ...d, subject })),
      equipBg: (id) => update((d) => (d.ownedBgs.includes(id) ? { ...d, bgId: id } : d)),
      buyBg: (id) => {
        const def = bgById(id);
        if (data.ownedBgs.includes(def.id)) return { ok: false, reason: 'owned' };
        if (!spend(def.price)) return { ok: false, reason: 'coins' };
        update((d) => ({ ...d, ownedBgs: [...d.ownedBgs, def.id], bgId: def.id, spent: d.spent + def.price }));
        return { ok: true };
      },
      equipOutfit: (id) => update((d) => ({ ...d, outfitId: id })),
      buyOutfit: (id) => {
        const def = OUTFITS.find((o) => o.id === id);
        if (!def) return { ok: false, reason: 'owned' };
        if (data.ownedOutfits.includes(def.id)) return { ok: false, reason: 'owned' };
        if (!spend(def.price)) return { ok: false, reason: 'coins' };
        update((d) => ({ ...d, ownedOutfits: [...d.ownedOutfits, def.id], outfitId: def.id, spent: d.spent + def.price }));
        return { ok: true };
      },
    };
  }, [ready, data, coins, me, preview, update]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePixelBear(): PixelBearValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('usePixelBear must be used inside PixelBearProvider');
  return ctx;
}
