import type { AuthResponse, Me, MeResponse } from '@shared/types';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ApiError, api, setAuthToken, setUnauthorizedHandler } from '@/api/client';
import { clearToken, loadToken, saveToken } from './storage';

type Status = 'loading' | 'offline' | 'signedOut' | 'signedIn';

interface AuthValue {
  status: Status;
  me: Me | null;
  signIn(username: string, password: string): Promise<void>;
  signUp(username: string, password: string, grade: number): Promise<void>;
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

  const reset = useCallback(async () => {
    setAuthToken(null);
    setMeState(null);
    setStatus('signedOut');
    await clearToken();
  }, []);

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
      try {
        const res = await api<MeResponse>('/me');
        if (cancelled) return;
        setMeState(res.me);
        setStatus('signedIn');
      } catch (e) {
        if (cancelled) return;
        if (e instanceof ApiError && e.status === 401) await reset();
        else setStatus('offline');
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
    async (username: string, password: string, grade: number) => {
      await finishAuth(await api<AuthResponse>('/auth/register', { body: { username, password, grade } }));
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
