-- Зангилаа бүр 3 шаттай (бодлогын хүнд): 1 Суурь, 2 Дунд, 3 Ахисан. 2-ыг давахад дараагийн зангилаа нээгдэнэ,
-- 3 нь заавал биш сорил. Мөр = тухайн зангилааны давсан хамгийн өндөр шат (байхгүй бол 0).
CREATE TABLE node_stages (
  user_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject  TEXT    NOT NULL,
  node     INTEGER NOT NULL CHECK (node >= 0),
  stage    INTEGER NOT NULL CHECK (stage BETWEEN 1 AND 3),
  PRIMARY KEY (user_id, subject, node)
);

-- Даалгавар аль зангилааны аль шатных (хаалганы тулаан, хуучин даалгавар бол stage NULL).
ALTER TABLE tasks ADD COLUMN node INTEGER;
ALTER TABLE tasks ADD COLUMN stage INTEGER;
