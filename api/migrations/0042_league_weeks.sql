-- Анги tab-ийн лиг: 7 хоног бүр ижил ангийн (grade) 1-р байр эзэлсэн анги дараагийн лиг рүү дэвшинэ (clans.league_tier).
-- league_weeks: хаагдсан 7 хоног (Даваа гараг). token: зэрэг ирсэн хүсэлтээс зөвхөн нэг нь дэвшүүлнэ (services/leagueWeek).
-- promoted_week: анги хамгийн сүүлд аль 7 хоногт түрүүлж дэвшсэн (апп-д "Баяр хүргэе" харуулна).
CREATE TABLE league_weeks (
  week  TEXT PRIMARY KEY,
  token TEXT NOT NULL
);
ALTER TABLE clans ADD COLUMN promoted_week TEXT;

-- Дүрэм хүүхдүүдэд харагдахаас өмнөх 7 хоногийг дэвшүүлэлгүй хаана.
INSERT INTO league_weeks (week, token) VALUES ('2026-11-02', 'before-tiers');
