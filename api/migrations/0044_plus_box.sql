-- KUMA Plus бэлэг хайрцаг: Plus төлбөр бүрт 1 нэмэгдэнэ (services/payments confirmPayment), нээхэд 1 хасагдана
-- (services/plusBox). Одоо Plus идэвхтэй хэрэглэгчид 1 хайрцаг өгнө.
ALTER TABLE users ADD COLUMN plus_boxes INTEGER NOT NULL DEFAULT 0 CHECK (plus_boxes >= 0);
UPDATE users SET plus_boxes = 1
  WHERE plan = 'plus' AND (plan_until IS NULL OR plan_until > CAST(strftime('%s', 'now') AS INTEGER) * 1000);
