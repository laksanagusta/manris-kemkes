-- Retain original workflow metadata for an exact rollback of existing snapshots.
CREATE TABLE risk_charter_versioning_backup AS
SELECT id, version_group_id, previous_version_id, version_number, is_current, status
FROM risk_charters;

DROP INDEX IF EXISTS risk_charters_one_current_per_year_idx;
DROP INDEX IF EXISTS risk_charters_one_open_revision_idx;
ALTER TABLE risk_charters DROP CONSTRAINT IF EXISTS risk_charters_period_year_check;
ALTER TABLE risk_charters ALTER COLUMN period SET DEFAULT '';
ALTER TABLE risk_charters ADD CONSTRAINT risk_charters_optional_legacy_period_check
    CHECK (period = '' OR period ~ '^[0-9]{4}$');

-- Merge only former annual families. IDs, content, dates and legacy years remain intact.
WITH families AS (
    SELECT organization_id, upr_level
    FROM risk_charters GROUP BY organization_id, upr_level
    HAVING COUNT(DISTINCT version_group_id) > 1
), ranked AS (
    SELECT c.id,
        first_value(c.version_group_id) OVER history AS group_id,
        row_number() OVER history AS version,
        lag(c.id) OVER history AS previous_id,
        row_number() OVER (PARTITION BY c.organization_id, c.upr_level
            ORDER BY (c.is_current AND c.status = 'active') DESC, c.is_current DESC, c.created_at DESC, c.id DESC) AS current_rank,
        first_value(c.created_at) OVER (PARTITION BY c.organization_id, c.upr_level
            ORDER BY (c.is_current AND c.status = 'active') DESC, c.is_current DESC, c.created_at DESC, c.id DESC) AS current_created_at,
        row_number() OVER (PARTITION BY c.organization_id, c.upr_level, c.status
            ORDER BY c.created_at DESC, c.id DESC) AS status_rank
    FROM risk_charters c JOIN families f USING (organization_id, upr_level)
    WINDOW history AS (PARTITION BY c.organization_id, c.upr_level ORDER BY c.created_at, c.id)
)
UPDATE risk_charters c SET
    version_group_id = r.group_id,
    previous_version_id = r.previous_id,
    version_number = r.version,
    is_current = r.current_rank = 1,
    status = CASE
        WHEN r.current_rank > 1 AND c.status = 'active' THEN 'superseded'
        WHEN r.current_rank > 1 AND c.status = 'draft' AND (r.status_rank > 1 OR c.created_at <= r.current_created_at) THEN 'superseded'
        ELSE c.status END
FROM ranked r WHERE c.id = r.id;

CREATE UNIQUE INDEX risk_charters_one_current_per_scope_idx
    ON risk_charters (organization_id, upr_level) WHERE is_current;
CREATE UNIQUE INDEX risk_charters_one_open_revision_idx
    ON risk_charters (version_group_id) WHERE status = 'draft' AND NOT is_current;
