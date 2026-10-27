-- Хичээлийн асуултыг бүх санг уншилгүй олох (D1 өдрийн rows read хязгаар): book_ref-ийн эхний хуудас
-- ('math-7:46-49' → 46) ба (tier, subject, grade, flagged, book_page) индекс. Ангийн асуулт (grade) ч энэ индексээр.
ALTER TABLE questions ADD COLUMN book_page INTEGER;
UPDATE questions SET book_page = CAST(substr(book_ref, instr(book_ref, ':') + 1) AS INTEGER) WHERE book_ref IS NOT NULL;
CREATE INDEX idx_questions_page ON questions(tier, subject, grade, flagged, book_page);
