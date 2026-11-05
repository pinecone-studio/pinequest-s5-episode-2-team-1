-- Нэвтрэх, бүртгүүлэх оролдлогын хязгаар (services/authLimits): нууц үг таах, PBKDF2-оор CPU дүүргэхээс.
-- key: 'user:<нэр>' ба 'net:<sha256(сүлжээ)>' (буруу нууц үг), 'reg:<sha256(сүлжээ)>' (бүртгэл). IP-г хадгалахгүй.
CREATE TABLE auth_attempts (
  key        TEXT    NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_auth_attempts_key ON auth_attempts(key, created_at);
