ALTER TABLE risk_charters
    DROP CONSTRAINT IF EXISTS risk_charters_organization_id_period_upr_level_key,
    DROP CONSTRAINT IF EXISTS risk_charters_status_check;

ALTER TABLE risk_charters
    ADD COLUMN IF NOT EXISTS title text,
    ADD COLUMN IF NOT EXISTS legal_bases jsonb NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS stakeholders jsonb NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS version_group_id uuid,
    ADD COLUMN IF NOT EXISTS previous_version_id uuid,
    ADD COLUMN IF NOT EXISTS version_number integer NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS is_current boolean NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS revision_reason text NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS finalized_by uuid,
    ADD COLUMN IF NOT EXISTS finalized_at timestamptz;

UPDATE risk_charters
SET legal_bases = CASE
        WHEN btrim(legal_basis) = '' THEN '[]'::jsonb
        ELSE jsonb_build_array(jsonb_build_object(
            'id', gen_random_uuid()::text,
            'reference', legal_basis,
            'provision', ''
        ))
    END,
    stakeholders = CASE
        WHEN btrim(stakeholder_summary) = '' THEN '[]'::jsonb
        ELSE jsonb_build_array(jsonb_build_object(
            'id', gen_random_uuid()::text,
            'name', stakeholder_summary,
            'relationship', ''
        ))
    END
WHERE legal_bases = '[]'::jsonb
   OR stakeholders = '[]'::jsonb;

UPDATE risk_charters AS charter
SET upr_structure = COALESCE((
    SELECT jsonb_agg(
        (member || jsonb_build_object(
            'id', COALESCE(NULLIF(member->>'id', ''), gen_random_uuid()::text),
            'role', COALESCE(NULLIF(member->>'role', ''), 'member'),
            'name', COALESCE(member->>'name', ''),
            'position', COALESCE(NULLIF(member->>'position', ''), member->>'title', '')
        )) - 'title'
    )
    FROM jsonb_array_elements(charter.upr_structure) AS member
), '[]'::jsonb)
WHERE jsonb_typeof(charter.upr_structure) = 'array';

UPDATE risk_charters
SET period = CASE
        WHEN period ~ '^[0-9]{4}-(H[12]|Q[1-4])$' THEN left(period, 4)
        ELSE period
    END,
    status = CASE status
        WHEN 'approved' THEN 'active'
        WHEN 'in_review' THEN 'draft'
        ELSE status
    END,
    finalized_by = COALESCE(finalized_by, approved_by),
    finalized_at = COALESCE(finalized_at, approved_at);

WITH ranked AS (
    SELECT
        id,
        first_value(id) OVER identity_window AS group_id,
        row_number() OVER identity_window AS next_version,
        row_number() OVER (
            PARTITION BY organization_id, upr_level, period
            ORDER BY (status <> 'archived') DESC, updated_at DESC, created_at DESC, id DESC
        ) AS current_rank
    FROM risk_charters
    WINDOW identity_window AS (
        PARTITION BY organization_id, upr_level, period
        ORDER BY created_at ASC, id ASC
        ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
    )
)
UPDATE risk_charters AS charter
SET version_group_id = ranked.group_id,
    version_number = ranked.next_version,
    is_current = ranked.current_rank = 1,
    status = CASE
        WHEN ranked.current_rank > 1 AND charter.status <> 'archived' THEN 'superseded'
        ELSE charter.status
    END
FROM ranked
WHERE ranked.id = charter.id;

UPDATE risk_charters AS charter
SET title = format(
    'Piagam Penerapan Manajemen Risiko — %s — %s',
    organization.name,
    charter.period
)
FROM organizations AS organization
WHERE organization.id = charter.organization_id
  AND (charter.title IS NULL OR btrim(charter.title) = '');

UPDATE risk_charters
SET title = format('Piagam Penerapan Manajemen Risiko — %s', period)
WHERE title IS NULL OR btrim(title) = '';

ALTER TABLE risk_charters
    ALTER COLUMN title SET NOT NULL,
    ALTER COLUMN version_group_id SET NOT NULL,
    ADD CONSTRAINT risk_charters_title_length_check
        CHECK (char_length(btrim(title)) BETWEEN 1 AND 120),
    ADD CONSTRAINT risk_charters_period_year_check
        CHECK (period ~ '^[0-9]{4}$'),
    ADD CONSTRAINT risk_charters_version_number_check
        CHECK (version_number >= 1),
    ADD CONSTRAINT risk_charters_status_check
        CHECK (status = ANY (ARRAY['draft', 'active', 'superseded', 'archived'])),
    ADD CONSTRAINT risk_charters_previous_version_id_fkey
        FOREIGN KEY (previous_version_id) REFERENCES risk_charters(id),
    ADD CONSTRAINT risk_charters_finalized_by_fkey
        FOREIGN KEY (finalized_by) REFERENCES users(id);

CREATE UNIQUE INDEX IF NOT EXISTS risk_charters_one_current_per_year_idx
    ON risk_charters (organization_id, upr_level, period)
    WHERE is_current;

CREATE UNIQUE INDEX IF NOT EXISTS risk_charters_one_open_revision_idx
    ON risk_charters (version_group_id)
    WHERE status = 'draft' AND NOT is_current;

CREATE INDEX IF NOT EXISTS risk_charters_version_history_idx
    ON risk_charters (version_group_id, version_number DESC);
