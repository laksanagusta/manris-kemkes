ALTER TABLE incidents
    DROP CONSTRAINT IF EXISTS incidents_status_check;

ALTER TABLE incidents
    ADD CONSTRAINT incidents_status_check
    CHECK (status IN ('draft', 'final', 'approved', 'rejected', 'open', 'investigating', 'resolved', 'closed'));

CREATE TABLE IF NOT EXISTS incident_risk_links (
    incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    risk_id     UUID NOT NULL REFERENCES risks(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (incident_id, risk_id)
);

CREATE INDEX IF NOT EXISTS idx_incident_risk_links_risk_id
    ON incident_risk_links (risk_id);

INSERT INTO incident_risk_links (incident_id, risk_id, created_at)
SELECT id, linked_risk_id, now()
FROM incidents
WHERE linked_risk_id IS NOT NULL
ON CONFLICT (incident_id, risk_id) DO NOTHING;
