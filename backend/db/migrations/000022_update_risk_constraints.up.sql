ALTER TABLE risks DROP CONSTRAINT IF EXISTS risks_treatment_option_check;
ALTER TABLE risks ADD CONSTRAINT risks_treatment_option_check CHECK (treatment_option IN ('', 'menerima', 'mitigasi', 'avoid', 'mitigate', 'transfer', 'accept'));

ALTER TABLE risks ADD CONSTRAINT risks_risk_source_check CHECK (risk_source IN ('', 'internal', 'eksternal'));

ALTER TABLE risks ADD CONSTRAINT risks_risk_appetite_check CHECK (risk_appetite IN ('', 'dalam_batas', 'di_atas_batas'));

UPDATE risks SET treatment_option = 'mitigasi' WHERE treatment_option IN ('mitigate', 'avoid', 'transfer');
UPDATE risks SET treatment_option = 'menerima' WHERE treatment_option = 'accept';

UPDATE risks SET risk_source = 'internal' WHERE risk_source = '' OR risk_source IS NULL;

UPDATE risks SET risk_appetite = 'dalam_batas' WHERE risk_appetite = '' OR risk_appetite IS NULL;
