-- Хичээлийн зангилааны 3 шат (Суурь, Дунд, Ахисан) хүндээрээ ялгаатай бодлого авна: 1 = хялбар, 2 = дунд, 3 = хүнд.
-- NULL = тодорхойгүй (LLM-ээр үүсгэсэн гэх мэт), дунд гэж тооцно. Хичээлийн мөрийг idx_questions_page-ээр уншдаг тул
-- шинэ индекс хэрэггүй.
ALTER TABLE questions ADD COLUMN difficulty INTEGER CHECK (difficulty BETWEEN 1 AND 3);
