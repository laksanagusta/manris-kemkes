CREATE TABLE IF NOT EXISTS planning (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    period TEXT NOT NULL,
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE planning_goals
    ADD COLUMN IF NOT EXISTS planning_id UUID REFERENCES planning(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_planning_goals_planning_id ON planning_goals(planning_id);

