-- Баавгайн дэвсгэр өнгө, хувцасны эзэмшил (config/cosmetics.ts). Үнэ серверт, худалдан авалт point_ledger-т бичигдэнэ.
CREATE TABLE IF NOT EXISTS user_cosmetics (
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cosmetic_id TEXT    NOT NULL,
  acquired_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, cosmetic_id)
);

-- startTask нь шинэ даалгавраа tx nonce-оор олдог.
CREATE INDEX IF NOT EXISTS idx_tasks_tx ON tasks(tx);
