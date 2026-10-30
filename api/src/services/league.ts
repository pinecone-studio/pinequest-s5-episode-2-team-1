import { XP_PER_METER } from '../../../shared/clan';
import { LEAGUE } from '../../../shared/league';
import type { BearLook, LeagueClanDto, LeagueResponse } from '../../../shared/types';
import { GAME } from '../config/game';
import { parseBearLook } from '../domain/profile';
import { addDays, ubDay, weekStart } from '../domain/time';
import { clanOf } from './clans';

// Уулын Лиг (docs/design/clan-league.md). Бүлэг = ижил лиг + ижил "лигийн анги" (гишүүдийн хамгийн олон анги).
// shortcut: тоглолт (дуэльд дуудах) хараахан байхгүй тул бүлгийн эрэмбэ = энэ 7 хоногийн өндөр; clan_matches нэмэгдэхэд
// дизайны §1.4-ийн оноогоор солино. Бүх Уулыг нэг query-ээр уншдаг: Уул хэдэн зуу хүрвэл league_entries руу шилжүүлнэ.

interface ClanStat {
  id: number;
  public_id: string;
  name: string;
  league_tier: number;
  members: number;
  height: number;
  week_height: number;
}

/** Гишүүдийн хамгийн олон анги; тэнцвэл бага нь. */
export function modeGrade(grades: { grade: number; n: number }[]): number | null {
  let best: { grade: number; n: number } | null = null;
  for (const g of grades) if (!best || g.n > best.n || (g.n === best.n && g.grade < best.grade)) best = g;
  return best?.grade ?? null;
}

/** Энэ 7 хоногийн (Даваа 00:00 UB) төгсгөл. */
function seasonOf(now: number): LeagueResponse['season'] {
  const week = weekStart(ubDay(now));
  const endsAt = Date.parse(`${addDays(week, 7)}T00:00:00Z`) - GAME.TZ_OFFSET_MINUTES * 60_000;
  return { week, endsAt };
}

export async function league(db: D1Database, me: number, now = Date.now()): Promise<LeagueResponse> {
  const season = seasonOf(now);
  const mine = await clanOf(db, me);
  const empty = { tier: 1, members: 0, minMembers: LEAGUE.MIN_MEMBERS, isOwner: false, clanName: null, grade: null };
  if (!mine) return { season, me: { state: 'no_clan', ...empty }, standings: [] };

  const [{ results: stats }, { results: grades }] = await Promise.all([
    db
      .prepare(
        `SELECT c.id, c.public_id, c.name, c.league_tier, COUNT(*) AS members, SUM(u.xp / ?) AS height,
                SUM(COALESCE((SELECT SUM(t.xp_awarded) FROM tasks t WHERE t.user_id = u.id AND t.day >= ? AND t.status = 'completed'), 0) / ?) AS week_height
         FROM clans c JOIN clan_members m ON m.clan_id = c.id JOIN users u ON u.id = m.user_id
         GROUP BY c.id`,
      )
      .bind(XP_PER_METER, season.week, XP_PER_METER)
      .all<ClanStat>(),
    db
      .prepare('SELECT m.clan_id, u.grade, COUNT(*) AS n FROM clan_members m JOIN users u ON u.id = m.user_id GROUP BY m.clan_id, u.grade')
      .all<{ clan_id: number; grade: number; n: number }>(),
  ]);
  const gradeOf = (clanId: number) => modeGrade(grades.filter((g) => g.clan_id === clanId));
  const my = stats.find((s) => s.id === mine.id)!;
  const myGrade = gradeOf(mine.id);
  const meDto = {
    tier: my.league_tier,
    members: my.members,
    minMembers: LEAGUE.MIN_MEMBERS,
    isOwner: mine.owner_id === me,
    clanName: mine.name,
    grade: myGrade,
  };
  if (my.members < LEAGUE.MIN_MEMBERS) return { season, me: { state: 'too_small', ...meDto }, standings: [] };

  const ranked = stats
    .filter((s) => s.members >= LEAGUE.MIN_MEMBERS && s.league_tier === my.league_tier && gradeOf(s.id) === myGrade)
    .sort((a, b) => b.week_height - a.week_height || b.height - a.height || a.id - b.id);
  const group = ranked.slice(0, LEAGUE.GROUP_MAX);
  // миний Уул эхний 10-д ороогүй бол сүүлчийнхийг орлуулна (өөрийн байраа үргэлж харна)
  if (!group.some((s) => s.id === my.id)) group[group.length - 1] = my;

  const { results: lookRows } = await db
    .prepare(
      `SELECT m.clan_id, u.bear_look FROM clan_members m JOIN users u ON u.id = m.user_id
       WHERE m.clan_id IN (SELECT value FROM json_each(?)) ORDER BY m.joined_at, u.id`,
    )
    .bind(JSON.stringify(group.map((s) => s.id)))
    .all<{ clan_id: number; bear_look: string | null }>();
  const looksOf = (clanId: number): BearLook[] =>
    lookRows
      .filter((r) => r.clan_id === clanId)
      .slice(0, LEAGUE.LOOKS)
      .map((r) => parseBearLook(r.bear_look));

  const standings: LeagueClanDto[] = group.map((s) => ({
    id: s.public_id,
    name: s.name,
    members: s.members,
    rank: ranked.indexOf(s) + 1,
    weekHeight: s.week_height,
    height: s.height,
    isMine: s.id === my.id,
    looks: looksOf(s.id),
  }));
  return { season, me: { state: 'placed', ...meDto }, standings };
}
