// Dashboard (/dashboard)-ын тоо: өдөр бүр бүртгүүлсэн, орсон, даалгавар, тулаан, баавгай.
// Нийтэд нээлттэй тул зөвхөн нэгтгэсэн тоо буцаана (нэр, id гаргахгүй).
import type { DashboardStatsResponse } from '../../../shared/types';
import { GAME } from '../config/game';
import { countsByDay, lastDays, ubDayStart } from '../domain/stats';
import { addDays, ubDay } from '../domain/time';

type DayCount = { day: string; n: number };

/** epoch ms багана → UB өдөр ('YYYY-MM-DD'). Offset нь тогтмол тоо тул SQL-д шууд орно. */
const ubDate = (col: string) => `date(${col} / 1000 + ${GAME.TZ_OFFSET_MINUTES * 60}, 'unixepoch')`;

export async function loadStats(db: D1Database, days: number, now = Date.now()): Promise<DashboardStatsResponse> {
  const today = ubDay(now);
  const range = lastDays(today, days);
  const from = range[0];
  const fromMs = ubDayStart(from, GAME.TZ_OFFSET_MINUTES);

  // Нэг batch = D1 руу нэг удаа.
  const [users, signups, active, tasks, duels, tutor, windows, grades] = await db.batch([
    db.prepare('SELECT COUNT(*) AS n FROM users'),
    db.prepare(`SELECT ${ubDate('created_at')} AS day, COUNT(*) AS n FROM users WHERE created_at >= ? GROUP BY day`).bind(fromMs),
    db
      .prepare(
        `SELECT a.day AS day, COUNT(*) AS n, SUM(CASE WHEN ${ubDate('u.created_at')} < a.day THEN 1 ELSE 0 END) AS back
         FROM user_activity a JOIN users u ON u.id = a.user_id
         WHERE a.day >= ? GROUP BY a.day`,
      )
      .bind(from),
    db.prepare(`SELECT day, COUNT(*) AS n FROM tasks WHERE day >= ? AND status = 'completed' GROUP BY day`).bind(from),
    db
      .prepare(`SELECT ${ubDate('finished_at')} AS day, COUNT(*) AS n FROM duels WHERE status = 'finished' AND finished_at >= ? GROUP BY day`)
      .bind(fromMs),
    db.prepare('SELECT day, COUNT(*) AS n FROM tutor_sessions WHERE day >= ? GROUP BY day').bind(from),
    db
      .prepare(
        `SELECT (SELECT COUNT(DISTINCT user_id) FROM user_activity WHERE day >= ?) AS d7,
                (SELECT COUNT(DISTINCT user_id) FROM user_activity WHERE day >= ?) AS d30`,
      )
      .bind(addDays(today, -6), addDays(today, -29)),
    db
      .prepare(
        `SELECT u.grade AS grade, COUNT(*) AS users, COUNT(a.user_id) AS active_today
         FROM users u LEFT JOIN user_activity a ON a.user_id = u.id AND a.day = ?
         GROUP BY u.grade`,
      )
      .bind(today),
  ]);

  const rows = <T>(r: D1Result) => r.results as T[];
  // RETURNING нь SQLite-ийн түлхүүр үг тул alias нь `back`.
  const activeRows = rows<DayCount & { back: number }>(active);
  const returning = countsByDay(
    range,
    activeRows.map((r) => ({ day: r.day, n: r.back })),
  );
  const series = {
    signups: countsByDay(range, rows<DayCount>(signups)),
    active: countsByDay(range, activeRows),
    tasks: countsByDay(range, rows<DayCount>(tasks)),
    duels: countsByDay(range, rows<DayCount>(duels)),
    tutor: countsByDay(range, rows<DayCount>(tutor)),
  };
  const win = rows<{ d7: number; d30: number }>(windows)[0];
  const byGrade = new Map(rows<{ grade: number; users: number; active_today: number }>(grades).map((g) => [g.grade, g]));

  return {
    today,
    generatedAt: now,
    totals: { users: rows<{ n: number }>(users)[0]?.n ?? 0, active7d: win?.d7 ?? 0, active30d: win?.d30 ?? 0 },
    daily: range.map((day, i) => ({
      day,
      signups: series.signups[i],
      active: series.active[i],
      returning: returning[i],
      tasks: series.tasks[i],
      duels: series.duels[i],
      tutor: series.tutor[i],
    })),
    grades: Array.from({ length: GAME.GRADE_MAX - GAME.GRADE_MIN + 1 }, (_, i) => {
      const g = byGrade.get(GAME.GRADE_MIN + i);
      return { grade: GAME.GRADE_MIN + i, users: g?.users ?? 0, activeToday: g?.active_today ?? 0 };
    }),
  };
}
