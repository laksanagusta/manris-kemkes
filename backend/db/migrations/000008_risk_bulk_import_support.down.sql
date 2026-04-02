DROP INDEX IF EXISTS idx_risks_code_unique;

ALTER TABLE mitigations
DROP COLUMN IF EXISTS execution_schedule_text;
