ALTER TABLE risks
  ADD COLUMN IF NOT EXISTS assessment_cycle TEXT,
  ADD COLUMN IF NOT EXISTS review_type TEXT CHECK (review_type IN ('periodic', 'ad_hoc')),
  ADD COLUMN IF NOT EXISTS change_reason TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS review_summary TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS review_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS review_submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS review_approved_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_risks_assessment_cycle ON risks(assessment_cycle);
CREATE INDEX IF NOT EXISTS idx_risks_review_type ON risks(review_type);
CREATE INDEX IF NOT EXISTS idx_risks_version_cycle_status ON risks(version_group_id, assessment_cycle, status);
