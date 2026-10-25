-- Найзууд. Нэг мөр = хоёр хүүхдийн нэг холбоо: from_id хүсэлт илгээсэн, to_id хүлээн авсан.
-- status: 'pending' = зөвшөөрөхийг хүлээж буй, 'accepted' = найзууд. Татгалзах, цуцлах, найзаас хасахад мөр устна.
-- Хоёр хүүхдийн хооронд чиглэлээс үл хамааран нэг л мөр байна (idx_friendships_pair).
CREATE TABLE friendships (
  from_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status      TEXT    NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted')),
  created_at  INTEGER NOT NULL,
  accepted_at INTEGER,
  PRIMARY KEY (from_id, to_id),
  CHECK (from_id <> to_id)
);
CREATE UNIQUE INDEX idx_friendships_pair ON friendships(min(from_id, to_id), max(from_id, to_id));
CREATE INDEX idx_friendships_to ON friendships(to_id, status);
