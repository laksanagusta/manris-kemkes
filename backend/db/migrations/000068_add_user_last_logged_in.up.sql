ALTER TABLE users
    ADD COLUMN last_logged_in timestamp with time zone;

UPDATE users
SET last_logged_in = COALESCE(updated_at, created_at, NOW());

ALTER TABLE users
    ALTER COLUMN last_logged_in SET DEFAULT NOW(),
    ALTER COLUMN last_logged_in SET NOT NULL;
