CREATE TABLE IF NOT EXISTS planning_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    period TEXT NOT NULL,
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS planning_objectives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    goal_id UUID NOT NULL REFERENCES planning_goals(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS planning_ikus (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    objective_id UUID NOT NULL REFERENCES planning_objectives(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    target TEXT NOT NULL DEFAULT '',
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS planning_programs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    iku_id UUID NOT NULL REFERENCES planning_ikus(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS planning_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    program_id UUID NOT NULL REFERENCES planning_programs(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS planning_ros (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id UUID NOT NULL REFERENCES planning_activities(id) ON DELETE CASCADE,
    period TEXT NOT NULL,
    title TEXT NOT NULL,
    scope_mode TEXT NOT NULL CHECK (scope_mode IN ('all_satker', 'satker_group', 'explicit_satker_list')),
    freeze_status TEXT NOT NULL DEFAULT 'draft' CHECK (freeze_status IN ('draft', 'active', 'frozen', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS planning_ro_scopes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ro_id UUID NOT NULL REFERENCES planning_ros(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    organization_category TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_planning_ro_scopes_unique_org
    ON planning_ro_scopes (ro_id, organization_id)
    WHERE organization_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_planning_ro_scopes_unique_category
    ON planning_ro_scopes (ro_id, organization_category)
    WHERE organization_category <> '';

CREATE INDEX IF NOT EXISTS idx_planning_goals_period ON planning_goals(period);
CREATE INDEX IF NOT EXISTS idx_planning_goals_organization ON planning_goals(organization_id);
CREATE INDEX IF NOT EXISTS idx_planning_objectives_goal ON planning_objectives(goal_id);
CREATE INDEX IF NOT EXISTS idx_planning_ikus_objective ON planning_ikus(objective_id);
CREATE INDEX IF NOT EXISTS idx_planning_programs_iku ON planning_programs(iku_id);
CREATE INDEX IF NOT EXISTS idx_planning_activities_program ON planning_activities(program_id);
CREATE INDEX IF NOT EXISTS idx_planning_ros_period ON planning_ros(period);
CREATE INDEX IF NOT EXISTS idx_planning_ro_scopes_ro_id ON planning_ro_scopes(ro_id);
