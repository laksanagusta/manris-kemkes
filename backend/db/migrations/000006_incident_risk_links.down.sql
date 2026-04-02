DROP TABLE IF EXISTS incident_risk_links;

ALTER TABLE incidents
    DROP CONSTRAINT IF EXISTS incidents_status_check;

ALTER TABLE incidents
    ADD CONSTRAINT incidents_status_check
    CHECK (status IN ('open', 'investigating', 'resolved', 'closed'));
