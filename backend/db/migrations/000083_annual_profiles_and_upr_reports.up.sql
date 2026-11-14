CREATE TABLE annual_risk_profile_versions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES organizations(id),
    year integer NOT NULL CHECK (year BETWEEN 1900 AND 9998),
    version integer NOT NULL CHECK (version > 0),
    previous_version_id uuid REFERENCES annual_risk_profile_versions(id),
    created_by uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    finalized_by uuid,
    finalized_at timestamptz,
    UNIQUE (organization_id, year, version)
);

CREATE UNIQUE INDEX annual_risk_profiles_one_draft
    ON annual_risk_profile_versions (organization_id, year) WHERE finalized_at IS NULL;

CREATE TABLE annual_risk_profile_members (
    profile_version_id uuid NOT NULL REFERENCES annual_risk_profile_versions(id) ON DELETE CASCADE,
    version_group_id uuid NOT NULL,
    risk_id uuid REFERENCES risks(id) ON DELETE SET NULL,
    source_risk_id uuid REFERENCES risks(id) ON DELETE SET NULL,
    objective_id uuid,
    effective_from date NOT NULL,
    change_reason text NOT NULL DEFAULT '',
    baseline jsonb,
    PRIMARY KEY (profile_version_id, version_group_id)
);

CREATE TABLE upr_report_versions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES organizations(id),
    kind text NOT NULL CHECK (kind IN ('semester', 'working_paper', 'evaluation')),
    period text NOT NULL,
    source_id uuid,
    profile_version_id uuid REFERENCES annual_risk_profile_versions(id),
    version integer NOT NULL CHECK (version > 0),
    previous_version_id uuid REFERENCES upr_report_versions(id),
    snapshot jsonb NOT NULL,
    finalized_by uuid NOT NULL,
    finalized_at timestamptz NOT NULL,
    CHECK ((kind = 'semester') = (source_id IS NULL)),
    CHECK ((kind = 'semester') = (profile_version_id IS NOT NULL))
);

CREATE UNIQUE INDEX upr_report_semester_version
    ON upr_report_versions (organization_id, period, version) WHERE kind = 'semester';
CREATE UNIQUE INDEX upr_report_source_version
    ON upr_report_versions (organization_id, kind, source_id, version) WHERE source_id IS NOT NULL;

CREATE TABLE upr_report_deliveries (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    report_version_id uuid NOT NULL UNIQUE REFERENCES upr_report_versions(id),
    recipient_organization_id uuid NOT NULL REFERENCES organizations(id),
    previous_delivery_id uuid REFERENCES upr_report_deliveries(id),
    sent_by uuid NOT NULL,
    sent_at timestamptz NOT NULL,
    resolution text CHECK (resolution IN ('accepted', 'changes_requested')),
    resolved_by uuid,
    resolved_at timestamptz,
    note text NOT NULL DEFAULT '',
    CHECK ((resolution IS NULL AND resolved_at IS NULL AND resolved_by IS NULL)
        OR (resolution IS NOT NULL AND resolved_at IS NOT NULL AND resolved_by IS NOT NULL)),
    CHECK (resolution IS DISTINCT FROM 'changes_requested' OR trim(note) <> '')
);

CREATE INDEX upr_report_incoming ON upr_report_deliveries (recipient_organization_id, sent_at DESC);
