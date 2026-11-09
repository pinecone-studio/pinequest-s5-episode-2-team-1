import { clanIcon } from '../../../shared/clan';
import { LEAGUE } from '../../../shared/league';
import type { BearLook, LeagueClanDto, LeagueResponse } from '../../../shared/types';
import { GAME } from '../config/game';
import { parseBearLook } from '../domain/profile';
import { addDays, ubDay, weekStart } from '../domain/time';
import { clanOf } from './clans';
import { byRank, clanStats, closeWeek, gradeOfClans } from './leagueWeek';

// Анги tab: миний анги (clans) ба ижил ангийн (гишүүдийн хамгийн олон анги) бусад ангитай энэ 7 хоногийн эрэмбэ.
// 7 хоног бүр 1-р байр эзэлсэн анги дараагийн лиг рүү дэвшинэ (leagueWeek.closeWeek). Бүх ангийг нэг query-ээр уншдаг:
// анги хэдэн зуу хүрвэл тусдаа хүснэгт рүү шилжүүлнэ.

export { modeGrade } from './leagueWeek';

/** Энэ 7 хоногийн (Даваа 00:00 UB) төгсгөл. */
function seasonOf(now: number): LeagueResponse['season'] {
  const week = weekStart(ubDay(now));
  const endsAt = Date.parse(`${addDays(week, 7)}T00:00:00Z`) - GAME.TZ_OFFSET_MINUTES * 60_000;
  return { week, endsAt };
}

export async function league(db: D1Database, me: number, now = Date.now()): Promise<LeagueResponse> {
  const season = seasonOf(now);
  const prev = addDays(season.week, -7);
  await closeWeek(db, prev, season.week);
  const mine = await clanOf(db, me);
  if (!mine) {
    const none = { state: 'no_clan' as const, tier: 1, promoted: false, members: 0, isOwner: false, clanName: null, grade: null };
    return { season, me: none, standings: [] };
  }

  const [stats, gradeOf] = await Promise.all([clanStats(db, season.week, addDays(season.week, 7)), gradeOfClans(db)]);
  const my = stats.find((s) => s.id === mine.id)!;
  const myGrade = gradeOf(mine.id);
  const meDto = {
    tier: my.league_tier,
    promoted: my.promoted_week === prev,
    members: my.members,
    isOwner: mine.owner_id === me,
    clanName: mine.name,
    grade: myGrade,
  };

  const ranked = stats.filter((s) => gradeOf(s.id) === myGrade).sort(byRank);
  const group = ranked.slice(0, LEAGUE.GROUP_MAX);
  // миний анги эхний 10-д ороогүй бол сүүлчийнхийг орлуулна (өөрийн байраа үргэлж харна)
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
    weekXp: s.week_xp,
    xp: s.xp,
    tier: s.league_tier,
    icon: clanIcon(s.icon),
    isMine: s.id === my.id,
    looks: looksOf(s.id),
  }));
  return { season, me: { state: 'placed', ...meDto }, standings };
}
