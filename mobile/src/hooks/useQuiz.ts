import type { QuizView } from '@shared/teacher';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api, errorText } from '@/api/client';

const POLL_MS = 1000;

/**
 * Ангийн тэмцээний төлөв: 1 секунд тутам GET /quiz/:id (дуусвал зогсоно). `act` нь join/answer/next-ийг илгээж
 * хариуг шууд харуулна. `now` нь секундын тоолуурт.
 * shortcut: polling — WebSocket руу шилжвэл энэ hook-ийн дотор л өөрчлөгдөнө.
 */
export function useQuiz(id: number) {
  const [view, setView] = useState<QuizView | null>(null);
  const [error, setError] = useState('');
  const [now, setNow] = useState(Date.now());
  const busy = useRef(false);

  const load = useCallback(async () => {
    try {
      setView(await api<QuizView>(`/quiz/${id}`));
      setError('');
    } catch (e) {
      setError(errorText(e));
    }
  }, [id]);

  const finished = view?.phase === 'finished';
  useEffect(() => {
    void load();
    if (finished) return;
    const timer = setInterval(() => {
      setNow(Date.now());
      if (!busy.current) void load();
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [load, finished]);

  const act = useCallback(
    async (path: 'join' | 'answer' | 'next', body?: unknown) => {
      busy.current = true;
      try {
        setView(await api<QuizView>(`/quiz/${id}/${path}`, { method: 'POST', body }));
        setError('');
      } catch (e) {
        setError(errorText(e));
      } finally {
        busy.current = false;
      }
    },
    [id],
  );

  const remainingMs = view?.endsAt ? Math.max(0, view.endsAt - now) : 0;
  return { view, error, act, reload: load, remainingMs };
}
