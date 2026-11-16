DROP TRIGGER invalidate_user_email_verification ON users;
DROP FUNCTION invalidate_user_email_verification();
DROP TABLE auth_email_tokens;
ALTER TABLE users DROP COLUMN email_verified_at;
