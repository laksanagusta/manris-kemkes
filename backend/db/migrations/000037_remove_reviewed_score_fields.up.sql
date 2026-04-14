-- Migration 000037: Remove reviewed scoring fields
-- This migration drops all 9 reviewed scoring columns from the risks table
-- that were added in migration 000027 but are no longer needed.
-- Columns removed:
--   - reviewed_probability, reviewed_impact, reviewed_weight
--   - reviewed_nilai, reviewed_score
--   - score_change_label, effectiveness_label
--   - reviewed_by, reviewed_at

ALTER TABLE risks
  DROP COLUMN IF EXISTS reviewed_probability,
  DROP COLUMN IF EXISTS reviewed_impact,
  DROP COLUMN IF EXISTS reviewed_weight,
  DROP COLUMN IF EXISTS reviewed_nilai,
  DROP COLUMN IF EXISTS reviewed_score,
  DROP COLUMN IF EXISTS score_change_label,
  DROP COLUMN IF EXISTS effectiveness_label,
  DROP COLUMN IF EXISTS reviewed_by,
  DROP COLUMN IF EXISTS reviewed_at;
