DROP TABLE IF EXISTS working_paper_risk_exclusions;

DROP INDEX IF EXISTS uq_working_paper_risks_group;
DROP INDEX IF EXISTS idx_working_paper_risks_monitoring;
DROP INDEX IF EXISTS idx_working_paper_risks_source_risk;

ALTER TABLE working_paper_risks
    DROP COLUMN IF EXISTS result_risk_id,
    DROP COLUMN IF EXISTS monitoring_id,
    DROP COLUMN IF EXISTS source_risk_id,
    DROP COLUMN IF EXISTS version_group_id;

DROP INDEX IF EXISTS uq_risk_monitorings_group_cycle_active;
DROP INDEX IF EXISTS idx_risk_monitorings_version_group;

ALTER TABLE risk_monitorings
    DROP COLUMN IF EXISTS version_group_id;
