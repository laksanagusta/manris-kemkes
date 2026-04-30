DROP INDEX IF EXISTS idx_risks_objective_id;
ALTER TABLE risks DROP COLUMN IF EXISTS objective_id;
