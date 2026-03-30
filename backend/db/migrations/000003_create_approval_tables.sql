-- Migration: Create approval workflow tables
-- Created: 2025-03-12

-- Approval requests table
CREATE TABLE IF NOT EXISTS approval_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_type VARCHAR(50) NOT NULL, -- 'risk' or 'incident'
    entity_id UUID NOT NULL, -- Reference to risk_id or incident_id
    requested_by UUID NOT NULL REFERENCES users(id),
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    current_status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    current_approver_role VARCHAR(50) NOT NULL, -- 'reviewer' or 'pimpinan'
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Approval history table (audit trail)
CREATE TABLE IF NOT EXISTS approval_histories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    approval_request_id UUID NOT NULL REFERENCES approval_requests(id) ON DELETE CASCADE,
    action VARCHAR(20) NOT NULL, -- 'submitted', 'approved', 'rejected', 'returned'
    actor_id UUID NOT NULL REFERENCES users(id),
    actor_name VARCHAR(255) NOT NULL,
    actor_role VARCHAR(50) NOT NULL,
    comments TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_approval_requests_entity ON approval_requests(entity_id);
CREATE INDEX idx_approval_requests_status ON approval_requests(current_status);
CREATE INDEX idx_approval_requests_approver ON approval_requests(current_approver_role);
CREATE INDEX idx_approval_requests_requested_by ON approval_requests(requested_by);
CREATE INDEX idx_approval_histories_request ON approval_histories(approval_request_id);

-- Comments
COMMENT ON TABLE approval_requests IS 'Stores approval requests for risks and incidents';
COMMENT ON TABLE approval_histories IS 'Audit trail for approval workflow';
COMMENT ON COLUMN approval_requests.request_type IS 'Type of entity being approved: risk or incident';
COMMENT ON COLUMN approval_requests.current_status IS 'Current approval status: pending, approved, rejected';
COMMENT ON COLUMN approval_requests.current_approver_role IS 'Role that needs to approve: reviewer or pimpinan';
