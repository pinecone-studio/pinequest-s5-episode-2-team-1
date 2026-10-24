import { useSyncExternalStore } from 'react';

/**
 * Сервертэй холбогдож байгаа эсэх. `api()`-ийн хүсэлт бүр шинэчилнэ: сүлжээний алдаа (NETWORK, TIMEOUT) → офлайн,
 * ямар нэг хариу ирвэл (алдаатай ч) → онлайн. Офлайн үед AuthProvider серверийг үе үе шалгана.
 */
let online = true;
const listeners = new Set<() => void>();

export function setOnline(next: boolean) {
  if (next === online) return;
  online = next;
  for (const l of listeners) l();
}

export function isOnline(): boolean {
  return online;
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
