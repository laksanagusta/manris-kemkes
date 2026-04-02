ALTER TABLE approval_requests
  ADD COLUMN IF NOT EXISTS current_approver_user_id UUID REFERENCES users(id);

CREATE TABLE IF NOT EXISTS approval_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  approval_request_id UUID NOT NULL REFERENCES approval_requests(id) ON DELETE CASCADE,
  sequence_no INT NOT NULL,
  approver_user_id UUID NOT NULL REFERENCES users(id),
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  acted_at TIMESTAMP,
  comments TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (approval_request_id, sequence_no)
);

CREATE INDEX IF NOT EXISTS idx_approval_requests_current_approver_user ON approval_requests(current_approver_user_id);
CREATE INDEX IF NOT EXISTS idx_approval_steps_request ON approval_steps(approval_request_id);
CREATE INDEX IF NOT EXISTS idx_approval_steps_approver_user ON approval_steps(approver_user_id);
