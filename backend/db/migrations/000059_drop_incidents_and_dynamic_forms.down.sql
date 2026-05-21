-- Recreate incidents module tables
CREATE TABLE IF NOT EXISTS incidents (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code                TEXT,
    title               TEXT NOT NULL,
    what                TEXT DEFAULT '',
    who                 TEXT DEFAULT '',
    "when"              TIMESTAMPTZ,
    "where"             TEXT DEFAULT '',
    why_how             TEXT DEFAULT '',
    severity            TEXT DEFAULT 'minor' CHECK (severity IN ('insignificant','minor','major','critical')),
    status              TEXT DEFAULT 'open' CHECK (status IN ('draft','final','approved','rejected','open','investigating','resolved','closed')),
    corrective_action   TEXT DEFAULT '',
    preventive_action   TEXT DEFAULT '',
    linked_risk_id      UUID REFERENCES risks(id),
    reporter_id         UUID REFERENCES users(id),
    organization_id     UUID REFERENCES organizations(id),
    created_at          TIMESTAMPTZ DEFAULT now(),
    updated_at          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_incidents_org ON incidents(organization_id);

CREATE TABLE IF NOT EXISTS incident_risk_links (
    incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    risk_id     UUID NOT NULL REFERENCES risks(id) ON DELETE CASCADE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (incident_id, risk_id)
);

CREATE INDEX IF NOT EXISTS idx_incident_risk_links_risk_id
    ON incident_risk_links (risk_id);

-- Recreate dynamic forms module tables
CREATE TABLE IF NOT EXISTS forms (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    status          VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','closed')),
    target_audience VARCHAR(20) NOT NULL DEFAULT 'all' CHECK (target_audience IN ('all','specific')),
    created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS form_sections (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id     UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
    title       VARCHAR(255) NOT NULL,
    description TEXT,
    position    INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS form_fields (
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_id               UUID NOT NULL REFERENCES form_sections(id) ON DELETE CASCADE,
    form_id                  UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
    field_type               VARCHAR(20) NOT NULL CHECK (field_type IN ('text','textarea','radio','checkbox','dropdown')),
    field_key                VARCHAR(100) NOT NULL,
    label                    TEXT NOT NULL,
    placeholder              TEXT,
    is_required              BOOLEAN NOT NULL DEFAULT false,
    options                  JSONB NOT NULL DEFAULT '[]'::jsonb,
    position                 INTEGER NOT NULL DEFAULT 0,
    condition_source_field_id UUID REFERENCES form_fields(id) ON DELETE SET NULL,
    condition_value          TEXT,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS form_responses (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id         UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
    respondent_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    answers         JSONB NOT NULL DEFAULT '{}'::jsonb,
    submitted_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (form_id, respondent_id)
);

CREATE TABLE IF NOT EXISTS form_assignments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id         UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (form_id, organization_id)
);

CREATE INDEX IF NOT EXISTS idx_form_sections_form_id ON form_sections(form_id);
CREATE INDEX IF NOT EXISTS idx_form_fields_section_id ON form_fields(section_id);
CREATE INDEX IF NOT EXISTS idx_form_fields_form_id ON form_fields(form_id);
CREATE INDEX IF NOT EXISTS idx_form_responses_form_id ON form_responses(form_id);
CREATE INDEX IF NOT EXISTS idx_form_responses_answers ON form_responses USING GIN(answers jsonb_path_ops);
CREATE INDEX IF NOT EXISTS idx_form_assignments_form_id ON form_assignments(form_id);
CREATE INDEX IF NOT EXISTS idx_form_assignments_org_id ON form_assignments(organization_id);
