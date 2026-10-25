-- Ярилцлага бүрт баавгайн ярьсан хугацаа (ms): TTS-ийн зардал нь үүнээс гардаг (GAME.TUTOR.BEAR_SPEECH_MS-ээр хязгаарлагдана).
-- NULL = энэ migration-аас өмнөх ярилцлага.
ALTER TABLE tutor_sessions ADD COLUMN bear_ms INTEGER;
