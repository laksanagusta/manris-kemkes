-- Migration: Add step_type column to approval_steps table
-- This separates review steps from approval steps explicitly

-- Add the step_type column with default 'approval' for backward compatibility
ALTER TABLE approval_steps
  ADD COLUMN IF NOT EXISTS step_type VARCHAR(20) NOT NULL DEFAULT 'approval';

-- Add comment to document valid values
COMMENT ON COLUMN approval_steps.step_type IS 'Type of approval step: review (for reviewer stage) or approval (for pimpinan approval stage)';

-- Backfill existing rows: determine step_type based on approver role from users table
-- Reviewers with role='reviewer' should be marked as 'review' type
UPDATE approval_steps s
SET step_type = 'review'
FROM users u
WHERE s.approver_user_id = u.id
  AND u.role = 'reviewer';

-- Verify the migration
-- SELECT step_type, COUNT(*) FROM approval_steps GROUP BY step_type;
