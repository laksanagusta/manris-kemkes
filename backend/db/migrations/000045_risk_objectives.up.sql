CREATE TABLE IF NOT EXISTS risk_objectives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    charter_id UUID REFERENCES risk_charters(id),
    period TEXT NOT NULL,
    tujuan TEXT NOT NULL,
    sasaran TEXT NOT NULL,
    indikator_kinerja_utama TEXT NOT NULL,
    target TEXT NOT NULL DEFAULT '',
    program TEXT NOT NULL DEFAULT '',
    kegiatan TEXT NOT NULL DEFAULT '',
    process_business TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'in_review', 'approved', 'archived')),
    created_by UUID REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_risk_objectives_org_period ON risk_objectives(organization_id, period);
CREATE INDEX IF NOT EXISTS idx_risk_objectives_charter ON risk_objectives(charter_id);