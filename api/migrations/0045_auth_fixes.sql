-- auth_attempts-ийн хуучин мөрийг created_at-аар устгадаг (services/authLimits takeAttempts).
-- Түлхүүрт 'user:<нэр>:<sha256(сүлжээ)>' нэмэгдэв: нэг нэрийн нууц үгийг өөр сүлжээнээс таахад эзнийг нь түгжихгүй.
CREATE INDEX idx_auth_attempts_created ON auth_attempts(created_at);

-- Session одоо sliding (created_at = сүүлд сунгасан агшин). Өмнө нь хэзээ ч сунгагддаггүй байсан тул одоо байгаа бүгдийг
-- "одоо ашигласан" гэж үзнэ: эс бөгөөс 60 хоногоос өмнө нэвтэрсэн, өдөр бүр тоглодог хүүхэд ч гарна.
UPDATE sessions SET created_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000;
-- Хугацаа нь дууссан session-уудыг created_at-аар устгадаг (createSession).
CREATE INDEX idx_sessions_created ON sessions(created_at);

-- Шүүгчийн нэвтрэлт хасагдсан (#294): сүлжээний хязгаарын хүснэгт хэрэглэгдэхгүй.
DROP TABLE IF EXISTS judge_signups;
