-- Rollback: Rename risk status 'reviewed' back to 'final'

-- Step 1: Drop the new constraint
ALTER TABLE risks DROP CONSTRAINT IF EXISTS risks_status_check;

-- Step 2: Update existing rows from 'reviewed' back to 'final'
UPDATE risks SET status = 'final' WHERE status = 'reviewed';

-- Step 3: Add the old constraint with 'final'
ALTER TABLE risks ADD CONSTRAINT risks_status_check CHECK (status IN ('draft','final','approved','rejected'));
