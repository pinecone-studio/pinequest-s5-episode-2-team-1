import type { CreateDuelBody, DuelResponse, DuelSummary, DuelTeam, DuelTeamBody, JoinDuelBody, LobbyResponse } from '@shared/types';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Share } from 'react-native';
import { api, errorText } from '@/api/client';
import { S } from '@/i18n/strings';
import { confirm } from '@/lib/confirm';
import { formatCode } from '@/lib/duelTeams';

const POLL_MS = 3_000;

/** Тулааны лобби: 3 сек тутам poll, сорилт үүсгэх/нэгдэх/баг солих, эхэлмэгц өрөө рүү автоматаар орно. */
export function useDuelLobby() {
  const [lobby, setLobby] = useState<LobbyResponse | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const entered = useRef<number | null>(null);

  const enter = useCallback((id: number) => {
    entered.current = id;
    router.push(`/duel/${id}`);
  }, []);

  const load = useCallback(async () => {
    try {
      const l = await api<LobbyResponse>('/duels');
      setLobby(l);
      setError('');
      // Оролцогч бүр: тулаан эхэлмэгц (хүлээн авсан / баг дүүрсэн) өрөө рүү автоматаар орно.
      if (l.mine?.status === 'accepted' && entered.current !== l.mine.id) enter(l.mine.id);
    } catch (e) {
      setError(errorText(e));
    }
  }, [enter]);

  // Жагсаалт 3 секунд тутам шинэчлэгдэнэ (зөвхөн энэ tab нээлттэй үед).
  useFocusEffect(
    useCallback(() => {
      void load();
      const timer = setInterval(load, POLL_MS);
      return () => clearInterval(timer);
    }, [load]),
  );

  async function run(key: string, fn: () => Promise<void>) {
    setBusy(key);
    setError('');
    try {
      await fn();
      await load();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(null);
    }
  }

  // Өөр тулаанд нэгдэхэд өөрийн нээлттэй сорилт (баг) сервер дээр хаагдана: эхлээд асууна.
  const leaveMineOk = () => (lobby?.mine?.status === 'open' ? confirm(S.duel.replaceMine, S.duel.replaceYes) : Promise.resolve(true));

  /** 1 vs 1 шууд эхэлнэ; багийн тулаанд суудал авч, баг дүүрэхийг лобби дээр хүлээнэ. */
  const afterJoin = (duel: DuelSummary) => {
    if (duel.status === 'accepted') enter(duel.id);
  };

  const create = (body: CreateDuelBody) => run('create', () => api<DuelResponse>('/duels', { body }).then(() => undefined));
  const cancel = (id: number) => run('cancel', () => api(`/duels/${id}/cancel`, { method: 'POST' }).then(() => undefined));
  const leaveTeam = (id: number) => run('leave', () => api(`/duels/${id}/leave`, { method: 'POST' }).then(() => undefined));
  const switchTeam = (id: number, team: DuelTeam) =>
    run(`team-${team}`, () => api<DuelResponse>(`/duels/${id}/team`, { body: { team } satisfies DuelTeamBody }).then(() => undefined));

  const accept = async (id: number) => {
    if (!(await leaveMineOk())) return;
    await run(`accept-${id}`, async () => afterJoin((await api<DuelResponse>(`/duels/${id}/accept`, { method: 'POST' })).duel));
  };

  /** Кодоор орно; алдааг дуудсан газарт (кодын талбарын доор) буцаана. */
  const join = async (code: string): Promise<string | null> => {
    if (busy !== null || !(await leaveMineOk())) return null;
    setBusy('join');
    try {
      afterJoin((await api<DuelResponse>('/duels/join', { body: { code } satisfies JoinDuelBody })).duel);
      await load();
      return null;
    } catch (e) {
      return errorText(e);
    } finally {
      setBusy(null);
    }
  };

  const share = async (d: DuelSummary) => {
    if (!d.code) return;
    const code = formatCode(d.code);
    try {
      await Share.share({
        message: d.teamSize > 1 ? S.duel.shareTeamMessage(code, d.teamSize, d.subject, d.stake) : S.duel.shareMessage(code, d.subject, d.stake),
      });
    } catch {
      // Web дээр navigator.share байхгүй байж болно: код дэлгэц дээр харагдсаар байна.
    }
  };

  return { lobby, busy, error, enter, create, cancel, leaveTeam, switchTeam, accept, join, share };
}
