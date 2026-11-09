-- Dropped optional values cannot be recovered by rollback.
BEGIN;
ALTER TABLE incidents
    ADD COLUMN actual_impact TEXT NOT NULL DEFAULT '',
    ADD COLUMN immediate_response TEXT NOT NULL DEFAULT '',
    ADD COLUMN post_response_condition TEXT NOT NULL DEFAULT 'unknown',
    ADD COLUMN "where" TEXT NOT NULL DEFAULT '',
    ADD COLUMN who TEXT NOT NULL DEFAULT '',
    ADD COLUMN why_how TEXT NOT NULL DEFAULT '',
    ADD COLUMN disruption_duration TEXT NOT NULL DEFAULT '',
    ADD COLUMN extraordinary_reason TEXT NOT NULL DEFAULT '',
    ADD COLUMN ongoing_action TEXT NOT NULL DEFAULT '',
    ADD COLUMN evidence_url TEXT NOT NULL DEFAULT '',
    ADD CONSTRAINT incidents_condition_check CHECK (post_response_condition IN ('recovered','controlled','ongoing','worsening','unknown'));
COMMIT;
