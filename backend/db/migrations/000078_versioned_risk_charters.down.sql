-- Annual rollback needs an explicit year for every newly created timeless record.
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM risk_charters WHERE period = '') THEN
        RAISE EXCEPTION 'Assign legacy years to timeless charters before rolling back to annual identity';
    END IF;
END $$;
DROP INDEX risk_charters_one_current_per_scope_idx;
DROP INDEX risk_charters_one_open_revision_idx;
ALTER TABLE risk_charters DROP CONSTRAINT risk_charters_optional_legacy_period_check;
ALTER TABLE risk_charters ALTER COLUMN period DROP DEFAULT;
UPDATE risk_charters c SET version_group_id = b.version_group_id,
    previous_version_id = b.previous_version_id, version_number = b.version_number,
    is_current = b.is_current, status = b.status
FROM risk_charter_versioning_backup b WHERE c.id = b.id;
ALTER TABLE risk_charters ADD CONSTRAINT risk_charters_period_year_check CHECK (period ~ '^[0-9]{4}$');
CREATE UNIQUE INDEX risk_charters_one_current_per_year_idx
    ON risk_charters (organization_id, upr_level, period) WHERE is_current;
CREATE UNIQUE INDEX risk_charters_one_open_revision_idx
    ON risk_charters (version_group_id) WHERE status = 'draft' AND NOT is_current;
DROP TABLE risk_charter_versioning_backup;
