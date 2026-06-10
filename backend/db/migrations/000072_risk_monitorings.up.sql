CREATE TABLE IF NOT EXISTS risk_monitorings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_risk_id UUID NOT NULL REFERENCES risks(id) ON DELETE RESTRICT,
    result_risk_id UUID REFERENCES risks(id) ON DELETE SET NULL,
    assessment_cycle TEXT NOT NULL CHECK (assessment_cycle ~ '^[0-9]{4}-H[12]$'),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'finalized', 'void')),
    mode TEXT NOT NULL DEFAULT 'score_only' CHECK (mode IN ('score_only', 'with_profile_revision')),

    source_probability INTEGER NOT NULL CHECK (source_probability BETWEEN 1 AND 5),
    source_impact INTEGER NOT NULL CHECK (source_impact BETWEEN 1 AND 5),
    source_weight NUMERIC(10,4) NOT NULL DEFAULT 1,
    source_nilai NUMERIC(10,4) NOT NULL DEFAULT 0,
    source_level TEXT NOT NULL DEFAULT '',
    source_version_number INTEGER NOT NULL DEFAULT 1,

    observed_probability INTEGER,
    observed_impact INTEGER,
    observed_weight NUMERIC(10,4),
    observed_nilai NUMERIC(10,4),
    observed_level TEXT NOT NULL DEFAULT '',

    condition_summary TEXT NOT NULL DEFAULT '',
    event_summary TEXT NOT NULL DEFAULT '',
    trend TEXT NOT NULL DEFAULT 'stable' CHECK (trend IN ('up', 'down', 'stable')),
    effectiveness_conclusion TEXT NOT NULL DEFAULT '',
    follow_up_note TEXT NOT NULL DEFAULT '',
    conclusion TEXT NOT NULL DEFAULT '',

    mitigation_progress_summary TEXT NOT NULL DEFAULT '',
    mitigation_completion_percent INTEGER NOT NULL DEFAULT 0 CHECK (mitigation_completion_percent BETWEEN 0 AND 100),
    mitigation_obstacles TEXT NOT NULL DEFAULT '',
    mitigation_follow_up TEXT NOT NULL DEFAULT '',

    draft_title TEXT NOT NULL DEFAULT '',
    draft_category TEXT NOT NULL DEFAULT '',
    draft_cause TEXT[] NOT NULL DEFAULT '{}',
    draft_risk_source TEXT NOT NULL DEFAULT '',
    draft_controllability TEXT NOT NULL DEFAULT '',
    draft_impact_description TEXT[] NOT NULL DEFAULT '{}',
    draft_existing_control TEXT NOT NULL DEFAULT '',
    draft_treatment_option TEXT NOT NULL DEFAULT '',
    draft_mitigations JSONB NOT NULL DEFAULT '[]'::jsonb,
    profile_change_summary JSONB NOT NULL DEFAULT '[]'::jsonb,
    change_reason TEXT NOT NULL DEFAULT '',

    started_by UUID REFERENCES users(id),
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    finalized_by UUID REFERENCES users(id),
    finalized_at TIMESTAMPTZ,
    voided_by UUID REFERENCES users(id),
    voided_at TIMESTAMPTZ,
    void_reason TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_risk_monitorings_active_draft
    ON risk_monitorings(source_risk_id, assessment_cycle)
    WHERE status = 'draft';

CREATE UNIQUE INDEX IF NOT EXISTS idx_risk_monitorings_finalized_source_cycle
    ON risk_monitorings(source_risk_id, assessment_cycle)
    WHERE status = 'finalized';

CREATE INDEX IF NOT EXISTS idx_risk_monitorings_source
    ON risk_monitorings(source_risk_id);

CREATE INDEX IF NOT EXISTS idx_risk_monitorings_result
    ON risk_monitorings(result_risk_id);

CREATE INDEX IF NOT EXISTS idx_risk_monitorings_cycle_status
    ON risk_monitorings(assessment_cycle, status);
