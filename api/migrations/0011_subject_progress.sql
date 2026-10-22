-- Хичээл бүр өөрийн сурах замтай: газрын зураг дээрх байрлал (XP → шат) ба ялсан boss хичээлээр тусдаа.
-- users.xp нь нийт XP (дээд мөр, дэлгүүрийн шат) хэвээр; users.bosses_beaten-ийг цаашид ашиглахгүй.
CREATE TABLE subject_progress (
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject       TEXT    NOT NULL,
  xp            INTEGER NOT NULL DEFAULT 0 CHECK (xp >= 0),
  bosses_beaten INTEGER NOT NULL DEFAULT 0 CHECK (bosses_beaten >= 0),
  PRIMARY KEY (user_id, subject)
);

-- Одоо байгаа ахицыг дууссан даалгавруудаас сэргээнэ: XP-г хичээлээр нь, boss-ыг тухайн хичээлд дарааллаар
-- ялсан (5-аас 3+ зөв) бүлгийн тоогоор.
INSERT INTO subject_progress (user_id, subject, xp, bosses_beaten)
SELECT t.user_id, t.subject, SUM(COALESCE(t.xp_awarded, 0)),
  (SELECT CASE
     WHEN NOT EXISTS (SELECT 1 FROM tasks b WHERE b.user_id = t.user_id AND b.subject = t.subject AND b.boss = 0 AND b.status = 'completed' AND b.correct_count >= 3) THEN 0
     WHEN NOT EXISTS (SELECT 1 FROM tasks b WHERE b.user_id = t.user_id AND b.subject = t.subject AND b.boss = 1 AND b.status = 'completed' AND b.correct_count >= 3) THEN 1
     WHEN NOT EXISTS (SELECT 1 FROM tasks b WHERE b.user_id = t.user_id AND b.subject = t.subject AND b.boss = 2 AND b.status = 'completed' AND b.correct_count >= 3) THEN 2
     ELSE 3 END)
FROM tasks t
WHERE t.status = 'completed'
GROUP BY t.user_id, t.subject;
