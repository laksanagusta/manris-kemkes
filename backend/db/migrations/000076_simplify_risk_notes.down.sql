BEGIN;
-- Original date/method values cannot be recovered after applying the up migration.
ALTER TABLE communication_logs ADD COLUMN date date, ADD COLUMN method text;
UPDATE communication_logs SET date = (COALESCE(created_at, now()) AT TIME ZONE 'Asia/Jakarta')::date, method = 'Chat';
ALTER TABLE communication_logs ALTER COLUMN date SET NOT NULL, ALTER COLUMN method SET NOT NULL;
COMMIT;
