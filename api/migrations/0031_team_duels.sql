-- Багийн тулаан (2 vs 2 … 5 vs 5).
-- team_size: 1 = хуучин 1 vs 1 (creator_id/opponent_id-аар, duel_members ашиглахгүй), 2–5 = багийн тулаан.
-- duel_members: багийн тулааны бүх оролцогч (үүсгэгч ч мөн 'a' багт). Хоёр баг дүүрмэгц тулаан эхэлнэ.
-- winner_team: ялсан баг ('a' | 'b'), тэнцээ/цуцлалт бол NULL. creator_score/opponent_score = 'a'/'b' багийн нийт оноо.
ALTER TABLE duels ADD COLUMN team_size INTEGER NOT NULL DEFAULT 1 CHECK (team_size BETWEEN 1 AND 5);
ALTER TABLE duels ADD COLUMN winner_team TEXT CHECK (winner_team IN ('a', 'b'));

CREATE TABLE duel_members (
  duel_id   INTEGER NOT NULL REFERENCES duels(id) ON DELETE CASCADE,
  user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  team      TEXT    NOT NULL CHECK (team IN ('a', 'b')),
  score     INTEGER,
  joined_at INTEGER NOT NULL,
  PRIMARY KEY (duel_id, user_id)
);
CREATE INDEX idx_duel_members_user ON duel_members(user_id);
