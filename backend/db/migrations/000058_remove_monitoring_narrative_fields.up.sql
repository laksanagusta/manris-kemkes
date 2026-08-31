-- Monitoring keeps the observed score, mitigation progress, and conclusion.
-- Narrative/trend inputs were removed from the monitoring workflow and are no
-- longer part of the persisted transaction contract.
ALTER TABLE risk_monitorings
    DROP CONSTRAINT IF EXISTS risk_monitorings_trend_check,
    DROP COLUMN IF EXISTS condition_summary,
    DROP COLUMN IF EXISTS event_summary,
    DROP COLUMN IF EXISTS trend,
    DROP COLUMN IF EXISTS effectiveness_conclusion,
    DROP COLUMN IF EXISTS follow_up_note;
