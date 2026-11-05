-- Багш: бүртгэлдээ "Би багш" гэж сонгосон хэрэглэгч. Багш анги (clans) үүсгэнэ, гэхдээ өөрөө гишүүн биш
-- (clan_members-д орохгүй): олон ангитай байж болно, сурагчдын эрэмбэд харагдахгүй.
ALTER TABLE users ADD COLUMN is_teacher INTEGER NOT NULL DEFAULT 0;

-- Ангийн шууд тэмцээн (Kahoot маягийн): багш асуулт бүрийг дэлгэцэнд гаргаж, сурагчид утсаараа хариулна.
-- q: одоогийн асуултын дугаар (-1 = хүлээлгийн өрөө). phase_at: энэ үе эхэлсэн агшин (асуултын хугацаа үүнээс тоологдоно).
CREATE TABLE quiz_games (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  clan_id      INTEGER NOT NULL REFERENCES clans(id) ON DELETE CASCADE,
  host_id      INTEGER NOT NULL REFERENCES users(id),
  subject      TEXT    NOT NULL,
  question_ids TEXT    NOT NULL,              -- JSON: [id, ...]
  q            INTEGER NOT NULL DEFAULT -1,
  phase        TEXT    NOT NULL DEFAULT 'lobby' CHECK (phase IN ('lobby', 'question', 'reveal', 'finished')),
  phase_at     INTEGER NOT NULL,
  created_at   INTEGER NOT NULL
);
CREATE INDEX idx_quiz_games_clan ON quiz_games(clan_id, phase);

CREATE TABLE quiz_players (
  game_id   INTEGER NOT NULL REFERENCES quiz_games(id) ON DELETE CASCADE,
  user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at INTEGER NOT NULL,
  PRIMARY KEY (game_id, user_id)
);

-- Асуулт бүрт эхний хариулт л тоологдоно (PRIMARY KEY). points: зөв бол хурдаас хамаарсан оноо, буруу бол 0.
CREATE TABLE quiz_answers (
  game_id     INTEGER NOT NULL REFERENCES quiz_games(id) ON DELETE CASCADE,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  q           INTEGER NOT NULL,
  choice      INTEGER NOT NULL,
  correct     INTEGER NOT NULL,
  points      INTEGER NOT NULL,
  answered_at INTEGER NOT NULL,
  PRIMARY KEY (game_id, user_id, q)
);
