-- Enforce NIP as a stable login identifier.
-- Existing data must already have non-empty, unique NIP values before this migration runs.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM users
        WHERE TRIM(COALESCE(nip, '')) = ''
    ) THEN
        RAISE EXCEPTION 'cannot apply NIP cutover: users with empty NIP still exist';
    END IF;

    IF EXISTS (
        SELECT nip
        FROM users
        GROUP BY nip
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION 'cannot apply NIP cutover: duplicate NIP values still exist';
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS users_nip_unique_idx ON users (nip);
