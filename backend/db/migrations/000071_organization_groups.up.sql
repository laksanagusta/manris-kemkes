CREATE TABLE IF NOT EXISTS organization_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_organization_groups_owner_name_unique
    ON organization_groups (owner_organization_id, lower(name));

CREATE INDEX IF NOT EXISTS idx_organization_groups_owner
    ON organization_groups (owner_organization_id);

CREATE TABLE IF NOT EXISTS organization_group_members (
    group_id UUID NOT NULL REFERENCES organization_groups(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (group_id, organization_id)
);

CREATE INDEX IF NOT EXISTS idx_organization_group_members_organization
    ON organization_group_members (organization_id);
