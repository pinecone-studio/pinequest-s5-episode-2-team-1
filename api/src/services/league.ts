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

/** Эхний 10 анги; миний анги ороогүй бол сүүлчийнхийг орлуулна (өөрийн байраа үргэлж харна). Ангигүй бол зүгээр эхний 10. */
export function topGroup<T extends { id: number }>(ranked: T[], mine: T | null): T[] {
  const group = ranked.slice(0, LEAGUE.GROUP_MAX);
  if (mine && !group.some((s) => s.id === mine.id)) group[group.length - 1] = mine;
  return group;
}

/** Энэ 7 хоногийн (Даваа 00:00 UB) төгсгөл. */
function seasonOf(now: number): LeagueResponse['season'] {
  const week = weekStart(ubDay(now));
  const endsAt = Date.parse(`${addDays(week, 7)}T00:00:00Z`) - GAME.TZ_OFFSET_MINUTES * 60_000;
  return { week, endsAt };
}

/** `view`: өөр ангийн (grade) уралдааныг харах; өгөөгүй бол миний анги. */
export async function league(db: D1Database, me: number, now = Date.now(), view?: number): Promise<LeagueResponse> {
  const season = seasonOf(now);
  const prev = addDays(season.week, -7);
  await closeWeek(db, prev, season.week);
  const mine = await clanOf(db, me);
  const [stats, gradeOf] = await Promise.all([clanStats(db, season.week, addDays(season.week, 7)), gradeOfClans(db)]);
  const my = mine ? stats.find((s) => s.id === mine.id)! : null;
  // ангигүй ч өөрийн ангийн (grade) уралдааныг харж, аль ангид нэгдэхээ сонгоно
  const myGrade = mine
    ? gradeOf(mine.id)
    : ((await db.prepare('SELECT grade FROM users WHERE id = ?').bind(me).first<{ grade: number | null }>())?.grade ?? null);
  const meDto =
    mine && my
      ? {
          state: 'placed' as const,
          tier: my.league_tier,
          promoted: my.promoted_week === prev,
          members: my.members,
          isOwner: mine.owner_id === me,
          clanName: mine.name,
          grade: myGrade,
        }
      : { state: 'no_clan' as const, tier: 1, promoted: false, members: 0, isOwner: false, clanName: null, grade: myGrade };

  const shown = view ?? myGrade;
  const ranked = stats.filter((s) => gradeOf(s.id) === shown).sort(byRank);
  // өөр ангийн уралдаанд миний анги байхгүй: орлуулахгүй
  const group = topGroup(ranked, my && ranked.includes(my) ? my : null);

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
    isMine: s.id === my?.id,
    looks: looksOf(s.id),
  }));
  return { season, me: meDto, standings };
}
