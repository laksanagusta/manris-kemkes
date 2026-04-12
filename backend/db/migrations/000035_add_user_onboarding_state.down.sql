ALTER TABLE users DROP CONSTRAINT IF EXISTS users_status_check;

UPDATE users
SET status = 'active'
WHERE status = 'pending_activation';

ALTER TABLE users DROP COLUMN IF EXISTS must_change_password;

ALTER TABLE users ADD CONSTRAINT users_status_check
	CHECK (status IN ('active', 'inactive'));
