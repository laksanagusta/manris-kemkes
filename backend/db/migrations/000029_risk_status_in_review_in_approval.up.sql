-- Migration: Update risk status flow to draft -> in_review -> in_approval -> approved
-- Phase 1: Drop constraint
ALTER TABLE risks DROP CONSTRAINT IF EXISTS risks_status_check;

-- Phase 2: Migrate existing data
-- reviewed -> in_approval (reviewer approved, waiting for pimpinan)
UPDATE risks SET status = 'in_approval' WHERE status = 'reviewed';

-- draft with pending approval requests -> in_review (submitted to reviewer)
UPDATE risks 
SET status = 'in_review' 
WHERE status = 'draft' 
AND id IN (
    SELECT entity_id 
    FROM approval_requests 
    WHERE request_type = 'risk' 
    AND status = 'pending'
);

-- Phase 3: Add new constraint with all valid statuses
ALTER TABLE risks ADD CONSTRAINT risks_status_check 
    CHECK (status IN ('draft', 'in_review', 'in_approval', 'approved', 'rejected'));