-- Сурах Аян: үндсэн schema
-- Огноо (day) бүгд Asia/Ulaanbaatar цагийн 'YYYY-MM-DD', хугацаа (*_at) бүгд epoch ms.
-- `tx` багана: төлөв шилжүүлэх statement санамсаргүй nonce бичиж, нэг batch доторх
-- бусад statement-ууд `EXISTS(... tx = nonce)` нөхцөлөөр зөвхөн шилжилт амжилттай үед ажиллана.

CREATE TABLE users (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  username          TEXT    NOT NULL UNIQUE,
  password_hash     TEXT    NOT NULL,
  grade             INTEGER NOT NULL CHECK (grade BETWEEN 6 AND 10),
  tier              INTEGER NOT NULL CHECK (tier BETWEEN 1 AND 3),
  xp                INTEGER NOT NULL DEFAULT 0 CHECK (xp >= 0),
  -- CHECK нь оноо хүрэлцэхгүй үед batch-ийг бүхэлд нь rollback хийлгэнэ (escrow, худалдан авалт).
  points            INTEGER NOT NULL DEFAULT 0 CHECK (points >= 0),
  streak            INTEGER NOT NULL DEFAULT 0 CHECK (streak >= 0),
  last_streak_day   TEXT,
  shield_held       INTEGER NOT NULL DEFAULT 0 CHECK (shield_held BETWEEN 0 AND 1),
  shield_bought_day TEXT,
  shield_used_day   TEXT,
  equipped          TEXT    NOT NULL DEFAULT '{}',
  tx                TEXT,
  created_at        INTEGER NOT NULL
);

CREATE TABLE sessions (
  token_hash TEXT    PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_sessions_user ON sessions(user_id);

CREATE TABLE questions (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  tier          INTEGER NOT NULL CHECK (tier BETWEEN 1 AND 3),
  subject       TEXT    NOT NULL CHECK (subject IN ('math', 'mongolian', 'physics')),
  prompt        TEXT    NOT NULL,
  options       TEXT    NOT NULL,             -- JSON: 4 мөр
  correct_index INTEGER NOT NULL CHECK (correct_index BETWEEN 0 AND 3),
  explanation   TEXT    NOT NULL,
  prompt_key    TEXT    NOT NULL,             -- давхардал шалгах normalize хийсэн prompt
  source        TEXT    NOT NULL,             -- 'gemini:<model>' | 'workers-ai:<model>' | 'fixture'
  flagged       INTEGER NOT NULL DEFAULT 0,
  flagged_by    INTEGER,
  created_at    INTEGER NOT NULL,
  UNIQUE (tier, subject, prompt_key)
);
CREATE INDEX idx_questions_pool ON questions(tier, subject, flagged);

CREATE TABLE seen_questions (
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_id INTEGER NOT NULL REFERENCES questions(id),
  seen_at     INTEGER NOT NULL,
  PRIMARY KEY (user_id, question_id)
);

CREATE TABLE tasks (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject        TEXT    NOT NULL,
  day            TEXT    NOT NULL,            -- эхлүүлсэн UB өдөр (өдрийн хязгаар үүгээр)
  status         TEXT    NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed')),
  correct_count  INTEGER NOT NULL DEFAULT 0,
  points_awarded INTEGER,
  xp_awarded     INTEGER,
  multiplier     REAL,
  streak_after   INTEGER,
  tx             TEXT,
  created_at     INTEGER NOT NULL,
  completed_at   INTEGER
);
CREATE INDEX idx_tasks_user_day ON tasks(user_id, day);

CREATE TABLE task_questions (
  task_id     INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  position    INTEGER NOT NULL CHECK (position BETWEEN 0 AND 4),
  question_id INTEGER NOT NULL REFERENCES questions(id),
  choice      INTEGER,                        -- NULL = хариулаагүй, -1 = "Асуулт буруу байна" (алгассан)
  correct     INTEGER,
  answered_at INTEGER,
  PRIMARY KEY (task_id, position)
);

CREATE TABLE point_ledger (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  delta      INTEGER NOT NULL,
  -- signup_bonus | task_reward | shield_buy | item_buy | duel_stake | duel_payout | duel_refund
  reason     TEXT    NOT NULL,
  ref_type   TEXT,                            -- user | task | shield | item | duel
  ref_id     TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_ledger_user ON point_ledger(user_id);

CREATE TABLE duels (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  tier           INTEGER NOT NULL,
  subject        TEXT    NOT NULL,
  stake          INTEGER NOT NULL CHECK (stake >= 1),
  creator_id     INTEGER NOT NULL REFERENCES users(id),
  opponent_id    INTEGER REFERENCES users(id),
  status         TEXT    NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'accepted', 'finished', 'cancelled')),
  question_ids   TEXT,                        -- JSON: [id, id, id]
  creator_score  INTEGER,
  opponent_score INTEGER,
  winner_id      INTEGER,                     -- NULL = тэнцээ эсвэл цуцлагдсан
  end_reason     TEXT,                        -- score | draw | forfeit | no_show | cancelled | stale
  tx             TEXT,
  created_at     INTEGER NOT NULL,
  accepted_at    INTEGER,
  finished_at    INTEGER
);
CREATE INDEX idx_duels_status ON duels(status, tier);
CREATE INDEX idx_duels_creator ON duels(creator_id, status);
CREATE INDEX idx_duels_opponent ON duels(opponent_id, status);

CREATE TABLE items (
  id        TEXT    PRIMARY KEY,
  slot      TEXT    NOT NULL CHECK (slot IN ('skin', 'hair', 'top', 'bottom', 'shoes', 'accessory')),
  name      TEXT    NOT NULL,
  price     INTEGER NOT NULL CHECK (price >= 0),   -- 0 = бүх хүнд үнэгүй
  min_level INTEGER NOT NULL DEFAULT 1,
  style     TEXT    NOT NULL,                      -- JSON: { shape, color, trim? }
  sort      INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE user_items (
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_id     TEXT    NOT NULL REFERENCES items(id),
  acquired_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, item_id)
);

CREATE TABLE pool_locks (
  tier         INTEGER NOT NULL,
  subject      TEXT    NOT NULL,
  locked_until INTEGER NOT NULL,
  PRIMARY KEY (tier, subject)
);
