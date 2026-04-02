DROP INDEX IF EXISTS idx_risks_current_group_unique;
DROP INDEX IF EXISTS idx_risks_is_current;
DROP INDEX IF EXISTS idx_risks_version_group;

ALTER TABLE risks
  DROP COLUMN IF EXISTS archived_reason,
  DROP COLUMN IF EXISTS archived_at,
  DROP COLUMN IF EXISTS is_current,
  DROP COLUMN IF EXISTS previous_risk_id,
  DROP COLUMN IF EXISTS version_group_id;
