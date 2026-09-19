CREATE TABLE IF NOT EXISTS incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE,
    title TEXT NOT NULL,
    what TEXT NOT NULL,
    who TEXT NOT NULL DEFAULT '',
    "when" TIMESTAMPTZ NOT NULL,
    "where" TEXT NOT NULL DEFAULT '',
    why_how TEXT NOT NULL DEFAULT '',
    severity TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'recorded',
    corrective_action TEXT NOT NULL DEFAULT '',
    preventive_action TEXT NOT NULL DEFAULT '',
    linked_risk_id UUID REFERENCES risks(id),
    reporter_id UUID REFERENCES users(id),
    organization_id UUID REFERENCES organizations(id),
    impact_types TEXT[] NOT NULL DEFAULT '{}',
    other_impact_type TEXT NOT NULL DEFAULT '',
    actual_impact TEXT NOT NULL DEFAULT '',
    immediate_response TEXT NOT NULL DEFAULT '',
    post_response_condition TEXT NOT NULL DEFAULT 'unknown',
    financial_loss NUMERIC(18,2),
    financial_loss_known BOOLEAN,
    disruption_duration TEXT NOT NULL DEFAULT '',
    extraordinary_reason TEXT NOT NULL DEFAULT '',
    ongoing_action TEXT NOT NULL DEFAULT '',
    evidence_url TEXT NOT NULL DEFAULT '',
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT incidents_severity_check CHECK (severity IN ('low','medium','high','extreme','insignificant','minor','major','critical')),
    CONSTRAINT incidents_condition_check CHECK (post_response_condition IN ('recovered','controlled','ongoing','worsening','unknown'))
);

ALTER TABLE incidents
    ADD COLUMN IF NOT EXISTS impact_types TEXT[] NOT NULL DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS other_impact_type TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS actual_impact TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS immediate_response TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS post_response_condition TEXT NOT NULL DEFAULT 'unknown',
    ADD COLUMN IF NOT EXISTS financial_loss NUMERIC(18,2),
    ADD COLUMN IF NOT EXISTS financial_loss_known BOOLEAN,
    ADD COLUMN IF NOT EXISTS disruption_duration TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS extraordinary_reason TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS ongoing_action TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS evidence_url TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id);

ALTER TABLE incidents DROP CONSTRAINT IF EXISTS incidents_status_check;
ALTER TABLE incidents ADD CONSTRAINT incidents_status_check
    CHECK (status IN ('recorded','draft','final','approved','rejected','open','investigating','resolved','closed'));
ALTER TABLE incidents DROP CONSTRAINT IF EXISTS incidents_severity_check;
ALTER TABLE incidents ADD CONSTRAINT incidents_severity_check
    CHECK (severity IN ('low','medium','high','extreme','insignificant','minor','major','critical'));
ALTER TABLE incidents DROP CONSTRAINT IF EXISTS incidents_condition_check;
ALTER TABLE incidents ADD CONSTRAINT incidents_condition_check
    CHECK (post_response_condition IN ('recovered','controlled','ongoing','worsening','unknown'));

CREATE TABLE IF NOT EXISTS incident_risk_links (
    incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    risk_id UUID NOT NULL REFERENCES risks(id) ON DELETE CASCADE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (incident_id, risk_id)
);

ALTER TABLE incident_risk_links
    ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id);

CREATE INDEX IF NOT EXISTS idx_incidents_org_occurred_at ON incidents(organization_id, "when" DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_severity ON incidents(severity);
CREATE INDEX IF NOT EXISTS idx_incident_risk_links_risk ON incident_risk_links(risk_id);
