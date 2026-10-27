-- 3-р бүлэг (Нарны элсэн хаант улс): нууц хайрцаг ба цүнхний хэрэглэгдэхүүн (shared/loot.ts).
CREATE TABLE inventory (
  user_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item     TEXT    NOT NULL,
  qty      INTEGER NOT NULL DEFAULT 0 CHECK (qty >= 0),
  PRIMARY KEY (user_id, item)
);

-- Хайрцаг бүр (хичээл, зангилаа) нэг л удаа нээгдэнэ; гарсан шагнал хадгалагдаж дахин солигдохгүй.
CREATE TABLE chests (
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject    TEXT    NOT NULL,
  node       INTEGER NOT NULL CHECK (node >= 0),
  kind       TEXT    NOT NULL,
  qty        INTEGER NOT NULL,
  tx         TEXT    NOT NULL,
  opened_at  INTEGER NOT NULL,
  PRIMARY KEY (user_id, subject, node)
);

-- Хувын болор ашигласан асуулт: дахин дарахад дахин зарцуулахгүй.
ALTER TABLE task_questions ADD COLUMN hint INTEGER NOT NULL DEFAULT 0;

-- 3-р бүлэгт 2 цэргийн хаалга нэмэгдэв (хаалга 5 → 7): хуучин сүүлийн boss-ыг давсан хүн бүгдийг давсан хэвээр.
UPDATE subject_progress SET bosses_beaten = bosses_beaten + 2 WHERE bosses_beaten >= 5;
