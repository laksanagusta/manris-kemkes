-- Compatibility rollback for environments that explicitly roll back the
-- field-removal migration. Historical values cannot be reconstructed after
-- the forward migration has been committed.
ALTER TABLE risk_monitorings
    ADD COLUMN IF NOT EXISTS mitigation_obstacles TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS mitigation_follow_up TEXT NOT NULL DEFAULT '';
