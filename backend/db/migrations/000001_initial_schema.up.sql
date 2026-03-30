-- Organizations / Unit Kerja
CREATE TABLE IF NOT EXISTS organizations (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    parent_id   UUID REFERENCES organizations(id),
    created_at  TIMESTAMPTZ DEFAULT now()
);

-- Users
CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,
    username        TEXT UNIQUE NOT NULL,
    email           TEXT UNIQUE NOT NULL,
    password_hash   TEXT NOT NULL,
    role            TEXT NOT NULL CHECK (role IN ('superadmin','unit','reviewer','pimpinan')),
    organization_id UUID REFERENCES organizations(id),
    status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Risks
CREATE TABLE IF NOT EXISTS risks (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code                TEXT,
    title               TEXT NOT NULL,
    description         TEXT NOT NULL DEFAULT '',
    status              TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','final','approved','rejected')),
    organization_id     UUID REFERENCES organizations(id),
    created_by          UUID REFERENCES users(id),
    risk_owner_id       UUID REFERENCES users(id),
    control_owner_id    UUID REFERENCES users(id),

    -- Section 1: Identification
    cause               TEXT[] DEFAULT '{}',
    risk_source         TEXT DEFAULT '',
    controllability     TEXT DEFAULT 'C' CHECK (controllability IN ('C','UC')),
    impact_description  TEXT[] DEFAULT '{}',
    fishbone_data       JSONB,

    -- Section 2: Analysis
    existing_control        TEXT DEFAULT '',
    control_effectiveness   TEXT DEFAULT '' CHECK (control_effectiveness IN ('','efektif','tidak_efektif')),
    probability             INTEGER DEFAULT 3 CHECK (probability BETWEEN 1 AND 5),
    impact                  INTEGER DEFAULT 3 CHECK (impact BETWEEN 1 AND 5),
    weight                  NUMERIC(4,2) DEFAULT 1.0,
    inherent_score          INTEGER GENERATED ALWAYS AS (probability * impact) STORED,

    -- Section 3: Evaluation
    risk_priority       INTEGER DEFAULT 0,
    risk_appetite       TEXT DEFAULT '',
    treatment_option    TEXT DEFAULT '' CHECK (treatment_option IN ('','avoid','mitigate','transfer','accept')),

    -- Section 5: Target Reduction
    target_probability  INTEGER DEFAULT 1 CHECK (target_probability BETWEEN 1 AND 5),
    target_impact       INTEGER DEFAULT 1 CHECK (target_impact BETWEEN 1 AND 5),
    target_weight       NUMERIC(4,2) DEFAULT 1.0,
    target_score        INTEGER GENERATED ALWAYS AS (target_probability * target_impact) STORED,
    next_review_date    DATE,

    created_at          TIMESTAMPTZ DEFAULT now(),
    updated_at          TIMESTAMPTZ DEFAULT now()
);

-- Section 4: Mitigation Plans (RPR)
CREATE TABLE IF NOT EXISTS mitigations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    risk_id         UUID NOT NULL REFERENCES risks(id) ON DELETE CASCADE,
    action          TEXT NOT NULL,
    owner           TEXT DEFAULT '',
    owner_user_id   UUID REFERENCES users(id),
    due_date        DATE,
    frequency       TEXT DEFAULT 'insidental' CHECK (frequency IN ('insidental','rutin')),
    recurring_interval TEXT CHECK (recurring_interval IN (NULL,'harian','mingguan','bulanan','triwulan')),
    target_cost     NUMERIC(15,2) DEFAULT 0,
    sort_order      INTEGER DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- Incidents
CREATE TABLE IF NOT EXISTS incidents (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code            TEXT,
    title           TEXT NOT NULL,
    what            TEXT DEFAULT '',
    who             TEXT DEFAULT '',
    "when"          TIMESTAMPTZ,
    "where"         TEXT DEFAULT '',
    why_how         TEXT DEFAULT '',
    severity        TEXT DEFAULT 'minor' CHECK (severity IN ('insignificant','minor','major','critical')),
    status          TEXT DEFAULT 'open' CHECK (status IN ('open','investigating','resolved','closed')),
    corrective_action   TEXT DEFAULT '',
    preventive_action   TEXT DEFAULT '',
    linked_risk_id  UUID REFERENCES risks(id),
    reporter_id     UUID REFERENCES users(id),
    organization_id UUID REFERENCES organizations(id),
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Communication logs
CREATE TABLE IF NOT EXISTS communication_logs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    risk_id     UUID NOT NULL REFERENCES risks(id) ON DELETE CASCADE,
    date        DATE NOT NULL,
    method      TEXT NOT NULL,
    stakeholder TEXT NOT NULL,
    notes       TEXT DEFAULT '',
    created_by  UUID REFERENCES users(id),
    created_at  TIMESTAMPTZ DEFAULT now()
);

-- Lessons Learned
CREATE TABLE IF NOT EXISTS lessons_learned (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title           TEXT NOT NULL,
    description     TEXT DEFAULT '',
    source_type     TEXT DEFAULT 'risiko' CHECK (source_type IN ('risiko','insiden')),
    source_ref      TEXT DEFAULT '',
    success_factors TEXT DEFAULT '',
    failure_factors TEXT DEFAULT '',
    recommendations TEXT DEFAULT '',
    tags            TEXT[] DEFAULT '{}',
    author_id       UUID REFERENCES users(id),
    organization_id UUID REFERENCES organizations(id),
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- Controls
CREATE TABLE IF NOT EXISTS controls (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,
    description     TEXT DEFAULT '',
    owner           TEXT DEFAULT '',
    owner_user_id   UUID REFERENCES users(id),
    frequency       TEXT DEFAULT 'harian',
    control_type    TEXT DEFAULT 'preventif' CHECK (control_type IN ('preventif','detektif','korektif')),
    organization_id UUID REFERENCES organizations(id),
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- Control Testing Records
CREATE TABLE IF NOT EXISTS control_tests (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    control_id  UUID NOT NULL REFERENCES controls(id) ON DELETE CASCADE,
    test_date   DATE NOT NULL,
    tester      TEXT NOT NULL,
    result      TEXT NOT NULL CHECK (result IN ('efektif','tidak_efektif')),
    deficiency  TEXT DEFAULT '',
    created_at  TIMESTAMPTZ DEFAULT now()
);

-- KRI (Key Risk Indicators)
CREATE TABLE IF NOT EXISTS kris (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    risk_id         UUID NOT NULL REFERENCES risks(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    description     TEXT DEFAULT '',
    metric          TEXT DEFAULT '',
    threshold_min   NUMERIC(15,2) DEFAULT 0,
    threshold_max   NUMERIC(15,2) DEFAULT 100,
    current_value   NUMERIC(15,2) DEFAULT 0,
    direction       TEXT DEFAULT 'higher_worse' CHECK (direction IN ('higher_worse','lower_worse')),
    frequency       TEXT DEFAULT 'bulanan',
    organization_id UUID REFERENCES organizations(id),
    last_updated    TIMESTAMPTZ DEFAULT now(),
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_risks_org ON risks(organization_id);
CREATE INDEX IF NOT EXISTS idx_risks_status ON risks(status);
CREATE INDEX IF NOT EXISTS idx_risks_created_by ON risks(created_by);
CREATE INDEX IF NOT EXISTS idx_incidents_org ON incidents(organization_id);
CREATE INDEX IF NOT EXISTS idx_mitigations_risk ON mitigations(risk_id);
CREATE INDEX IF NOT EXISTS idx_kris_risk ON kris(risk_id);
CREATE INDEX IF NOT EXISTS idx_control_tests_control ON control_tests(control_id);
CREATE INDEX IF NOT EXISTS idx_comm_logs_risk ON communication_logs(risk_id);
