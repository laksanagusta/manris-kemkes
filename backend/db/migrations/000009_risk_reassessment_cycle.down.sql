DROP INDEX IF EXISTS idx_risks_version_cycle_status;
DROP INDEX IF EXISTS idx_risks_review_type;
DROP INDEX IF EXISTS idx_risks_assessment_cycle;

ALTER TABLE risks
  DROP COLUMN IF EXISTS review_approved_at,
  DROP COLUMN IF EXISTS review_submitted_at,
  DROP COLUMN IF EXISTS review_started_at,
  DROP COLUMN IF EXISTS review_summary,
  DROP COLUMN IF EXISTS change_reason,
  DROP COLUMN IF EXISTS review_type,
  DROP COLUMN IF EXISTS assessment_cycle;
