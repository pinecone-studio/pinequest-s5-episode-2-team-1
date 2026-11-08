-- Төлбөрийн багц: free (үнэгүй), plus (KUMA Plus), max (KUMA Max). Бүх хэрэглэгч free-ээс эхэлнэ.
-- plan_until: төлбөртэй багц дуусах мөч (ms). NULL = хугацаагүй. Хугацаа өнгөрвөл сервер free гэж тооцно (domain/plan.ts).
ALTER TABLE users ADD COLUMN plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'plus', 'max'));
ALTER TABLE users ADD COLUMN plan_until INTEGER;
