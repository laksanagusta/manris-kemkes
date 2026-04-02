ALTER TABLE mitigations
ADD COLUMN IF NOT EXISTS execution_schedule_text TEXT DEFAULT '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_risks_code_unique
ON risks(code)
WHERE code IS NOT NULL;
