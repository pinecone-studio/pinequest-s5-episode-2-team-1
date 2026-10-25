import { useSyncExternalStore } from 'react';
import { cacheGet, cacheKeys, cacheSet } from '@/lib/cache';

/**
 * Сервертэй холбогдож байгаа эсэх. `api()`-ийн хүсэлт бүр шинэчилнэ: сүлжээний алдаа (NETWORK, TIMEOUT) → офлайн,
 * ямар нэг хариу ирвэл (алдаатай ч) → онлайн. Офлайн үед AuthProvider серверийг үе үе шалгана.
 *
 * Хэрэглэгч интернэттэй ч офлайн горимыг өөрөө асааж болно (Хуанли ба профайл): тэр үед `api()` сервер рүү
 * хүсэлт илгээхгүй, апп интернэтгүй үеийнхтэй яг адил ажиллана. Сонголт апп хаагдсан ч хадгалагдана.
 */
let reachable = true;
let offlineMode = false;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export function setOnline(next: boolean) {
  if (next === reachable) return;
  reachable = next;
  emit();
}

export function isOnline(): boolean {
  return reachable && !offlineMode;
}

export function isOfflineMode(): boolean {
  return offlineMode;
}

export function setOfflineMode(next: boolean) {
  if (next === offlineMode) return;
  offlineMode = next;
  cacheSet(cacheKeys.offlineMode, next);
  emit();
}

/** Апп нээгдэхэд (нэвтэрсэн бол) өмнөх сонголтыг сэргээнэ. */
export async function loadOfflineMode(): Promise<void> {
  const saved = (await cacheGet<boolean>(cacheKeys.offlineMode)) === true;
  if (saved === offlineMode) return;
  offlineMode = saved;
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useOnline(): boolean {
  return useSyncExternalStore(subscribe, isOnline, isOnline);
}

export function useOfflineMode(): boolean {
  return useSyncExternalStore(subscribe, isOfflineMode, isOfflineMode);
}
