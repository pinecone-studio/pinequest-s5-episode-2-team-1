-- Адал явдлын газрын зураг: бүлэг бүрийн boss-ыг ялж байж дараагийн бүлэг рүү шилжинэ.
-- users.bosses_beaten = дарааллаар ялсан boss-ын тоо (0 = эхний boss-ыг хараахан ялаагүй).
-- tasks.boss = энэ даалгавар аль бүлгийн boss-той тулаан бэ (NULL = ердийн даалгавар).
ALTER TABLE users ADD COLUMN bosses_beaten INTEGER NOT NULL DEFAULT 0;
ALTER TABLE tasks ADD COLUMN boss INTEGER;
