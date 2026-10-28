import { type ComponentRef, useSyncExternalStore } from 'react';
import type { View } from 'react-native';
import { kvGet, kvSet } from '@/lib/kv';

/**
 * Анх бүртгүүлсэн хэрэглэгчид аппыг танилцуулах walkthrough (components/FirstTour.tsx). Асуулгаа бөглөөгүй
 * (`me.onboarded === false`) хэрэглэгчийг харвал төхөөрөмж дээр «хүлээгдэж буй» гэж тэмдэглээд, профайл, асуулгаа
 * бөглөж Нүүрэнд ирэхэд нь нэг удаа харуулна. Хуучин хэрэглэгч шинэ утсан дээр нэвтрэхэд гарахгүй. «Хуанли ба
 * профайл» хэсгээс дахин үзэж болно.
 */
type TourState = 'pending' | 'done';
const tourKey = (userId: number) => `pq.tour.${userId}`;

let active = false;
const listeners = new Set<() => void>();

function setActive(next: boolean) {
  if (next === active) return;
  active = next;
  for (const l of listeners) l();
}

export async function markTourPending(userId: number): Promise<void> {
  if ((await kvGet<TourState>(tourKey(userId))) === null) await kvSet(tourKey(userId), 'pending' satisfies TourState);
}

export async function startTourIfPending(userId: number): Promise<void> {
  if ((await kvGet<TourState>(tourKey(userId))) === 'pending') setActive(true);
}

export function replayTour() {
  setActive(true);
}

export function finishTour(userId: number) {
  setActive(false);
  void kvSet(tourKey(userId), 'done' satisfies TourState);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const isActive = () => active;

export function useTourActive(): boolean {
  return useSyncExternalStore(subscribe, isActive, isActive);
}

/** Walkthrough-ийн тодруулах элементүүд: Нүүрний хэсгүүд ба доод цэсний tab-ууд (`nav.<route>`). */
export type TourTarget = 'xp' | 'stats' | 'feed' | 'avatar' | `nav.${string}`;
type Node = ComponentRef<typeof View>;

const nodes = new Map<TourTarget, Node>();
const refs = new Map<TourTarget, (node: Node | null) => () => void>();

/** Элементийг walkthrough-д бүртгэх ref (id бүрт тогтмол функц: render бүрт дахин холбогдохгүй). */
export function tourRef(id: TourTarget) {
  let ref = refs.get(id);
  if (!ref) {
    ref = (node) => {
      if (node) nodes.set(id, node);
      return () => {
        if (nodes.get(id) === node) nodes.delete(id);
      };
    };
    refs.set(id, ref);
  }
  return ref;
}

export function tourNode(id: TourTarget): Node | undefined {
  return nodes.get(id);
}
