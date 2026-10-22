-- Нөхөх салаа зам: даалгаврын 5 асуулт дуусахад RECOVERY_MIN_WRONG-оос цөөнгүй алдсан бол үүснэ.
-- questions = бодох асуултууд (questions.id JSON массив): алдсан сэдэв бүрээр ижил сэдвийн өөр асуулт,
-- хүрэлцэхгүй бол алдсан асуулт. passed = зөв хариулсан асуултууд. cleared_at хүртэл тухайн хичээлийн
-- шинэ даалгавар эхлэхгүй. XP, оноо, анхны хариултыг өөрчлөхгүй.
CREATE TABLE recoveries (
  task_id    INTEGER PRIMARY KEY REFERENCES tasks(id) ON DELETE CASCADE,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject    TEXT    NOT NULL,
  questions  TEXT    NOT NULL,
  passed     TEXT    NOT NULL DEFAULT '[]',
  cleared_at INTEGER,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_recoveries_pending ON recoveries(user_id, subject, cleared_at);
