ALTER TABLE risks
    ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT '';

ALTER TABLE risks
    DROP CONSTRAINT IF EXISTS risks_category_check;

ALTER TABLE risks
    ADD CONSTRAINT risks_category_check
    CHECK (category IN ('', 'strategis', 'operasional', 'kepatuhan', 'finansial', 'reputasi', 'teknologi_informasi'));

CREATE INDEX IF NOT EXISTS idx_risks_category ON risks(category);
