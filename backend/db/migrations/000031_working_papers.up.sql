-- Migration: Create working papers and signatories tables
-- Purpose: Support working paper (kertas kerja) management with sequential signing workflow

-- Create ENUM type for working paper status
CREATE TYPE working_paper_status AS ENUM ('draft', 'signing', 'completed', 'cancelled');

-- Create working_papers table
CREATE TABLE IF NOT EXISTS working_papers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(500) NOT NULL,
    description TEXT,
    org_id UUID NOT NULL REFERENCES organizations(id),
    status working_paper_status NOT NULL DEFAULT 'draft',
    assessment_cycle VARCHAR(100),
    risk_snapshots JSONB NOT NULL DEFAULT '[]'::jsonb,
    document_hash VARCHAR(64),
    current_signatory_sequence INT NOT NULL DEFAULT 0,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ
);

-- Create indexes on working_papers
CREATE INDEX IF NOT EXISTS idx_working_papers_org_id ON working_papers(org_id);
CREATE INDEX IF NOT EXISTS idx_working_papers_status ON working_papers(status);
CREATE INDEX IF NOT EXISTS idx_working_papers_created_by ON working_papers(created_by);
CREATE INDEX IF NOT EXISTS idx_working_papers_assessment_cycle ON working_papers(assessment_cycle);

-- Create working_paper_signatories table
CREATE TABLE IF NOT EXISTS working_paper_signatories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    working_paper_id UUID NOT NULL REFERENCES working_papers(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    sequence_no INT NOT NULL,
    signer_name VARCHAR(300) NOT NULL,
    signer_nip VARCHAR(50),
    signer_title VARCHAR(300),
    signer_role_label VARCHAR(200),
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    signed_at TIMESTAMPTZ,
    qr_code_png TEXT,
    qr_data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (working_paper_id, sequence_no)
);

-- Create indexes on working_paper_signatories
CREATE INDEX IF NOT EXISTS idx_working_paper_signatories_working_paper_id ON working_paper_signatories(working_paper_id);
CREATE INDEX IF NOT EXISTS idx_working_paper_signatories_user_id ON working_paper_signatories(user_id);

-- Add comments for documentation
COMMENT ON TABLE working_papers IS 'Stores working paper (kertas kerja) records with status tracking';
COMMENT ON TABLE working_paper_signatories IS 'Tracks signatories in sequential signing workflow for working papers';
COMMENT ON COLUMN working_papers.risk_snapshots IS 'Array of snapshotted risk data at working paper creation time';
COMMENT ON COLUMN working_papers.document_hash IS 'SHA-256 hash of document for integrity verification';
COMMENT ON COLUMN working_papers.current_signatory_sequence IS 'Tracks which signatory is next in the signing sequence';
COMMENT ON COLUMN working_paper_signatories.signer_role_label IS 'Display label for signature block (e.g., "Direktur Utama")';
