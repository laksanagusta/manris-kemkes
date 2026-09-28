-- Keep corrected lifecycle records available for audit while excluding them
-- from active monitoring and profile snapshots.
ALTER TABLE risks
    ADD COLUMN superseded_by_risk_id UUID REFERENCES risks(id) ON DELETE SET NULL;

ALTER TABLE risk_monitorings
    ADD COLUMN superseded_by_monitoring_id UUID REFERENCES risk_monitorings(id) ON DELETE SET NULL;

ALTER TABLE risk_monitorings
    DROP CONSTRAINT IF EXISTS risk_monitorings_status_check,
    ADD CONSTRAINT risk_monitorings_status_check
        CHECK (status IN ('draft', 'final', 'superseded'));
