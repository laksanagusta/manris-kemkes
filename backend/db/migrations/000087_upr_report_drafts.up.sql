CREATE TABLE upr_report_drafts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES organizations(id),
    payload jsonb NOT NULL,
    revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
    created_by uuid NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now(),
    sent_version_id uuid REFERENCES upr_report_versions(id)
);

CREATE INDEX upr_report_open_drafts
    ON upr_report_drafts (organization_id, updated_at DESC)
    WHERE sent_version_id IS NULL;
