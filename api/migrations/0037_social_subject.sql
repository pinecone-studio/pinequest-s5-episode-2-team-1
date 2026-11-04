-- Нийгэм судлал (social): questions.subject-ийн CHECK нь зөвхөн 'math', 'mongolian', 'physics'-ийг зөвшөөрдөг.
-- SQLite CHECK-ийг шууд өөрчилдөггүй, subject нь UNIQUE (tier, subject, prompt_key)-д орсон тул 0030 шиг
-- багана солих боломжгүй: хүснэгтийг дахин үүсгэнэ. questions-ийг заадаг seen_questions, task_questions нь
-- ON DELETE CASCADE-гүй тул DROP TABLE тэдний мөрийг устгахгүй; defer_foreign_keys шалгалтыг commit хүртэл
-- хойшлуулж, RENAME-ийн дараа id бүр хэвээр байгаа тул алдаагүй. Цаашид хичээл нэмэхэд дахин rebuild хийхгүйн
-- тулд subject-ийн CHECK-ийг авч хаяв (API zod-оор ACTIVE_SUBJECTS-ийг шалгадаг).
PRAGMA defer_foreign_keys = true;

CREATE TABLE questions_new (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  tier          INTEGER NOT NULL CHECK (tier BETWEEN 1 AND 3),
  subject       TEXT    NOT NULL,
  prompt        TEXT    NOT NULL,
  options       TEXT    NOT NULL,             -- JSON: 4 мөр
  correct_index INTEGER NOT NULL CHECK (correct_index BETWEEN 0 AND 3),
  explanation   TEXT    NOT NULL,
  prompt_key    TEXT    NOT NULL,             -- давхардал шалгах normalize хийсэн prompt
  source        TEXT    NOT NULL,             -- 'gemini:<model>' | 'workers-ai:<model>' | 'fixture' | 'template:<id>'
  flagged       INTEGER NOT NULL DEFAULT 0,
  flagged_by    INTEGER,
  created_at    INTEGER NOT NULL,
  book_ref      TEXT,
  topic         TEXT,
  grade         INTEGER,
  book_page     INTEGER,
  difficulty    INTEGER CHECK (difficulty BETWEEN 1 AND 3),
  UNIQUE (tier, subject, prompt_key)
);

INSERT INTO questions_new
  (id, tier, subject, prompt, options, correct_index, explanation, prompt_key, source, flagged, flagged_by, created_at,
   book_ref, topic, grade, book_page, difficulty)
SELECT id, tier, subject, prompt, options, correct_index, explanation, prompt_key, source, flagged, flagged_by, created_at,
   book_ref, topic, grade, book_page, difficulty
FROM questions;

DROP TABLE questions;
ALTER TABLE questions_new RENAME TO questions;

CREATE INDEX idx_questions_pool ON questions(tier, subject, flagged);
CREATE INDEX idx_questions_topic ON questions(tier, subject, topic, flagged);
CREATE INDEX idx_questions_page ON questions(tier, subject, grade, flagged, book_page);

PRAGMA defer_foreign_keys = false;
