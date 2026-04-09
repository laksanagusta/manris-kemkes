-- Rollback: Revert to old status flow
-- Phase 1: Drop constraint
ALTER TABLE risks DROP CONSTRAINT IF EXISTS risks_status_check;

-- Phase 2: Revert data
-- in_approval -> reviewed
UPDATE risks SET status = 'reviewed' WHERE status = 'in_approval';

-- in_review -> draft (risks submitted but not yet approved)
UPDATE risks SET status = 'draft' WHERE status = 'in_review';

-- Phase 3: Restore old constraint
ALTER TABLE risks ADD CONSTRAINT risks_status_check 
    CHECK (status IN ('draft', 'reviewed', 'approved', 'rejected'));