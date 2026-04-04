UPDATE kri_reports
SET status = 'overdue'
WHERE status = 'revision_requested';

UPDATE kri_reports
SET status = 'submitted'
WHERE status = 'accepted';

ALTER TABLE kri_reports
    DROP CONSTRAINT IF EXISTS kri_reports_status_check;

ALTER TABLE kri_reports
    ADD CONSTRAINT kri_reports_status_check
    CHECK (status IN ('pending', 'submitted', 'overdue', 'skipped'));

ALTER TABLE kri_reports
    DROP COLUMN IF EXISTS reviewed_by,
    DROP COLUMN IF EXISTS reviewed_at,
    DROP COLUMN IF EXISTS review_note,
    DROP COLUMN IF EXISTS skip_reason,
    DROP COLUMN IF EXISTS evidence_url;
