DROP INDEX IF EXISTS idx_mitigation_tasks_monitoring_id;
ALTER TABLE mitigation_tasks
  DROP COLUMN IF EXISTS report_obstacle,
  DROP COLUMN IF EXISTS report_output,
  DROP COLUMN IF EXISTS monitoring_id;
