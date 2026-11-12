BEGIN;
-- Original stakeholder values cannot be recovered after applying the up migration.
ALTER TABLE communication_logs ADD COLUMN stakeholder text NOT NULL DEFAULT '';
ALTER TABLE communication_logs ALTER COLUMN stakeholder DROP DEFAULT;
COMMIT;
