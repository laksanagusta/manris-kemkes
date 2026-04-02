-- Add index for parent_id lookups (GetDescendants recursive CTE)
CREATE INDEX IF NOT EXISTS idx_organizations_parent_id ON organizations(parent_id);