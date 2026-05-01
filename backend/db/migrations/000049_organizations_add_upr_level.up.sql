-- Add UPR level to organizations per KMK BAB II
-- Root org = kemenhari, Direktorats = upr_t1, Unit/Balai = upr_t2

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS upr_level TEXT CHECK (upr_level IN ('kementerian', 'upr_t1', 'upr_t2'));

-- Set default: try to infer from parent chain
-- Organizations with no parent_id = kemenhari (root level)
UPDATE organizations SET upr_level = 'kementerian' WHERE parent_id IS NULL;

-- Organizations directly under root = upr_t1
UPDATE organizations SET upr_level = 'upr_t1'
WHERE parent_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM organizations parent
    WHERE parent.id = organizations.parent_id
      AND parent.parent_id IS NULL
  );

-- Organizations under upr_t1 (deeper) = upr_t2
UPDATE organizations SET upr_level = 'upr_t2'
WHERE upr_level IS NULL;