-- Хуудасны текстийн чанар: ok | poor (эвдэрсэн тэмдэгт олонтой) | empty (текст давхаргагүй/бараг хоосон).
-- poor, empty хуудсыг `npm run books:ocr` Gemini-ээр уншина. ocr_model нь текстийн арга:
-- 'pdf-text' (PDF-ийн текст давхарга) | 'gemini:<загвар>'.
ALTER TABLE book_pages ADD COLUMN text_quality TEXT;
