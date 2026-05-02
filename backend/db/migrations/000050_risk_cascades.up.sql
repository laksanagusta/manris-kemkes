CREATE TABLE risk_cascades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_risk_id UUID NOT NULL REFERENCES risks(id) ON DELETE CASCADE,
    target_risk_id UUID REFERENCES risks(id) ON DELETE SET NULL,
    source_org_id UUID NOT NULL REFERENCES organizations(id),
    target_org_id UUID NOT NULL REFERENCES organizations(id),
    cascade_type TEXT NOT NULL CHECK (cascade_type IN ('mandatory_top_down','recommended_top_down','bottom_up_escalation')),
    adoption_type TEXT CHECK (adoption_type IN ('full','partial')),
    status TEXT NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed','analyzed','accepted','rejected','implemented')),
    analysis_note TEXT NOT NULL DEFAULT '',
    decision_note TEXT NOT NULL DEFAULT '',
    proposed_by UUID REFERENCES users(id),
    decided_by UUID REFERENCES users(id),
    decided_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_risk_cascades_source_org_status ON risk_cascades(source_org_id, status);
CREATE INDEX idx_risk_cascades_target_org_status ON risk_cascades(target_org_id, status);
CREATE INDEX idx_risk_cascades_source_risk ON risk_cascades(source_risk_id);
