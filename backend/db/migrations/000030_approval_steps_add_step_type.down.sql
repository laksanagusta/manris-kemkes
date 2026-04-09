-- Rollback: Remove step_type column from approval_steps table

ALTER TABLE approval_steps
  DROP COLUMN IF EXISTS step_type;
