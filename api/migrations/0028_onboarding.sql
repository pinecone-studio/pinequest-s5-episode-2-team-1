-- Анх орохдоо асуудаг асуултын хариулт (shared/onboarding.ts): JSON. NULL = асуулт хараахан бөглөөгүй (анги нь
-- түр утга, onboarding-д солигдоно). Өмнөх хэрэглэгчдээс дахин асуухгүй.
ALTER TABLE users ADD COLUMN onboarding TEXT;
UPDATE users SET onboarding = '{}';
