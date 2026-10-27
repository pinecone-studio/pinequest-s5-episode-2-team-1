import type { AuthResponse, Me, MeResponse } from '@shared/types';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import { ApiError, api, isOfflineError, setAuthToken, setUnauthorizedHandler } from '@/api/client';
import { cacheGet, cacheKeys, cacheRemove, cacheSet } from '@/lib/cache';
import { isOfflineMode, loadOfflineMode, setOfflineMode, useOfflineMode, useOnline } from '@/lib/online';
import { clearToken, loadToken, saveToken } from './storage';

/** Офлайн үед серверийг дахин шалгах хугацаа (хүсэлтийн 15 сек timeout-оос урт). */
const RECHECK_MS = 20_000;

type Status = 'loading' | 'offline' | 'signedOut' | 'signedIn';

interface AuthValue {
  status: Status;
  me: Me | null;
  signIn(username: string, password: string): Promise<void>;
  /** анги нь onboarding-ийн асуултад (тэр хүртэл сервер түр утгатай) */
  signUp(username: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  /** Серверээс профайлыг дахин уншина. */
  refreshMe(): Promise<Me | null>;
  /** Хариунд ирсэн шинэ профайлыг шууд тавина (нэмэлт хүсэлтгүй). */
  setMe(me: Me): void;
  retryBoot(): void;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [me, setMeState] = useState<Me | null>(null);
  const [bootAttempt, setBootAttempt] = useState(0);

  const online = useOnline();
  const offlineMode = useOfflineMode();

  const reset = useCallback(async () => {
    setAuthToken(null);
    setMeState(null);
    setStatus('signedOut');
    cacheRemove(cacheKeys.me);
    // Нэвтрэх дэлгэцэд офлайн горим үлдвэл сервер рүү хандаж чадахгүй
    setOfflineMode(false);
    await clearToken();
  }, []);

  // Сүүлийн профайл: офлайн үед апп үүгээр нээгдэнэ (Нүүр, профайл, даалгавар).
  useEffect(() => {
    if (me) cacheSet(cacheKeys.me, me);
  }, [me]);

  useEffect(() => {
    setUnauthorizedHandler(() => void reset());
    return () => setUnauthorizedHandler(null);
  }, [reset]);

  // Апп нээгдэхэд хадгалсан token-оор профайлаа уншина.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = await loadToken();
      if (!token) {
        if (!cancelled) setStatus('signedOut');
        return;
      }
      setAuthToken(token);
      await loadOfflineMode();
      try {
        const res = await api<MeResponse>('/me');
        if (cancelled) return;
        setMeState(res.me);
        setStatus('signedIn');
      } catch (e) {
        if (cancelled) return;
        if (e instanceof ApiError && e.status === 401) {
          await reset();
          return;
        }
        // Сервер хүрэхгүй ч өмнө нь нэвтэрсэн бол сүүлийн профайлаар офлайн горимд орно.
        const cached = isOfflineError(e) ? await cacheGet<Me>(cacheKeys.me) : null;
        if (cancelled) return;
        if (cached) {
          setMeState(cached);
          setStatus('signedIn');
        } else if (isOfflineMode()) {
          // Офлайн горим асаалттай ч хадгалсан профайл алга: горимыг унтрааж сервертэй дахин оролдоно.
          setOfflineMode(false);
          setBootAttempt((n) => n + 1);
        } else setStatus('offline');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bootAttempt, reset]);

  const finishAuth = useCallback(async (res: AuthResponse) => {
    setAuthToken(res.token);
    await saveToken(res.token);
    setMeState(res.me);
    setStatus('signedIn');
  }, []);

  const signIn = useCallback(
    async (username: string, password: string) => {
      await finishAuth(await api<AuthResponse>('/auth/login', { body: { username, password } }));
    },
    [finishAuth],
  );

  const signUp = useCallback(
    async (username: string, password: string) => {
      await finishAuth(await api<AuthResponse>('/auth/register', { body: { username, password, onboarded: false } }));
    },
    [finishAuth],
  );

  const signOut = useCallback(async () => {
    try {
      await api('/auth/logout', { method: 'POST' });
    } catch {
      // сервер хүрэхгүй байсан ч утсан дээрээс гарна
    }
    await reset();
  }, [reset]);

  const refreshMe = useCallback(async () => {
    try {
      const res = await api<MeResponse>('/me');
      setMeState(res.me);
      return res.me;
    } catch {
      return null;
    }
  }, []);

  // Офлайн үед серверийг үе үе (мөн апп нээгдэх бүрт) шалгана: хүрмэгц профайл шинэчлэгдэж онлайн болно. Офлайн
  // горимыг өөрөө асаасан бол шалгахгүй.
  useEffect(() => {
    if (status !== 'signedIn' || online || offlineMode) return;
    let busy = false;
    const recheck = async () => {
      if (busy) return;
      busy = true;
      await refreshMe();
      busy = false;
    };
    const timer = setInterval(() => void recheck(), RECHECK_MS);
    const sub = AppState.addEventListener('change', (s) => s === 'active' && void recheck());
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [status, online, offlineMode, refreshMe]);

  const value = useMemo<AuthValue>(
    () => ({
      status,
      me,
      signIn,
      signUp,
      signOut,
      refreshMe,
      setMe: setMeState,
      retryBoot: () => {
        setStatus('loading');
        setBootAttempt((n) => n + 1);
      },
    }),
    [status, me, signIn, signUp, signOut, refreshMe],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

/** Нэвтэрсэн дэлгэцүүдэд: me заавал байна. */
export function useMe(): Me {
  const { me } = useAuth();
  if (!me) throw new Error('useMe requires a signed-in user');
  return me;
}
