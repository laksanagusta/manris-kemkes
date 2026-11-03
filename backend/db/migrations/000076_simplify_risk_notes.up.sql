BEGIN;
ALTER TABLE communication_logs
  DROP COLUMN date,
  DROP COLUMN method;
COMMIT;
