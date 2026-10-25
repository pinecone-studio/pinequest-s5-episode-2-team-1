-- Admin хэрэглэгч (хөгжүүлэгч): бүх зангилаа, boss руу орно, нөхөх давтлага үүсэхгүй, бүх хувцас эзэмшинэ.
-- Зөвхөн DB-ээр олгоно: UPDATE users SET is_admin = 1 WHERE username = '...';
ALTER TABLE users ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0;
