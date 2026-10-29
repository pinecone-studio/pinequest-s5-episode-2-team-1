-- Шүүгчийн бүртгэл (POST /auth/judge): тоглоомын бүх боломж нээлттэй (хувцас, зам, шат, boss, амь), харин admin-ийн
-- хэрэгсэл (анги солих г.м.) байхгүй.
ALTER TABLE users ADD COLUMN is_judge INTEGER NOT NULL DEFAULT 0;
