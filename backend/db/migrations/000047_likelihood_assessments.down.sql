DROP INDEX IF EXISTS idx_risks_likelihood_assessment_id;
ALTER TABLE risks DROP COLUMN IF EXISTS likelihood_assessment_id;
DROP TABLE IF EXISTS likelihood_assessments;
