-- Meeting minutes table
CREATE TABLE IF NOT EXISTS meeting_minutes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title           TEXT NOT NULL,
    date            DATE NOT NULL,
    participants    TEXT[] DEFAULT '{}',
    agenda          TEXT[] DEFAULT '{}',
    summary         TEXT DEFAULT '',
    key_points      TEXT[] DEFAULT '{}',
    decisions       TEXT[] DEFAULT '{}',
    open_issues     TEXT[] DEFAULT '{}',
    action_items    JSONB DEFAULT '[]'::jsonb,
    next_check_in   DATE,
    transcript      TEXT DEFAULT '',
    organization_id UUID REFERENCES organizations(id),
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Junction table for many-to-many relationship
CREATE TABLE IF NOT EXISTS meeting_minutes_risks (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id      UUID NOT NULL REFERENCES meeting_minutes(id) ON DELETE CASCADE,
    risk_id         UUID NOT NULL REFERENCES risks(id) ON DELETE CASCADE,
    linked_by       UUID REFERENCES users(id),
    linked_at       TIMESTAMPTZ DEFAULT now(),
    UNIQUE(meeting_id, risk_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_meeting_minutes_org ON meeting_minutes(organization_id);
CREATE INDEX IF NOT EXISTS idx_meeting_minutes_created_by ON meeting_minutes(created_by);
CREATE INDEX IF NOT EXISTS idx_meeting_minutes_date ON meeting_minutes(date DESC);
CREATE INDEX IF NOT EXISTS idx_mm_risks_meeting ON meeting_minutes_risks(meeting_id);
CREATE INDEX IF NOT EXISTS idx_mm_risks_risk ON meeting_minutes_risks(risk_id);