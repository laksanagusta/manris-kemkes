ALTER TABLE risk_monitorings ADD COLUMN observed_at date;
-- Legacy entry windows opened after the reported quarter. Preserve that report
-- period and explicitly mark the date as inferred rather than moving history.
ALTER TABLE risk_monitorings ADD COLUMN observed_at_inferred boolean NOT NULL DEFAULT false;
UPDATE risk_monitorings SET observed_at = CASE
 WHEN assessment_cycle ~ '^[0-9]{4}-Q[1-4]$' THEN
  GREATEST(make_date(LEFT(assessment_cycle,4)::int,(RIGHT(assessment_cycle,1)::int-1)*3+1,1),
   LEAST((started_at AT TIME ZONE 'Asia/Jakarta')::date,
    (make_date(LEFT(assessment_cycle,4)::int,(RIGHT(assessment_cycle,1)::int-1)*3+1,1)+interval '3 months - 1 day')::date))
 ELSE (started_at AT TIME ZONE 'Asia/Jakarta')::date END,
 observed_at_inferred=true;
ALTER TABLE risk_monitorings ALTER COLUMN observed_at SET NOT NULL;
DROP INDEX IF EXISTS uq_risk_monitorings_group_cycle_active;
DROP INDEX IF EXISTS idx_risk_monitorings_finalized_source_cycle;
-- Retain existing drafts from different quarters. New starts serialize on the risk family.
CREATE INDEX idx_risk_monitorings_open_drafts ON risk_monitorings(version_group_id, created_at DESC, id DESC) WHERE status='draft';
CREATE INDEX idx_risk_monitorings_observation ON risk_monitorings(version_group_id, observed_at DESC, finalized_at DESC, id DESC) WHERE status='final';
ALTER TABLE mitigation_tasks ADD COLUMN generated_by_monitoring_id uuid REFERENCES risk_monitorings(id) ON DELETE RESTRICT;
CREATE INDEX idx_mitigation_tasks_generated_monitoring ON mitigation_tasks(generated_by_monitoring_id) WHERE generated_by_monitoring_id IS NOT NULL;
