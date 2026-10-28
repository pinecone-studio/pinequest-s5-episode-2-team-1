import type { ServerMsg } from '@shared/types';
import { useCallback, useEffect, useRef, useState } from 'react';
import { openDuelSocket } from '@/api/client';
import { type DuelView, initialDuelView, reduceDuelView } from '@/lib/duelView';

export type { DuelView };

/** Нэг ч удаа нээгдээгүй дараалсан оролдлого (token хүчингүй, тоглогч биш гэх мэт) үүнээс хэтэрвэл зогсоно. */
const MAX_FAILED_ATTEMPTS = 6;
/** DuelRoom хуучин холболтыг энэ кодоор хаадаг (DuelRoom.ts). */
const CLOSE_REPLACED = 4000;

/**
 * DuelRoom-той WebSocket холболт. Салвал (тоглолт дуусаагүй бол) дахин холбогдоно; сервер
 * snapshot илгээж одоогийн байдлыг сэргээнэ. Цагийн зөрүүг serverNow-оор засна.
 */
export function useDuelSocket(duelId: number) {
  const [view, setView] = useState<DuelView>(initialDuelView);
  const wsRef = useRef<WebSocket | null>(null);
  const offsetRef = useRef(0);
  const doneRef = useRef(false);

  useEffect(() => {
    let alive = true;
    let attempt = 0;
    let retry: ReturnType<typeof setTimeout> | undefined;

    const connect = () => {
      const ws = openDuelSocket(duelId);
      wsRef.current = ws;
      ws.onopen = () => {
        attempt = 0;
        setView((v) => ({ ...v, connection: 'open' }));
      };
      ws.onmessage = (ev) => {
        let msg: ServerMsg;
        try {
          msg = JSON.parse(String(ev.data)) as ServerMsg;
        } catch {
          return; // "pong"
        }
        if ('serverNow' in msg) offsetRef.current = msg.serverNow - Date.now();
        if (msg.type === 'finished' || msg.type === 'cancelled') doneRef.current = true;
        if (msg.type === 'state' && msg.outcome) doneRef.current = true;
        setView((v) => reduceDuelView(v, msg));
      };
      ws.onclose = (ev) => {
        if (!alive || doneRef.current) return;
        if (ev.code === CLOSE_REPLACED || attempt >= MAX_FAILED_ATTEMPTS) {
          setView((v) => ({ ...v, connection: ev.code === CLOSE_REPLACED ? 'replaced' : 'failed' }));
          return;
        }
        setView((v) => ({ ...v, connection: 'reconnecting' }));
        retry = setTimeout(connect, Math.min(500 * 2 ** attempt++, 4000));
      };
    };

    connect();
    const ping = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) wsRef.current.send('ping');
    }, 20_000);

    return () => {
      alive = false;
      clearTimeout(retry);
      clearInterval(ping);
      wsRef.current?.close();
    };
  }, [duelId]);

  const answer = useCallback((q: number, choice: number) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) wsRef.current.send(JSON.stringify({ type: 'answer', q, choice }));
  }, []);

  const serverNow = useCallback(() => Date.now() + offsetRef.current, []);

  return { view, answer, serverNow };
}
