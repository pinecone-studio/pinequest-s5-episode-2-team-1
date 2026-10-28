import type { CosmeticItem, CosmeticKind, CosmeticsResponse, LookBody, MeResponse, ShopResponse, Subject } from '@shared/types';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api, ApiError, errorText } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { cacheGet, cacheKeys, cacheSet } from '@/lib/cache';
import { kvGet, kvSet } from '@/lib/kv';
import { DEFAULT_BG_ID, DEFAULT_OUTFIT_ID, joinWorn, type OutfitId, parseWorn, toggleWorn } from '@/lib/pixelBear/catalog';
import { BEAR_STATES, type BearState, type BearView, deriveBear, previewBear } from '@/lib/pixelBear/bear';

/**
 * Pixel Bear-ийн төлөв.
 * - Дэвсгэр, хувцасны үнэ, эзэмшил, худалдан авалт серверт (`/cosmetics`); боргоцой = серверийн оноо.
 * - Аль дэвсгэр/хувцсыг өмссөн, сонгосон хичээл нь зөвхөн харагдац тул төхөөрөмж дээр хэрэглэгч бүрээр хадгалагдана.
 *   Өмссөн дэвсгэр, хувцсыг серверт ч илгээнэ (`PUT /me/look`): профайлаа хуваалцахад бусдад ингэж харагдана.
 * - Офлайн үед эзэмшил, үнийг сүүлд ирсэн хариунаас (cache) харуулна: хувцсаа үзэж, сонгож болно, худалдаж авахгүй.
 */

interface Persisted {
  bgId: string;
  /** өмссөн хувцсууд 'pirate_hat+glasses' (хуучин хадгалсан нэг хувцас ч ийм хэлбэр) */
  outfitId: string;
  subject: Subject | null;
}

const initial = (): Persisted => ({ bgId: DEFAULT_BG_ID, outfitId: DEFAULT_OUTFIT_ID, subject: null });

interface PixelBearValue {
  ready: boolean;
  bgId: string;
  /** өмссөн хувцсууд (хослуулж өмсөнө); хоосон бол анхдагч ороолт */
  outfitIds: OutfitId[];
  ownedBgs: string[];
  /** Зөвхөн серверийн /cosmetics-ийн хувцсууд (нүдний шил, чихэвч нь /shop-оос) */
  ownedOutfits: string[];
  /** Сонгосон хичээл (onboarding); null = сонгоогүй */
  subject: Subject | null;
  /** Хэрэглэгчид боргоцой гэж харагдах серверийн оноо */
  honey: number;
  /** /cosmetics ачаалагдсан эсэх (үнэ, эзэмшил мэдэгдэж байгаа) */
  cosmeticsLoaded: boolean;
  priceOf: (kind: CosmeticKind, key: string) => number;
  reloadCosmetics: () => Promise<void>;
  /** Серверийн профайлаас гарсан баавгай (демо preview-г оролцуулан) */
  bear: BearView | null;
  /** Демо: баавгайн төлөвийг гараар солих (санах ойд л, хадгалагдахгүй) */
  cyclePreview: () => void;
  previewing: boolean;
  setSubject: (s: Subject) => void;
  equipBg: (id: string) => void;
  /** Өмсөнө (ижил байрлалтай хувцсыг тайлна) эсвэл өмссөн бол тайлна. */
  equipOutfit: (id: OutfitId) => void;
  /** Худалдаж аваад өмсгөнө; алдааны мессеж эсвэл null. */
  buyBg: (id: string) => Promise<string | null>;
  buyOutfit: (id: OutfitId) => Promise<string | null>;
}

const Ctx = createContext<PixelBearValue | null>(null);

export function PixelBearProvider({ children }: { children: ReactNode }) {
  const { me, setMe } = useAuth();
  const userId = me?.id ?? null;
  const [data, setData] = useState<Persisted>(initial);
  const [cosmetics, setCosmetics] = useState<CosmeticItem[] | null>(null);
  const [ready, setReady] = useState(false);
  const [preview, setPreview] = useState<BearState | null>(null);
  const loadedFor = useRef<number | null>(null);

  const reloadCosmetics = useCallback(async () => {
    if (userId === null) return;
    try {
      const { items } = await api<CosmeticsResponse>('/cosmetics');
      setCosmetics(items);
      cacheSet(cacheKeys.cosmetics(userId), items);
    } catch {
      // Офлайн бол сүүлд ирсэн жагсаалт; дэлгүүр нээгдэх бүрт дахин оролдоно
      const cached = await cacheGet<CosmeticItem[]>(cacheKeys.cosmetics(userId));
      if (cached) setCosmetics((cur) => cur ?? cached);
    }
  }, [userId]);

  // Хэрэглэгч солигдоход (нэвтрэх/гарах) тухайн хэрэглэгчийн сонголт, эзэмшлийг уншина.
  useEffect(() => {
    let alive = true;
    setReady(false);
    setPreview(null);
    setCosmetics(null);
    if (userId === null) {
      loadedFor.current = null;
      setData(initial());
      return;
    }
    void reloadCosmetics();
    // Офлайн үед дэлгүүрийн хувцас (нүдний шил, чихэвч)-ны эзэмшлийг харуулахын тулд урьдчилж хадгална (useOutfits)
    api<ShopResponse>('/shop')
      .then((r) => cacheSet(cacheKeys.shop(userId), r.items))
      .catch(() => {});
    kvGet<Partial<Persisted>>(`pq.bear.${userId}`).then((saved) => {
      if (!alive) return;
      const base = initial();
      setData({ bgId: saved?.bgId ?? base.bgId, outfitId: saved?.outfitId ?? base.outfitId, subject: saved?.subject ?? null });
      loadedFor.current = userId;
      setReady(true);
    });
    return () => {
      alive = false;
    };
  }, [userId, reloadCosmetics]);

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

  // Аваагүй (жишээ нь хуучин mock-оор "авсан") дэвсгэр хадгалагдсан бол анхдагч руу буцна.
  const bgId = !cosmetics || cosmetics.some((c) => c.kind === 'bg' && c.key === data.bgId && c.owned) ? data.bgId : DEFAULT_BG_ID;

  // Өмссөнөө серверт хадгална. Сервер татгалзсан сонголтыг (жишээ нь аваагүй хувцас) дахин илгээхгүй, сүлжээний
  // алдаа бол дараагийн шинэчлэлтээр (refreshMe) дахин оролдоно.
  const sentLook = useRef<string | null>(null);
  useEffect(() => {
    if (!ready || !me || !cosmetics) return;
    const look: LookBody = { bg: bgId, outfit: data.outfitId };
    const key = `${me.id}:${look.bg}:${look.outfit}`;
    if ((me.look?.bg === look.bg && me.look.outfit === look.outfit) || sentLook.current === key) return;
    sentLook.current = key;
    api<MeResponse>('/me/look', { method: 'PUT', body: look })
      .then((r) => setMe(r.me))
      .catch((e) => {
        if (e instanceof ApiError && e.status === 0) sentLook.current = null;
      });
  }, [ready, me, cosmetics, bgId, data.outfitId, setMe]);

  const value = useMemo<PixelBearValue>(() => {
    const find = (kind: CosmeticKind, key: string) => cosmetics?.find((c) => c.kind === kind && c.key === key);
    const ownedKeys = (kind: CosmeticKind, fallback: string) =>
      cosmetics ? cosmetics.filter((c) => c.kind === kind && c.owned).map((c) => c.key) : [fallback];
    const ownedBgs = ownedKeys('bg', DEFAULT_BG_ID);

    const buy = async (kind: CosmeticKind, key: string, wear: (d: Persisted) => Persisted): Promise<string | null> => {
      const item = find(kind, key);
      if (!item) return errorText(null);
      try {
        const r = await api<CosmeticsResponse>(`/cosmetics/${item.id}/buy`, { method: 'POST' });
        setCosmetics(r.items);
        if (userId !== null) cacheSet(cacheKeys.cosmetics(userId), r.items);
        setMe(r.me);
        update(wear);
        return null;
      } catch (e) {
        return errorText(e);
      }
    };

    return {
      ready,
      bgId,
      outfitIds: parseWorn(data.outfitId),
      ownedBgs,
      ownedOutfits: ownedKeys('outfit', DEFAULT_OUTFIT_ID),
      subject: data.subject,
      honey: me?.points ?? 0,
      cosmeticsLoaded: cosmetics !== null,
      priceOf: (kind, key) => find(kind, key)?.price ?? 0,
      reloadCosmetics,
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
      equipBg: (id) => update((d) => (ownedBgs.includes(id) ? { ...d, bgId: id } : d)),
      equipOutfit: (id) => update((d) => ({ ...d, outfitId: joinWorn(toggleWorn(parseWorn(d.outfitId), id)) })),
      buyBg: (id) => buy('bg', id, (d) => ({ ...d, bgId: id })),
      buyOutfit: (id) =>
        buy('outfit', id, (d) => {
          const worn = parseWorn(d.outfitId);
          return { ...d, outfitId: joinWorn(worn.includes(id) ? worn : toggleWorn(worn, id)) };
        }),
    };
  }, [ready, bgId, data, cosmetics, me, preview, update, setMe, reloadCosmetics]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePixelBear(): PixelBearValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('usePixelBear must be used inside PixelBearProvider');
  return ctx;
}
