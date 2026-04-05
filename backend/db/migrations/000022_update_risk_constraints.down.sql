ALTER TABLE risks DROP CONSTRAINT IF EXISTS risks_treatment_option_check;
ALTER TABLE risks ADD CONSTRAINT risks_treatment_option_check CHECK (treatment_option IN ('', 'avoid', 'mitigate', 'transfer', 'accept'));

ALTER TABLE risks DROP CONSTRAINT IF EXISTS risks_risk_source_check;
ALTER TABLE risks DROP CONSTRAINT IF EXISTS risks_risk_appetite_check;

UPDATE risks SET treatment_option = 'mitigate' WHERE treatment_option = 'mitigasi';
UPDATE risks SET treatment_option = 'accept' WHERE treatment_option = 'menerima';
