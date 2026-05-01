DROP INDEX IF EXISTS idx_risks_impact_criteria_id;
ALTER TABLE risks DROP COLUMN IF EXISTS impact_justification;
ALTER TABLE risks DROP COLUMN IF EXISTS impact_criteria_id;
DROP TABLE IF EXISTS impact_criteria;