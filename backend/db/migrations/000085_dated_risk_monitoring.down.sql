-- Refuse rollback when it would discard the multiple-observation contract.
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM risk_monitorings WHERE status IN ('draft','final') GROUP BY version_group_id,assessment_cycle HAVING COUNT(*)>1) THEN
  RAISE EXCEPTION 'Cannot roll back dated monitoring: multiple observations exist in a quarter';
 END IF;
END $$;
DROP INDEX IF EXISTS idx_risk_monitorings_open_drafts;
DROP INDEX IF EXISTS idx_risk_monitorings_observation;
ALTER TABLE mitigation_tasks DROP COLUMN generated_by_monitoring_id;
ALTER TABLE risk_monitorings DROP COLUMN observed_at;
ALTER TABLE risk_monitorings DROP COLUMN IF EXISTS observed_at_inferred;
CREATE UNIQUE INDEX uq_risk_monitorings_group_cycle_active ON risk_monitorings(version_group_id,assessment_cycle) WHERE status IN ('draft','final');
