ALTER TABLE risk_monitorings DROP CONSTRAINT IF EXISTS risk_monitorings_assessment_cycle_check;
ALTER TABLE risk_monitorings ADD CONSTRAINT risk_monitorings_assessment_cycle_check CHECK (assessment_cycle ~ '^[0-9]{4}-H[12]$');
