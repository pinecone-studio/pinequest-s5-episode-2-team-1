-- Даалгаврын төрөл: 'path' = сурах замын зангилаа (шат, хаалга), 'review' = өнөөдрийн хичээл (хүүхдийн өмнө хийсэн
-- хичээлүүдээс санамсаргүй нэгийг 3 бодлогоор давтана; замд нөлөөлөхгүй, давтлага үүсгэхгүй).
ALTER TABLE tasks ADD COLUMN kind TEXT NOT NULL DEFAULT 'path' CHECK (kind IN ('path', 'review'));
