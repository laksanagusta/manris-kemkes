ALTER TABLE users ADD COLUMN must_change_password BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_status_check;

UPDATE users
SET status = 'active'
WHERE status IS NULL OR status = '';

ALTER TABLE users ADD CONSTRAINT users_status_check
	CHECK (status IN ('pending_activation', 'active', 'inactive'));

UPDATE users
SET must_change_password = false
WHERE must_change_password IS NULL;
