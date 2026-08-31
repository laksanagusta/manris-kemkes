-- Keep nilai/target_nilai as the only writable score values.
-- The integer score fields are removed from the database. API/domain models
-- still expose rounded compatibility projections derived from nilai values.
UPDATE risks
SET nilai = inherent_score::numeric
WHERE nilai IS NULL
  AND inherent_score IS NOT NULL;

UPDATE risks
SET target_nilai = target_score::numeric
WHERE target_nilai IS NULL
  AND target_score IS NOT NULL;

ALTER TABLE risks
    DROP COLUMN IF EXISTS inherent_score,
    DROP COLUMN IF EXISTS target_score;

ALTER TABLE risks
    ALTER COLUMN nilai SET DEFAULT 0,
    ALTER COLUMN target_nilai SET DEFAULT 0;

COMMENT ON COLUMN risks.nilai IS 'Canonical inherent risk value. The API derives inherentScore by rounding this value.';
COMMENT ON COLUMN risks.target_nilai IS 'Canonical target risk value. The API derives targetScore by rounding this value.';
