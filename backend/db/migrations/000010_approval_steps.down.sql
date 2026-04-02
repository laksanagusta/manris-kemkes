DROP INDEX IF EXISTS idx_approval_steps_approver_user;
DROP INDEX IF EXISTS idx_approval_steps_request;
DROP INDEX IF EXISTS idx_approval_requests_current_approver_user;

DROP TABLE IF EXISTS approval_steps;

ALTER TABLE approval_requests
  DROP COLUMN IF EXISTS current_approver_user_id;
