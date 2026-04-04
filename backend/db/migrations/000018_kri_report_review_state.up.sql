UPDATE kri_reports
SET status = 'pending'
WHERE status = 'overdue';

ALTER TABLE kri_reports
    ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS review_note TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS skip_reason TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS evidence_url TEXT;

ALTER TABLE kri_reports
    DROP CONSTRAINT IF EXISTS kri_reports_status_check;

ALTER TABLE kri_reports
    ADD CONSTRAINT kri_reports_status_check
    CHECK (status IN ('pending', 'submitted', 'accepted', 'revision_requested', 'skipped'));
