UPDATE risks SET category = 'strategis' WHERE category = 'kebijakan';
UPDATE risks SET category = 'finansial' WHERE category = 'fraud_korupsi';
UPDATE risks SET category = 'teknologi_informasi' WHERE category = 'legal';

ALTER TABLE risks DROP CONSTRAINT IF EXISTS risks_category_check;

ALTER TABLE risks ADD CONSTRAINT risks_category_check
    CHECK (category IN ('', 'strategis', 'operasional', 'kepatuhan', 'finansial', 'reputasi', 'teknologi_informasi'));