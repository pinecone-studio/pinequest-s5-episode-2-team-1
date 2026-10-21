-- Сурах бичгийн сан (BOOKS): ном ба хуудас бүрийн файл.
-- Эх файл R2-д (BOOK_FILES, түлхүүр нь r2_key), энд мэдээлэл ба (дараа нь) OCR текст.
-- Үнэний эх сурвалж нь api/books/<slug>/ хавтас: `npm run books:import` эндээс дахин үүсгэнэ.
-- Хугацаа (*_at) бүгд epoch ms.

CREATE TABLE books (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  slug        TEXT    NOT NULL UNIQUE,            -- хавтасны нэр: 'mongolian-7'
  subject     TEXT    NOT NULL,                   -- 'math' | 'mongolian' | 'physics' | …
  grade       INTEGER NOT NULL CHECK (grade BETWEEN 1 AND 12),
  title       TEXT    NOT NULL,                   -- 'Монгол хэл 7'
  year        INTEGER,                            -- хэвлэгдсэн он
  publisher   TEXT,
  source      TEXT    NOT NULL CHECK (source IN ('scan', 'web')),  -- биет номын скан | онлайн хувилбарын зураг
  page_offset INTEGER NOT NULL DEFAULT 0,         -- хэвлэмэл хуудасны дугаар = seq − page_offset
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);

CREATE TABLE book_pages (
  book_id    INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  seq        INTEGER NOT NULL CHECK (seq >= 1),   -- хавтас дахь файлын дарааллаарх хуудас: 1, 2, 3…
  origin     TEXT    NOT NULL,                    -- аль файлаас: 'mongol7.pdf#45' | '045.jpg'
  r2_key     TEXT    NOT NULL,                    -- 'mongolian-7/p0045.pdf'
  mime       TEXT    NOT NULL,                    -- application/pdf | image/jpeg | image/png | image/webp
  bytes      INTEGER NOT NULL,
  sha256     TEXT    NOT NULL,                    -- файл өөрчлөгдсөн эсэхийг таних
  text_md    TEXT,                                -- OCR текст (markdown); файл солигдвол NULL болно
  ocr_model  TEXT,
  ocr_at     INTEGER,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (book_id, seq)
);
