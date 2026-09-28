DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM risks WHERE superseded_by_risk_id IS NOT NULL)
       OR EXISTS (SELECT 1 FROM risk_monitorings WHERE status = 'superseded' OR superseded_by_monitoring_id IS NOT NULL) THEN
        RAISE EXCEPTION 'Cannot roll back lifecycle supersession while superseded records exist';
    END IF;
END $$;

ALTER TABLE risk_monitorings
    DROP CONSTRAINT IF EXISTS risk_monitorings_status_check,
    ADD CONSTRAINT risk_monitorings_status_check
        CHECK (status IN ('draft', 'final'));

ALTER TABLE risk_monitorings DROP COLUMN superseded_by_monitoring_id;
ALTER TABLE risks DROP COLUMN superseded_by_risk_id;
