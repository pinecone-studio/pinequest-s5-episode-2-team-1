-- Асуултын хөтөлбөрийн сэдэв (api/src/config/topics.ts-ийн id). NULL = хараахан тэмдэглээгүй.
-- Нөхөх салаа зам ижил сэдвийн өөр асуултыг сонгоход ашиглана.
ALTER TABLE questions ADD COLUMN topic TEXT;
CREATE INDEX idx_questions_topic ON questions(tier, subject, topic, flagged);
