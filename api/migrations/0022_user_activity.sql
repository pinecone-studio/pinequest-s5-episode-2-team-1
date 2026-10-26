-- Хэрэглэгч аль өдөр апп ашигласан (admin dashboard-ын "өнөөдөр хэдэн хүн орсон").
-- Нэвтэрсэн хүсэлт бүр (requireAuth) INSERT OR IGNORE хийдэг тул хүн бүрт өдөрт нэг л мөр бичигдэнэ.
CREATE TABLE IF NOT EXISTS user_activity (
  user_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day      TEXT    NOT NULL,            -- UB өдөр
  first_at INTEGER NOT NULL,            -- тэр өдрийн анхны хүсэлт
  PRIMARY KEY (user_id, day)
) WITHOUT ROWID;
CREATE INDEX IF NOT EXISTS idx_user_activity_day ON user_activity(day);

-- Dashboard өдөр бүрийн дууссан даалгаврыг тоолохдоо бүх хүснэгтийг уншихгүйн тулд.
CREATE INDEX IF NOT EXISTS idx_tasks_day ON tasks(day, status);
