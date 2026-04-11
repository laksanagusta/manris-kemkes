DROP INDEX IF EXISTS idx_risks_version_group_version;
ALTER TABLE risks DROP COLUMN IF EXISTS version_number;
