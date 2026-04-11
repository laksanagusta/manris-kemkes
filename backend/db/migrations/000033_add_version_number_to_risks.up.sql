-- Add version_number to risks table for explicit version labeling (v1, v2, v3...)
-- Baseline/initial risks get version 1; each reassessment increments by 1.

ALTER TABLE risks ADD COLUMN IF NOT EXISTS version_number INTEGER NOT NULL DEFAULT 1;

-- Backfill existing data: assign version numbers based on creation order within each version group
WITH numbered AS (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY version_group_id ORDER BY created_at ASC) AS rn
    FROM risks
    WHERE version_group_id IS NOT NULL
)
UPDATE risks
SET version_number = numbered.rn
FROM numbered
WHERE risks.id = numbered.id;

-- Index for efficient version lookups within a group
CREATE INDEX IF NOT EXISTS idx_risks_version_group_version
    ON risks (version_group_id, version_number DESC);
