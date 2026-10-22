-- Тулааны урилгын код ба лобби.
-- visibility: 'public' = ижил түвшний бүх хүүхдийн лобби дээр гарна, 'private' = зөвхөн кодоор орно.
-- code: 6 оронтой урилгын код (нээлттэй сорилтуудын дунд давтагдахгүй, хаагдмагц дахин ашиглагдаж болно).
-- creator_seen_at: үүсгэгч лобби дээрээ хүлээж байгааг (poll) тэмдэглэнэ; удаан алга бол сорилт лобби дээр
-- харагдахгүй, бүр удвал цуцлагдана (GAME.DUEL.LOBBY_PRESENCE_MS, OPEN_TTL_MS; end_reason = 'expired').
ALTER TABLE duels ADD COLUMN visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'private'));
ALTER TABLE duels ADD COLUMN code TEXT;
ALTER TABLE duels ADD COLUMN creator_seen_at INTEGER;
CREATE UNIQUE INDEX IF NOT EXISTS idx_duels_open_code ON duels(code) WHERE status = 'open';
