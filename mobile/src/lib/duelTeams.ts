import type { DuelTeam, WsPlayer } from '@shared/types';
import { S } from '@/i18n/strings';

export const otherTeam = (t: DuelTeam): DuelTeam => (t === 'a' ? 'b' : 'a');

export function teamTotals(players: WsPlayer[]): Record<DuelTeam, number> {
  const t: Record<DuelTeam, number> = { a: 0, b: 0 };
  for (const p of players) t[p.team ?? 'a'] += p.score;
  return t;
}

/** "Танай баг" эсвэл багийн өнгөний нэр. */
export const teamName = (team: DuelTeam, myTeam: DuelTeam) => (team === myTeam ? S.duel.yourTeam : team === 'a' ? S.duel.teamA : S.duel.teamB);

/** "482913" → "482 913" (уншиж, хэлж өгөхөд амар). */
export const formatCode = (code: string) => `${code.slice(0, 3)} ${code.slice(3)}`;
