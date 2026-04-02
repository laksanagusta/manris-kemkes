ALTER TABLE risks
  ADD COLUMN IF NOT EXISTS version_group_id UUID,
  ADD COLUMN IF NOT EXISTS previous_risk_id UUID REFERENCES risks(id),
  ADD COLUMN IF NOT EXISTS is_current BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS archived_reason TEXT NOT NULL DEFAULT '';

UPDATE risks
SET version_group_id = COALESCE(version_group_id, id),
    is_current = COALESCE(is_current, TRUE),
    archived_reason = COALESCE(archived_reason, '')
WHERE version_group_id IS NULL
   OR archived_reason IS NULL;

ALTER TABLE risks
  ALTER COLUMN version_group_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_risks_version_group ON risks(version_group_id);
CREATE INDEX IF NOT EXISTS idx_risks_is_current ON risks(is_current);
CREATE UNIQUE INDEX IF NOT EXISTS idx_risks_current_group_unique
  ON risks(version_group_id)
  WHERE is_current = TRUE;
