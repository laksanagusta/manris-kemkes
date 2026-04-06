-- Rollback: Remove is_cycle_current flag

DROP INDEX IF EXISTS idx_risks_version_group_cycle;
DROP INDEX IF EXISTS idx_risks_assessment_cycle;
DROP FUNCTION IF EXISTS get_cycle_current_risk(UUID, TEXT);
DROP INDEX IF EXISTS idx_risks_cycle_current_unique;
ALTER TABLE risks DROP COLUMN IF EXISTS is_cycle_current;