-- Профайл хуваалцах.
-- profile_code: бусдад өгөх 8 оронтой код (GAME.PROFILE.CODE_LENGTH). Кодыг мэдэх хүн л профайлыг харна; анх профайлаа
-- нээхэд үүснэ (NULL = хараахан үүсээгүй), солиход хуучин нь ажиллахаа болино.
-- bear_look: нүүрэн дээр сонгосон дэвсгэр, хувцас (JSON { bg, outfit }) — профайл дээр бусдад харагдана. NULL = анхдагч.
ALTER TABLE users ADD COLUMN profile_code TEXT;
ALTER TABLE users ADD COLUMN bear_look TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_profile_code ON users(profile_code);
