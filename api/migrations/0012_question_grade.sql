-- Сурах бичигт үндэслэсэн асуулт зөвхөн тэр номын ангийн сурагчид гарна (6-р анги Математик 7-ийн асуулт авахгүй).
-- grade = book_ref-ийн номын анги (books.grade); номгүй асуулт (book_ref NULL) түвшиндээ нийтлэг хэвээр.
ALTER TABLE questions ADD COLUMN grade INTEGER;

-- Одоо байгаа номын slug-ууд '<хичээл>-<анги>' ('math-7:5-6' → 7). Ийм биш slug-тай асуулт 0 болж хэнд ч гарахгүй.
UPDATE questions SET grade = CAST(substr(book_ref, instr(book_ref, '-') + 1) AS INTEGER) WHERE book_ref IS NOT NULL;
