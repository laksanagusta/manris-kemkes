-- Migration: Rename risk status 'final' to 'reviewed'
-- This updates the status flow from: draft -> final -> approved
-- To: draft -> reviewed -> approved

-- Step 1: Drop the existing constraint
ALTER TABLE risks DROP CONSTRAINT IF EXISTS risks_status_check;

-- Step 2: Update existing rows from 'final' to 'reviewed'
-- IMPORTANT: Do this BEFORE adding the new constraint to avoid constraint violations
UPDATE risks SET status = 'reviewed' WHERE status = 'final';

-- Step 3: Add the new constraint with 'reviewed' instead of 'final'
ALTER TABLE risks ADD CONSTRAINT risks_status_check CHECK (status IN ('draft','reviewed','approved','rejected'));
