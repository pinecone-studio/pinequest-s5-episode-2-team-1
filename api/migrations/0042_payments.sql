-- Багцын төлбөр. Нэг мөр = нэг нэхэмжлэл. pending → paid үед users.plan, plan_until сунгагдана (services/payments.ts).
-- provider: төлбөрийн систем (жишээ нь 'qpay'). invoice_id: тэр системийн нэхэмжлэлийн дугаар.
CREATE TABLE payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  plan TEXT NOT NULL CHECK (plan IN ('plus', 'max')),
  amount INTEGER NOT NULL CHECK (amount > 0),
  days INTEGER NOT NULL CHECK (days > 0),
  provider TEXT NOT NULL,
  invoice_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed')),
  created_at INTEGER NOT NULL,
  paid_at INTEGER
);
CREATE UNIQUE INDEX payments_invoice ON payments (provider, invoice_id) WHERE invoice_id IS NOT NULL;
CREATE INDEX payments_user ON payments (user_id, created_at);
