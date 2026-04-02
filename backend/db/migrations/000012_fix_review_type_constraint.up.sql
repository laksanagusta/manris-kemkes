ALTER TABLE risks DROP CONSTRAINT IF EXISTS risks_review_type_check;
ALTER TABLE risks ADD CONSTRAINT risks_review_type_check CHECK (review_type IN ('periodic', 'ad_hoc', ''));