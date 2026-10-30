-- Уулын Лиг (docs/design/clan-league.md).
-- public_id: лиг дээр Уулыг ялгах нийтийн танигч. Урилгын код (code)-оос тусдаа: кодыг өрсөлдөгчид хэзээ ч харуулахгүй,
-- тэгэхгүй бол хэн ч тэр Ууланд нэгдэнэ. Хэзээ ч солигдохгүй.
-- league_tier: Уулын одоогийн лиг (1 = Тэрэлж … 6 = Хүйтэн оргил). Шинэ Уул Тэрэлжээс эхэлнэ.
ALTER TABLE clans ADD COLUMN public_id TEXT;
ALTER TABLE clans ADD COLUMN league_tier INTEGER NOT NULL DEFAULT 1 CHECK (league_tier BETWEEN 1 AND 6);
UPDATE clans SET public_id = lower(hex(randomblob(5))) WHERE public_id IS NULL;
CREATE UNIQUE INDEX idx_clans_public ON clans(public_id);
