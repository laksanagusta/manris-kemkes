DROP INDEX IF EXISTS idx_risks_category;

ALTER TABLE risks
    DROP CONSTRAINT IF EXISTS risks_category_check;

ALTER TABLE risks
    DROP COLUMN IF EXISTS category;
