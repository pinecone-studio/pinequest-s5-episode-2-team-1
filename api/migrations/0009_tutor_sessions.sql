-- Баавгайтай ярилцлага (GET /tutor/ws): хэрэглэгч тус бүрийн өдрийн ба зэрэг ярилцлагын хязгаар (GAME.TUTOR).
-- Gemini-тэй холбогдож чадаагүй ярилцлагыг устгана: тоологдохгүй.
CREATE TABLE IF NOT EXISTS tutor_sessions (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day        TEXT    NOT NULL,            -- эхэлсэн UB өдөр
  started_at INTEGER NOT NULL,
  ended_at   INTEGER                      -- NULL = явагдаж байна (эсвэл сервер гэнэт зогссон)
);
CREATE INDEX IF NOT EXISTS idx_tutor_sessions_user_day ON tutor_sessions(user_id, day);
