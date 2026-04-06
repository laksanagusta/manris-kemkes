-- Migration: Add is_cycle_current flag for semester-based risk versioning
-- This allows tracking which risk version is current for each assessment cycle (semester)
-- enabling multiple reassessments within a semester while maintaining history per semester

-- Add is_cycle_current column
-- This flag marks which version is the active/valid one for a specific assessment cycle
-- Unlike is_current (global current across all cycles), is_cycle_current is per-cycle
ALTER TABLE risks ADD COLUMN IF NOT EXISTS is_cycle_current BOOLEAN NOT NULL DEFAULT FALSE;

-- Create unique partial index: only ONE risk per (version_group_id, assessment_cycle) can be is_cycle_current
-- This ensures that within a semester, there can only be one "current" version of a risk
CREATE UNIQUE INDEX IF NOT EXISTS idx_risks_cycle_current_unique
  ON risks(version_group_id, assessment_cycle)
  WHERE is_cycle_current = TRUE;

-- Create helper function to get the cycle-current risk for a given group and cycle
-- This is useful for reports and queries that need to find the active version in a specific semester
CREATE OR REPLACE FUNCTION get_cycle_current_risk(p_version_group_id UUID, p_assessment_cycle TEXT)
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT id FROM risks
    WHERE version_group_id = p_version_group_id
      AND assessment_cycle = p_assessment_cycle
      AND is_cycle_current = TRUE
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql;

-- Create index for faster cycle-based queries
CREATE INDEX IF NOT EXISTS idx_risks_assessment_cycle ON risks(assessment_cycle);
CREATE INDEX IF NOT EXISTS idx_risks_version_group_cycle ON risks(version_group_id, assessment_cycle);

-- Comment on the column for documentation
COMMENT ON COLUMN risks.is_cycle_current IS 
  'Marks this risk version as the current/active one for its assessment_cycle. 
   Only one version per (version_group_id, assessment_cycle) can have this set to TRUE.
   Used for semester-based reporting while allowing multiple reassessments within a semester.';