DROP INDEX IF EXISTS idx_kris_is_archived;

ALTER TABLE kris
DROP COLUMN IF EXISTS archived_reason,
DROP COLUMN IF EXISTS archived_at,
DROP COLUMN IF EXISTS is_archived,
DROP COLUMN IF EXISTS amber_threshold_max,
DROP COLUMN IF EXISTS amber_threshold_min;
