CREATE TABLE IF NOT EXISTS risk_charters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    upr_level TEXT NOT NULL CHECK (upr_level IN ('eksekutif','upr_t1','upr_t2')),
    period TEXT NOT NULL,
    risk_owner_name TEXT NOT NULL,
    risk_owner_user_id UUID REFERENCES users(id),
    risk_team_name TEXT NOT NULL DEFAULT '',
    scope TEXT NOT NULL DEFAULT '',
    legal_basis TEXT NOT NULL DEFAULT '',
    internal_context TEXT NOT NULL DEFAULT '',
    external_context TEXT NOT NULL DEFAULT '',
    stakeholder_summary TEXT NOT NULL DEFAULT '',
    upr_structure JSONB NOT NULL DEFAULT '[]'::jsonb,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','in_review','approved','archived')),
    created_by UUID REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (organization_id, period, upr_level)
);

CREATE INDEX IF NOT EXISTS idx_risk_charters_org_period ON risk_charters(organization_id, period);
CREATE INDEX IF NOT EXISTS idx_risk_charters_status ON risk_charters(status);
