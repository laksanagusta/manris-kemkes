CREATE TABLE tmpmr_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    period TEXT NOT NULL,
    assessor_id UUID REFERENCES users(id),
    reviewer_id UUID REFERENCES users(id),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','reviewed','approved')),
    score NUMERIC(6,2) NOT NULL DEFAULT 0,
    maturity_level TEXT NOT NULL DEFAULT 'Awal',
    review_note TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (organization_id, period)
);

CREATE TABLE tmpmr_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id UUID NOT NULL REFERENCES tmpmr_assessments(id) ON DELETE CASCADE,
    dimension TEXT NOT NULL CHECK (dimension IN (
        'governance',
        'context_criteria',
        'risk_assessment',
        'risk_treatment',
        'monitoring_review',
        'recording_reporting'
    )),
    question TEXT NOT NULL,
    score INTEGER NOT NULL DEFAULT 0 CHECK (score BETWEEN 0 AND 5),
    evidence_url TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE formal_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    period TEXT NOT NULL,
    report_type TEXT NOT NULL CHECK (report_type IN (
        'annual_risk_profile',
        'semiannual_mr_implementation',
        'semiannual_mr_supervision',
        'tmpmr_report'
    )),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','generated','submitted','approved')),
    generated_file_url TEXT NOT NULL DEFAULT '',
    generated_by UUID REFERENCES users(id),
    generated_at TIMESTAMPTZ,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (organization_id, period, report_type)
);

CREATE INDEX idx_tmpmr_assessments_org_period ON tmpmr_assessments(organization_id, period);
CREATE INDEX idx_tmpmr_items_assessment ON tmpmr_items(assessment_id);
CREATE INDEX idx_formal_reports_org_period ON formal_reports(organization_id, period);
CREATE INDEX idx_formal_reports_type ON formal_reports(report_type);
