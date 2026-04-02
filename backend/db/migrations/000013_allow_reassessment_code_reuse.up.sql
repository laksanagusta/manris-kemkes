DROP INDEX IF EXISTS idx_risks_code_unique;

CREATE UNIQUE INDEX IF NOT EXISTS idx_risks_code_unique
ON risks(code)
WHERE code IS NOT NULL AND is_current = TRUE;
