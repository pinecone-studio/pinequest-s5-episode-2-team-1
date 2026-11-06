-- Багшийн заадаг хичээл: бүртгүүлсний дараах эхний алхамд сонгоно. Тэмцээн, даалгавар, сул сэдэв энэ хичээлээр.
-- NULL = хараахан сонгоогүй (багшийн нүүр эхлээд хичээл асууна).
ALTER TABLE users ADD COLUMN teacher_subject TEXT;

-- Багшийн өгсөн даалгавар: ангийн бүх сурагчид ижил асуултуудыг due_day (UB өдөр) дуустал өөрсдийн цагаар хийнэ.
-- topic NULL = холимог сэдэв.
CREATE TABLE assignments (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  clan_id      INTEGER NOT NULL REFERENCES clans(id) ON DELETE CASCADE,
  teacher_id   INTEGER NOT NULL REFERENCES users(id),
  subject      TEXT    NOT NULL,
  topic        TEXT,
  question_ids TEXT    NOT NULL,              -- JSON: [id, ...]
  due_day      TEXT    NOT NULL,
  created_at   INTEGER NOT NULL
);
CREATE INDEX idx_assignments_clan ON assignments(clan_id, due_day);

-- Асуулт бүрт эхний хариулт л тоологдоно (PRIMARY KEY).
CREATE TABLE assignment_answers (
  assignment_id INTEGER NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  position      INTEGER NOT NULL,
  choice        INTEGER NOT NULL,
  correct       INTEGER NOT NULL,
  answered_at   INTEGER NOT NULL,
  PRIMARY KEY (assignment_id, user_id, position)
);
