-- 11, 12-р анги: users.grade-ийн CHECK-ийг 6–10-аас 6–12 болгоно (GAME.GRADE_MAX).
-- SQLite CHECK-ийг шууд өөрчилдөггүй. Хүснэгтийг дахин үүсгэвэл DROP TABLE users нь ON DELETE CASCADE-аар
-- sessions, tasks, point_ledger гэх мэтийг хоосолдог (D1-ийн defer_foreign_keys үүнийг зогсоодоггүй), тиймээс
-- шинэ багана нэмж утгыг хуулаад хуучныг нь устгана: хүснэгт, мөр, foreign key хэвээр үлдэнэ.
ALTER TABLE users ADD COLUMN grade_new INTEGER NOT NULL DEFAULT 6 CHECK (grade_new BETWEEN 6 AND 12);
UPDATE users SET grade_new = grade;
ALTER TABLE users DROP COLUMN grade;
ALTER TABLE users RENAME COLUMN grade_new TO grade;
