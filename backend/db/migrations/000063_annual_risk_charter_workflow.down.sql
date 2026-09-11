DROP INDEX IF EXISTS risk_charters_version_history_idx;
DROP INDEX IF EXISTS risk_charters_one_open_revision_idx;
DROP INDEX IF EXISTS risk_charters_one_current_per_year_idx;

ALTER TABLE risk_charters
    DROP CONSTRAINT IF EXISTS risk_charters_finalized_by_fkey,
    DROP CONSTRAINT IF EXISTS risk_charters_previous_version_id_fkey,
    DROP CONSTRAINT IF EXISTS risk_charters_status_check,
    DROP CONSTRAINT IF EXISTS risk_charters_version_number_check,
    DROP CONSTRAINT IF EXISTS risk_charters_period_year_check,
    DROP CONSTRAINT IF EXISTS risk_charters_title_length_check;

-- The legacy schema can store only one row per organization/UPR/period.
-- Keep the latest current version when rolling back the versioned workflow.
WITH ranked AS (
    SELECT id,
        row_number() OVER (
            PARTITION BY organization_id, upr_level, period
            ORDER BY is_current DESC, version_number DESC, updated_at DESC, id DESC
        ) AS keep_rank
    FROM risk_charters
)
DELETE FROM risk_charters AS charter
USING ranked
WHERE charter.id = ranked.id
  AND ranked.keep_rank > 1;

UPDATE risk_charters
SET status = CASE status
    WHEN 'superseded' THEN 'archived'
    WHEN 'active' THEN 'approved'
    ELSE status
END;

ALTER TABLE risk_charters
    ADD CONSTRAINT risk_charters_status_check
        CHECK (status = ANY (ARRAY['draft', 'in_review', 'approved', 'archived'])),
    DROP COLUMN IF EXISTS finalized_at,
    DROP COLUMN IF EXISTS finalized_by,
    DROP COLUMN IF EXISTS revision_reason,
    DROP COLUMN IF EXISTS is_current,
    DROP COLUMN IF EXISTS version_number,
    DROP COLUMN IF EXISTS previous_version_id,
    DROP COLUMN IF EXISTS version_group_id,
    DROP COLUMN IF EXISTS stakeholders,
    DROP COLUMN IF EXISTS legal_bases,
    DROP COLUMN IF EXISTS title;

ALTER TABLE risk_charters
    ADD CONSTRAINT risk_charters_organization_id_period_upr_level_key
        UNIQUE (organization_id, period, upr_level);
