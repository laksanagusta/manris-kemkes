-- Remove reviewer scoring fields
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
