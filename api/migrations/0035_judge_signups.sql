-- Шүүгчийн бүртгэлийг сүлжээ (IP) тус бүрээр хязгаарлана: нэг хүн товчийг олон дарж бүх хүний өдрийн хязгаарыг
-- (GAME.JUDGE.DAILY_MAX) дуусгаад жинхэнэ шүүгчдийг оруулахгүй болгохоос. IP-г өөрийг нь биш sha256-ийг нь хадгална.
CREATE TABLE judge_signups (
  ip_hash    TEXT    NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_judge_signups_ip ON judge_signups(ip_hash, created_at);
