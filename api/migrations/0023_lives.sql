-- Амь: зангилаа руу орох (шинэ даалгавар эхлүүлэх) бүрт нэг хасагдана, 2 цаг тутамд нэг нөхөгдөнө (5 хүртэл).
-- lives_at = нөхөгдөлтийн тоолуур эхэлсэн мөч (ms); дүүрэн бол NULL. Одоо байгаа хүүхэд дүүрэн амьтай эхэлнэ.
ALTER TABLE users ADD COLUMN lives INTEGER NOT NULL DEFAULT 5 CHECK (lives BETWEEN 0 AND 5);
ALTER TABLE users ADD COLUMN lives_at INTEGER;
