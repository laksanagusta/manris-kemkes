-- Rollback: Revert risk statuses to 5-status model
-- assessment_draft -> draft (prefer draft over rejected as we can't know which it was)
-- assessment_in_review -> in_review (prefer in_review over in_approval as we can't know which it was)
-- approved -> approved (unchanged)

-- Phase 1: Drop constraint
ALTER TABLE risks DROP CONSTRAINT IF EXISTS risks_status_check;

-- Phase 2: Revert data
-- Map assessment_in_review -> in_review (can't know if it was in_review or in_approval originally)
UPDATE risks SET status = 'in_review' WHERE status = 'assessment_in_review';

-- Map assessment_draft -> draft (can't know if it was draft or rejected originally)
UPDATE risks SET status = 'draft' WHERE status = 'assessment_draft';

-- approved stays as-is

-- Phase 3: Restore old constraint with 5 valid statuses
ALTER TABLE risks ADD CONSTRAINT risks_status_check 
    CHECK (status IN ('draft', 'in_review', 'in_approval', 'approved', 'rejected'));
