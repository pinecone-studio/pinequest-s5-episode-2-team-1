import { LEAGUE_TIERS } from '../../../shared/league';

// Анги tab-ийн лигийн тооцоо: ангиудын метр, анги (grade), эрэмбэ ба 7 хоногийн төгсгөлд түрүүлсэн ангийг дэвшүүлэх.
// shortcut: өмнөх 7 хоногийг одоогийн гишүүдээр нь тооцно (гарсан гишүүний XP орохгүй); түүх хадгалах хэрэгтэй болвол
// 7 хоног бүрийн эцсийн эрэмбийг тусдаа хүснэгтэд бичнэ.

export interface ClanStat {
  id: number;
  public_id: string;
  name: string;
  league_tier: number;
  icon: string | null;
  promoted_week: string | null;
  members: number;
  xp: number;
  week_xp: number;
}

/** Бүх анги: гишүүд, нийт XP, [from, to) өдрүүдэд даалгавраар авсан XP. */
export async function clanStats(db: D1Database, from: string, to: string): Promise<ClanStat[]> {
  const { results } = await db
    .prepare(
      `SELECT c.id, c.public_id, c.name, c.icon, c.league_tier, c.promoted_week, COUNT(*) AS members, SUM(u.xp) AS xp,
              SUM(COALESCE((SELECT SUM(t.xp_awarded) FROM tasks t
                            WHERE t.user_id = u.id AND t.day >= ? AND t.day < ? AND t.status = 'completed'), 0)) AS week_xp
       FROM clans c JOIN clan_members m ON m.clan_id = c.id JOIN users u ON u.id = m.user_id
       GROUP BY c.id`,
    )
    .bind(from, to)
    .all<ClanStat>();
  return results;
}

/** Гишүүдийн хамгийн олон анги; тэнцвэл бага нь. */
export function modeGrade(grades: { grade: number; n: number }[]): number | null {
  let best: { grade: number; n: number } | null = null;
  for (const g of grades) if (!best || g.n > best.n || (g.n === best.n && g.grade < best.grade)) best = g;
  return best?.grade ?? null;
}

/** Анги бүрийн "анги" (grade): гишүүдийн хамгийн олон анги. */
export async function gradeOfClans(db: D1Database): Promise<(clanId: number) => number | null> {
  const { results } = await db
    .prepare('SELECT m.clan_id, u.grade, COUNT(*) AS n FROM clan_members m JOIN users u ON u.id = m.user_id GROUP BY m.clan_id, u.grade')
    .all<{ clan_id: number; grade: number; n: number }>();
  return (clanId) => modeGrade(results.filter((g) => g.clan_id === clanId));
}

/** Эрэмбэ: 7 хоногийн XP, тэнцвэл нийт XP, дараа нь эрт үүссэн. */
export const byRank = (a: ClanStat, b: ClanStat) => b.week_xp - a.week_xp || b.xp - a.xp || a.id - b.id;

/** Дэвших ангиуд: ижил ангийн (grade) хамгийн багадаа 2 ангиас 1-р байр, XP > 0, хамгийн дээд лигт хүрээгүй. */
export function weekWinners(stats: ClanStat[], gradeOf: (clanId: number) => number | null): number[] {
  const groups = new Map<number | null, ClanStat[]>();
  for (const s of stats) groups.set(gradeOf(s.id), [...(groups.get(gradeOf(s.id)) ?? []), s]);
  const winners: number[] = [];
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const top = [...group].sort(byRank)[0];
    if (top.week_xp > 0 && top.league_tier < LEAGUE_TIERS.length) winners.push(top.id);
  }
  return winners;
}

/** `prev` 7 хоногийг нэг л удаа хааж ялагчдыг дэвшүүлнэ. Cron байхгүй тул /league хүсэлт бүр дээр шалгана. */
export async function closeWeek(db: D1Database, prev: string, week: string): Promise<void> {
  if (await db.prepare('SELECT 1 FROM league_weeks WHERE week = ?').bind(prev).first()) return;
  const [stats, gradeOf] = await Promise.all([clanStats(db, prev, week), gradeOfClans(db)]);
  const token = crypto.randomUUID();
  // Зэрэг хоёр хүсэлт ирвэл INSERT-ийг ялсан хүсэлтийн token-той үед л дэвшүүлнэ (batch = нэг transaction).
  await db.batch([
    db.prepare('INSERT OR IGNORE INTO league_weeks (week, token) VALUES (?, ?)').bind(prev, token),
    db
      .prepare(
        `UPDATE clans SET league_tier = league_tier + 1, promoted_week = ?
         WHERE id IN (SELECT value FROM json_each(?)) AND league_tier < ? AND (SELECT token FROM league_weeks WHERE week = ?) = ?`,
      )
      .bind(prev, JSON.stringify(weekWinners(stats, gradeOf)), LEAGUE_TIERS.length, prev, token),
  ]);
}
