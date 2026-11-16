-- Invalidate outstanding reset passwords before removing their expiry.
UPDATE users
SET password_hash = '', updated_at = NOW()
WHERE temporary_password_expires_at IS NOT NULL;
ALTER TABLE users DROP COLUMN temporary_password_expires_at;
