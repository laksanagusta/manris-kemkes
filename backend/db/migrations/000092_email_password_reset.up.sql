ALTER TABLE users ADD COLUMN email_verified_at timestamptz;

CREATE TABLE auth_email_tokens (
    token_hash char(64) PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    purpose text NOT NULL CHECK (purpose IN ('verify_email', 'reset_password')),
    email text NOT NULL,
    password_fingerprint char(64) NOT NULL,
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    expires_at timestamptz NOT NULL
);
CREATE INDEX auth_email_tokens_user_idx ON auth_email_tokens(user_id, purpose, created_at);

CREATE FUNCTION invalidate_user_email_verification() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.email IS DISTINCT FROM OLD.email THEN
        NEW.email_verified_at := NULL;
        DELETE FROM auth_email_tokens WHERE user_id=OLD.id;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER invalidate_user_email_verification
BEFORE UPDATE OF email ON users
FOR EACH ROW EXECUTE FUNCTION invalidate_user_email_verification();
