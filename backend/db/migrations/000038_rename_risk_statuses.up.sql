-- Migration: Rename risk statuses to 3-status model
-- draft -> assessment_draft
-- in_review -> assessment_in_review
-- in_approval -> assessment_in_review
-- rejected -> assessment_draft
-- approved -> approved (unchanged)

-- Phase 1: Drop constraint
ALTER TABLE risks DROP CONSTRAINT IF EXISTS risks_status_check;

-- Phase 2: Migrate existing data
-- Map rejected -> assessment_draft
UPDATE risks SET status = 'assessment_draft' WHERE status = 'rejected';

-- Map in_approval -> assessment_in_review
UPDATE risks SET status = 'assessment_in_review' WHERE status = 'in_approval';

-- Map in_review -> assessment_in_review
UPDATE risks SET status = 'assessment_in_review' WHERE status = 'in_review';

-- Map draft -> assessment_draft
UPDATE risks SET status = 'assessment_draft' WHERE status = 'draft';

-- approved stays as-is (no update needed)

-- Phase 3: Add new constraint with only 3 valid statuses
ALTER TABLE risks ADD CONSTRAINT risks_status_check 
    CHECK (status IN ('assessment_draft', 'assessment_in_review', 'approved'));
