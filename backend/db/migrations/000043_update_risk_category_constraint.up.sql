UPDATE risks SET category = 'kebijakan' WHERE category = 'strategis';
UPDATE risks SET category = 'fraud_korupsi' WHERE category = 'finansial';
UPDATE risks SET category = 'legal' WHERE category = 'teknologi_informasi';

ALTER TABLE risks DROP CONSTRAINT IF EXISTS risks_category_check;

ALTER TABLE risks ADD CONSTRAINT risks_category_check
    CHECK (category IN ('', 'kebijakan', 'operasional', 'kepatuhan', 'fraud_korupsi', 'reputasi', 'legal'));